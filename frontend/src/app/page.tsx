"use client"

import { useState } from "react"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { parseEther, formatEther } from "viem"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { waitForTransactionReceipt } from "wagmi/actions"

import { config, stakingPoolContract, mockTokenContract } from "@/lib/wagmi"
import { useApiQuery, queryClient } from "@/hooks/use-api"
import { useTxModalStore } from "@/stores/tx-store"
import { useMounted } from "@/hooks/use-mounted"

import { AnimatedCard } from "@/components/animated-card"
import { GradientButton } from "@/components/gradient-button"
import { TxModal } from "@/components/tx-modal"
import { TransactionHistory } from "@/components/TransactionHistory"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Wallet, Gift, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Helper: wait for on-chain confirmation then invalidate cache       */
/* ------------------------------------------------------------------ */

/**
 * Waits for a transaction to be mined, then updates the modal and
 * refreshes all dashboard data so the UI reflects the new on-chain
 * state without requiring a page reload.
 *
 * WHY WE NEED THIS:
 * `useWriteContract`'s `onSuccess` fires as soon as the user signs
 * (generating a hash), but the transaction is NOT yet confirmed.
 * We must explicitly wait for the receipt before we can safely
 * refresh data from the backend — otherwise the indexer might not
 * have picked up the new event yet.
 */
function waitForConfirmation(hash: `0x${string}`, successMessage: string) {
  const { setTx } = useTxModalStore.getState()

  waitForTransactionReceipt(config, { hash })
    .then(() => {
      setTx(hash, "success")
      toast.success(successMessage)

      // Give the backend indexer ~1.5s to pick up the event, then refresh.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["stats"] })
        queryClient.invalidateQueries({ queryKey: ["history"] })
      }, 1500)
    })
    .catch(() => {
      setTx(hash, "error")
      toast.error("Transaction failed on-chain")
    })
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <TxModal />

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
          Dashboard
        </h1>
        <p className="text-slate-400 max-w-xl">
          Stake your tokens, earn rewards, and track your DeFi portfolio in real-time.
        </p>
      </motion.div>

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
/*  Stats Cards                                                       */
/* ------------------------------------------------------------------ */

function StatsSection() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()

  const { data: stats, isLoading: statsLoading } = useApiQuery<{ tvl: string }>(
    ["stats"],
    "/api/stats"
  )

  const { data: stakedBalance, isLoading: stakedLoading } = useReadContract({
    ...stakingPoolContract,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  const { data: pendingRewards, isLoading: rewardsLoading } = useReadContract({
    ...stakingPoolContract,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  const items = [
    {
      title: "Total Value Locked",
      value: stats?.tvl ? `$${Number(stats.tvl).toLocaleString()}` : "—",
      description: "Protocol-wide staked value",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
      isLoading: statsLoading,
    },
    {
      title: "Your Stake",
      value: mounted && isConnected
        ? stakedBalance !== undefined && stakedBalance !== null
          ? `${formatEther(stakedBalance as bigint)}`
          : "0"
        : "—",
      description: "Tokens you have deposited",
      icon: Wallet,
      color: "from-cyan-500 to-blue-500",
      isLoading: !mounted || stakedLoading,
    },
    {
      title: "Pending Rewards",
      value: mounted && isConnected
        ? pendingRewards !== undefined && pendingRewards !== null
          ? `${formatEther(pendingRewards as bigint)}`
          : "0"
        : "—",
      description: "Rewards accrued this period",
      icon: Gift,
      color: "from-violet-500 to-purple-500",
      isLoading: !mounted || rewardsLoading,
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <StatCard key={item.title} {...item} delay={i * 0.1} />
      ))}
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  isLoading,
  delay = 0,
}: {
  title: string
  value: string
  description: string
  icon: React.ElementType
  color: string
  isLoading: boolean
  delay?: number
}) {
  return (
    <AnimatedCard delay={delay}>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-8 w-24 bg-slate-800" />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-3xl font-bold text-slate-100"
            >
              {value}
            </motion.div>
          )}
          <p className="text-sm font-medium text-slate-400 mt-1">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </AnimatedCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Stake Form                                                        */
/* ------------------------------------------------------------------ */

function StakeForm() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()
  const { open } = useTxModalStore()
  const [amount, setAmount] = useState("")

  const { writeContract: writeApprove, isPending: isApprovePending } =
    useWriteContract()

  const { writeContract: writeStake, isPending: isStakePending } =
    useWriteContract()

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

  function handleApprove() {
    if (!amount || parsedAmount <= 0n) return
    open("Approving Tokens", `Granting the staking pool permission to spend ${amount} TOKEN.`)

    writeApprove(
      { ...mockTokenContract, functionName: "approve", args: [stakingPoolContract.address, parsedAmount] },
      {
        onSuccess: (hash) => {
          toast.success("Approval submitted")
          waitForConfirmation(hash, "Approval confirmed on-chain")
        },
        onError: (err) => {
          toast.error("Approval failed", { description: getErrorMessage(err) })
        },
      }
    )
  }

  function handleStake() {
    if (!amount || parsedAmount <= 0n) return
    open("Staking Tokens", `Depositing ${amount} TOKEN into the staking pool.`)

    writeStake(
      { ...stakingPoolContract, functionName: "stake", args: [parsedAmount] },
      {
        onSuccess: (hash) => {
          setAmount("")
          refetchAllowance()
          toast.success("Stake submitted", { description: `${amount} TOKEN deposited` })
          waitForConfirmation(hash, "Stake confirmed on-chain")
        },
        onError: (err) => {
          toast.error("Stake failed", { description: getErrorMessage(err) })
        },
      }
    )
  }

  return (
    <AnimatedCard delay={0.3}>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <ArrowUpRight className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Stake Tokens</h3>
            <p className="text-xs text-slate-500">Deposit to start earning rewards</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stake-amount" className="text-slate-400 text-sm">
            Amount
          </Label>
          <Input
            id="stake-amount"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!mounted || !isConnected || isApprovePending || isStakePending}
            className="bg-slate-950/50 border-slate-700/50 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 h-11"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <GradientButton
            variant="secondary"
            className="flex-1"
            disabled={!mounted || !isConnected || !amount || parsedAmount <= 0n || isApprovePending || isStakePending || hasAllowance}
            onClick={handleApprove}
            loading={isApprovePending}
          >
            Approve
          </GradientButton>
          <GradientButton
            className="flex-1"
            disabled={!mounted || !isConnected || !amount || parsedAmount <= 0n || isApprovePending || isStakePending || !hasAllowance}
            onClick={handleStake}
            loading={isStakePending}
          >
            Stake
          </GradientButton>
        </div>

        {mounted && !isConnected && (
          <p className="text-xs text-slate-500">Connect your wallet to stake tokens.</p>
        )}

        {mounted && isConnected && hasAllowance && amount && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-emerald-400 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Allowance confirmed. You can now stake.
          </motion.p>
        )}
      </div>
    </AnimatedCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Unstake & Claim                                                   */
/* ------------------------------------------------------------------ */

function UnstakeClaimSection() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()
  const { open } = useTxModalStore()
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const { writeContract: writeWithdraw, isPending: isWithdrawPending } =
    useWriteContract()

  const { writeContract: writeClaim, isPending: isClaimPending } =
    useWriteContract()

  const { data: stakedBalance } = useReadContract({
    ...stakingPoolContract,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  })

  function handleWithdraw() {
    if (!withdrawAmount) return
    const parsed = parseEther(withdrawAmount)
    if (parsed <= 0n) return

    open("Withdrawing Tokens", `Removing ${withdrawAmount} TOKEN from the staking pool.`)

    writeWithdraw(
      { ...stakingPoolContract, functionName: "withdraw", args: [parsed] },
      {
        onSuccess: (hash) => {
          setWithdrawAmount("")
          toast.success("Withdraw submitted", { description: `${withdrawAmount} TOKEN returned` })
          waitForConfirmation(hash, "Withdraw confirmed on-chain")
        },
        onError: (err) => {
          toast.error("Withdraw failed", { description: getErrorMessage(err) })
        },
      }
    )
  }

  function handleClaim() {
    open("Claiming Rewards", "Withdrawing your accrued staking rewards.")

    writeClaim(
      { ...stakingPoolContract, functionName: "claimReward" },
      {
        onSuccess: (hash) => {
          toast.success("Claim submitted", { description: "Rewards sent to your wallet" })
          waitForConfirmation(hash, "Rewards claimed successfully")
        },
        onError: (err) => {
          toast.error("Claim failed", { description: getErrorMessage(err) })
        },
      }
    )
  }

  const parsedWithdraw = withdrawAmount ? parseEther(withdrawAmount) : 0n
  const canWithdraw =
    stakedBalance !== undefined && stakedBalance !== null && parsedWithdraw > 0n && parsedWithdraw <= (stakedBalance as bigint)

  return (
    <AnimatedCard delay={0.4}>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <ArrowDownRight className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Manage Position</h3>
            <p className="text-xs text-slate-500">Withdraw or claim rewards</p>
          </div>
        </div>

        {/* Withdraw */}
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount" className="text-slate-400 text-sm">
            Withdraw Amount
          </Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={!mounted || !isConnected || isWithdrawPending}
              className="bg-slate-950/50 border-slate-700/50 text-slate-100 placeholder:text-slate-600 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 h-11 flex-1"
            />
            <GradientButton
              variant="secondary"
              disabled={!mounted || !isConnected || !canWithdraw || isWithdrawPending}
              onClick={handleWithdraw}
              loading={isWithdrawPending}
              className="sm:w-auto w-full"
            >
              Withdraw
            </GradientButton>
          </div>
          {mounted && isConnected && stakedBalance !== undefined && (
            <p className="text-xs text-slate-500">
              Staked: {formatEther(stakedBalance as bigint)} TOKEN
            </p>
          )}
        </div>

        <div className="h-px bg-slate-800" />

        {/* Claim */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Claim Rewards</p>
            <p className="text-xs text-slate-500">Withdraw all accrued rewards</p>
          </div>
          <GradientButton
            disabled={!mounted || !isConnected || isClaimPending}
            onClick={handleClaim}
            loading={isClaimPending}
            className="sm:w-auto w-full"
          >
            Claim Rewards
          </GradientButton>
        </div>
      </div>
    </AnimatedCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Error helper                                                      */
/* ------------------------------------------------------------------ */

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
