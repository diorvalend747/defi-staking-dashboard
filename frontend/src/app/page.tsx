"use client"

import { useState } from "react"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { parseEther, formatEther } from "viem"

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
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <TxModal />
      <StatsSection />
      <div className="grid gap-6 lg:grid-cols-2">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Value Locked"
        value={stats?.tvl ? `$${Number(stats.tvl).toLocaleString()}` : "—"}
        description="Protocol-wide staked value"
        isLoading={statsLoading}
      />
      <StatCard
        title="Your Staked Amount"
        value={
          isConnected
            ? stakedBalance !== undefined && stakedBalance !== null
              ? `${formatEther(stakedBalance as bigint)} TOKEN`
              : "0 TOKEN"
            : "Connect wallet"
        }
        description="Tokens you have deposited"
        isLoading={stakedLoading}
      />
      <StatCard
        title="Pending Rewards"
        value={
          isConnected
            ? pendingRewards !== undefined && pendingRewards !== null
              ? `${formatEther(pendingRewards as bigint)} TOKEN`
              : "0 TOKEN"
            : "Connect wallet"
        }
        description="Rewards accrued this period"
        isLoading={rewardsLoading}
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
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Approve failed:", err)
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
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Stake failed:", err)
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
            disabled={!isConnected || isApprovePending || isStakePending}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={
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

        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Connect your wallet to stake tokens.
          </p>
        )}

        {isConnected && hasAllowance && amount && (
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
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Withdraw failed:", err)
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
        },
        onError: (err) => {
          setTx(null, "error")
          console.error("Claim failed:", err)
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
          <div className="flex gap-3">
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={!isConnected || isWithdrawPending}
            />
            <Button
              variant="outline"
              disabled={!isConnected || !canWithdraw || isWithdrawPending}
              onClick={handleWithdraw}
            >
              {isWithdrawPending ? "Withdrawing…" : "Withdraw"}
            </Button>
          </div>
          {isConnected && stakedBalance !== undefined && (
            <p className="text-xs text-muted-foreground">
              Staked balance: {formatEther(stakedBalance as bigint)} TOKEN
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Claim Rewards */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Claim Rewards</p>
            <p className="text-xs text-muted-foreground">
              Withdraw all accrued rewards to your wallet.
            </p>
          </div>
          <Button
            disabled={!isConnected || isClaimPending}
            onClick={handleClaim}
          >
            {isClaimPending ? "Claiming…" : "Claim Rewards"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
