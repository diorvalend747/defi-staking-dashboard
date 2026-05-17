"use client"

import { useState } from "react"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { parseEther, formatEther } from "viem"
import { toast } from "sonner"
import { useMounted } from "@/hooks/use-mounted"

import { stakingPoolContract, mockTokenContract } from "@/lib/wagmi"
import { useApiQuery } from "@/hooks/use-api"
import { useTxModalStore } from "@/stores/tx-store"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { TxModal } from "@/components/tx-modal"
import { TransactionHistory } from "@/components/TransactionHistory"

/**
 * Dashboard landing page for the DeFi staking application.
 *
 * Displays protocol stats, the user's staking position, and forms for
 * staking, withdrawing, and claiming rewards. All smart-contract
 * interactions are powered by wagmi hooks.
 *
 * RESPONSIVE DESIGN NOTES:
 * - Stats cards stack 1-col on mobile, 2-col on tablet, 3-col on desktop.
 * - Stake / Manage forms stack vertically on mobile, side-by-side on desktop.
 * - Button groups switch from horizontal to vertical on small screens.
 * - All inputs use full-width containers with appropriate touch targets.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <TxModal />
      <StatsSection />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <StakeForm />
        <UnstakeClaimSection />
      </div>
      <TransactionHistory />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stats Cards                                                        */
/* ------------------------------------------------------------------ */

function StatsSection() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()

  // Fetch TVL from the backend API.
  const {
    data: stats,
    isLoading: statsLoading,
  } = useApiQuery<{ tvl: string }>(["stats"], "/api/stats")

  // Read the user's staked balance from the StakingPool contract.
  const {
    data: stakedBalance,
    isLoading: stakedLoading,
  } = useReadContract({
    ...stakingPoolContract,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  // Read the user's pending rewards from the StakingPool contract.
  const {
    data: pendingRewards,
    isLoading: rewardsLoading,
  } = useReadContract({
    ...stakingPoolContract,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Value Locked"
        value={stats?.tvl ? `$${Number(stats.tvl).toLocaleString()}` : "—"}
        description="Protocol-wide staked value"
        isLoading={statsLoading}
      />
      <StatCard
        title="Your Staked Amount"
        value={
          !mounted
            ? ""
            : isConnected
              ? stakedBalance !== undefined && stakedBalance !== null
                ? `${formatEther(stakedBalance as bigint)} TOKEN`
                : "0 TOKEN"
              : "Connect wallet"
        }
        description="Tokens you have deposited"
        isLoading={!mounted || stakedLoading}
      />
      <StatCard
        title="Pending Rewards"
        value={
          !mounted
            ? ""
            : isConnected
              ? pendingRewards !== undefined && pendingRewards !== null
                ? `${formatEther(pendingRewards as bigint)} TOKEN`
                : "0 TOKEN"
              : "Connect wallet"
        }
        description="Rewards accrued this period"
        isLoading={!mounted || rewardsLoading}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  isLoading,
}: {
  title: string
  value: string
  description: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Stake Form                                                         */
/* ------------------------------------------------------------------ */

function StakeForm() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()
  const { open, setTx } = useTxModalStore()
  const [amount, setAmount] = useState("")

  const { writeContract: writeApprove, isPending: isApprovePending } =
    useWriteContract()

  const { writeContract: writeStake, isPending: isStakePending } =
    useWriteContract()

  // Check the token allowance the user has granted to the staking pool.
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...mockTokenContract,
    functionName: "allowance",
    args: address && stakingPoolContract.address
      ? [address, stakingPoolContract.address]
      : undefined,
    query: { enabled: isConnected && !!address },
  })

  const parsedAmount = amount ? parseEther(amount) : 0n
  const hasAllowance =
    allowance !== undefined && allowance !== null && (allowance as bigint) >= parsedAmount && parsedAmount > 0n

  /**
   * Approve the StakingPool contract to spend the user's MockTokens.
   *
   * WHY APPROVAL IS REQUIRED (Two-Step Security Pattern):
   *
   * ERC-20 tokens follow a strict security model: a contract cannot simply
   * pull tokens out of your wallet. You must first explicitly "approve"
   * (authorize) a spender — in this case the StakingPool contract — to
   * transfer a specific amount of tokens on your behalf.
   *
   * This two-step flow (approve → stake) prevents malicious contracts from
   * draining your balance without consent. It is the standard pattern used
   * by every major DeFi protocol (Uniswap, Aave, Compound, etc.).
   *
   * Step 1: MockToken.approve(StakingPool.address, amount)
   * Step 2: StakingPool.stake(amount)  ← internally calls transferFrom
   */
  async function handleApprove() {
    if (!amount || parsedAmount <= 0n) return
    open("Approving Tokens", `Granting the staking pool permission to spend ${amount} TOKEN.`)

    writeApprove(
      {
        ...mockTokenContract,
        functionName: "approve",
        args: [stakingPoolContract.address, parsedAmount],
      },
      {
        onSuccess: (hash) => {
          setTx(hash, "pending")
          toast.success("Approval submitted", {
            description: "Your approval transaction is being confirmed on-chain.",
          })
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Approve failed:", err)
          toast.error("Approval failed", {
            description: getErrorMessage(err),
          })
        },
      }
    )
  }

  async function handleStake() {
    if (!amount || parsedAmount <= 0n) return
    open("Staking Tokens", `Depositing ${amount} TOKEN into the staking pool.`)

    writeStake(
      {
        ...stakingPoolContract,
        functionName: "stake",
        args: [parsedAmount],
      },
      {
        onSuccess: (hash) => {
          setTx(hash, "pending")
          setAmount("")
          refetchAllowance()
          toast.success("Stake submitted", {
            description: `${amount} TOKEN is being deposited into the pool.`,
          })
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Stake failed:", err)
          toast.error("Stake failed", {
            description: getErrorMessage(err),
          })
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake Tokens</CardTitle>
        <CardDescription>
          Deposit tokens into the pool to start earning rewards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stake-amount">Amount</Label>
          <Input
            id="stake-amount"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!mounted || !isConnected || isApprovePending || isStakePending}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={
              !mounted ||
              !isConnected ||
              !amount ||
              parsedAmount <= 0n ||
              isApprovePending ||
              isStakePending ||
              hasAllowance
            }
            onClick={handleApprove}
          >
            {isApprovePending ? "Approving…" : "Approve"}
          </Button>

          <Button
            className="flex-1"
            disabled={
              !mounted ||
              !isConnected ||
              !amount ||
              parsedAmount <= 0n ||
              isApprovePending ||
              isStakePending ||
              !hasAllowance
            }
            onClick={handleStake}
          >
            {isStakePending ? "Staking…" : "Stake"}
          </Button>
        </div>

        {mounted && !isConnected && (
          <p className="text-xs text-muted-foreground">
            Connect your wallet to stake tokens.
          </p>
        )}

        {mounted && isConnected && hasAllowance && amount && (
          <p className="text-xs text-green-600">
            Allowance confirmed. You can now stake.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Unstake & Claim                                                    */
/* ------------------------------------------------------------------ */

function UnstakeClaimSection() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()
  const { open, setTx } = useTxModalStore()
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const { writeContract: writeWithdraw, isPending: isWithdrawPending } =
    useWriteContract()

  const { writeContract: writeClaim, isPending: isClaimPending } =
    useWriteContract()

  // Read the user's staked balance to validate withdrawal amount.
  const { data: stakedBalance } = useReadContract({
    ...stakingPoolContract,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  async function handleWithdraw() {
    if (!withdrawAmount) return
    const parsed = parseEther(withdrawAmount)
    if (parsed <= 0n) return

    open("Withdrawing Tokens", `Removing ${withdrawAmount} TOKEN from the staking pool.`)

    writeWithdraw(
      {
        ...stakingPoolContract,
        functionName: "withdraw",
        args: [parsed],
      },
      {
        onSuccess: (hash) => {
          setTx(hash, "pending")
          setWithdrawAmount("")
          toast.success("Withdraw submitted", {
            description: `${withdrawAmount} TOKEN is being returned to your wallet.`,
          })
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Withdraw failed:", err)
          toast.error("Withdraw failed", {
            description: getErrorMessage(err),
          })
        },
      }
    )
  }

  async function handleClaim() {
    open("Claiming Rewards", "Withdrawing your accrued staking rewards.")

    writeClaim(
      {
        ...stakingPoolContract,
        functionName: "claimReward",
      },
      {
        onSuccess: (hash) => {
          setTx(hash, "pending")
          toast.success("Claim submitted", {
            description: "Your rewards are being sent to your wallet.",
          })
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Claim failed:", err)
          toast.error("Claim failed", {
            description: getErrorMessage(err),
          })
        },
      }
    )
  }

  const parsedWithdraw = withdrawAmount ? parseEther(withdrawAmount) : 0n
  const canWithdraw =
    stakedBalance !== undefined && stakedBalance !== null && parsedWithdraw > 0n && parsedWithdraw <= (stakedBalance as bigint)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Position</CardTitle>
        <CardDescription>
          Withdraw staked tokens or claim your earned rewards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Withdraw */}
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">Withdraw Amount</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={!mounted || !isConnected || isWithdrawPending}
              className="flex-1"
            />
            <Button
              variant="outline"
              disabled={!mounted || !isConnected || !canWithdraw || isWithdrawPending}
              onClick={handleWithdraw}
              className="sm:w-auto w-full"
            >
              {isWithdrawPending ? "Withdrawing…" : "Withdraw"}
            </Button>
          </div>
          {mounted && isConnected && stakedBalance !== undefined && (
            <p className="text-xs text-muted-foreground">
              Staked balance: {formatEther(stakedBalance as bigint)} TOKEN
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Claim Rewards */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Claim Rewards</p>
            <p className="text-xs text-muted-foreground">
              Withdraw all accrued rewards to your wallet.
            </p>
          </div>
          <Button
            disabled={!mounted || !isConnected || isClaimPending}
            onClick={handleClaim}
            className="sm:w-auto w-full"
          >
            {isClaimPending ? "Claiming…" : "Claim Rewards"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Error helper                                                       */
/* ------------------------------------------------------------------ */

/**
 * Extract a human-readable message from a wagmi/viem error object.
 *
 * WHY WEB3 TRANSACTIONS CAN FAIL EVEN WHEN CODE IS CORRECT:
 *
 * 1. User rejection — The user clicks "Reject" in MetaMask. This is the
 *    most common cause and is completely normal UX, not a bug.
 *
 * 2. Out of gas — The user doesn't have enough ETH (native token) to pay
 *    for the transaction's computational cost. Even failed transactions
 *    consume gas, so the wallet may refuse to broadcast.
 *
 * 3. Network congestion — During high traffic, gas prices spike. If the
 *    user's max fee is too low, validators ignore the transaction.
 *
 * 4. Nonce mismatch — If the user submits txs from multiple tabs/devices,
 *    the transaction sequence number gets out of sync and nodes reject it.
 *
 * 5. Contract revert — The smart contract itself throws (e.g. withdrawing
 *    more than staked). This is expected contract behaviour, not a bug.
 *
 * Because any of these can happen at any time, every write call must
 * gracefully handle failures and show actionable feedback.
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes("User rejected") || msg.includes("rejected")) {
      return "You rejected the transaction in your wallet."
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient ETH for gas fees. Add Base Sepolia ETH to your wallet."
    }
    if (msg.includes("nonce")) {
      return "Transaction nonce mismatch. Try refreshing the page."
    }
    if (msg.includes("revert") || msg.includes("execution reverted")) {
      return "The contract rejected this transaction. Check your input and try again."
    }
    return msg
  }
  return "An unexpected error occurred. Please try again."
}
