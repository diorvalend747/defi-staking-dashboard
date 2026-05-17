"use client"

import { useCallback } from "react"
import { useReadContract, useWriteContract } from "wagmi"
import { parseEther, formatEther } from "viem"

import { config, stakingPoolContract, mockTokenContract } from "@/lib/wagmi"
import { queryClient } from "./use-api"

/**
 * Custom staking hooks that wrap wagmi read/write operations.
 *
 * These hooks abstract away contract details so that UI components can
 * stake, withdraw, and claim rewards without knowing ABI internals.
 * Every successful mutation invalidates the dashboard query cache so
 * that stats cards (TVL, staked balance, pending rewards) refresh
 * automatically.
 */

/* ------------------------------------------------------------------ */
/*  Helper: invalidate dashboard queries                               */
/* ------------------------------------------------------------------ */

function invalidateDashboard() {
  // Force TanStack Query to refetch the stats and history data that
  // the dashboard displays, so the UI stays in sync with the chain.
  queryClient.invalidateQueries({ queryKey: ["stats"] })
  queryClient.invalidateQueries({ queryKey: ["history"] })
  queryClient.invalidateQueries({ queryKey: ["contracts"] })
}

/* ------------------------------------------------------------------ */
/*  usePendingRewards                                                  */
/* ------------------------------------------------------------------ */

/**
 * Read hook that returns the pending rewards for a given wallet address.
 *
 * This is a view function: it does not cost gas because it only reads
 * from the blockchain state rather than modifying it.
 *
 * @param address - The wallet address to check rewards for.
 * @returns The pending reward amount (in wei) and loading state.
 */
export function usePendingRewards(address?: `0x${string}`) {
  const result = useReadContract({
    ...stakingPoolContract,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  console.log("[usePendingRewards] address:", address, "data:", result.data)
  return result
}

/* ------------------------------------------------------------------ */
/*  useStake                                                           */
/* ------------------------------------------------------------------ */

/**
 * Write hook that stakes tokens into the StakingPool.
 *
 * BEFORE STAKING — THE TWO-STEP APPROVAL FLOW:
 * ERC-20 contracts do not allow other contracts to pull tokens freely.
 * The user must first call `approve(spender, amount)` on the token
 * contract to grant the StakingPool permission to move their funds.
 * This hook checks the current allowance and automatically submits an
 * approval transaction if the allowance is insufficient. Only after
 * the approval succeeds does it call `stake(amount)`.
 *
 * GAS:
 * Every transaction that changes blockchain state (write) costs "gas".
 * Gas is a unit of computational work priced in the chain's native
 * token (ETH on Base Sepolia). Approve + stake together require two
 * separate transactions, so the user pays gas for both. The wallet
 * will show an estimated gas fee before the user confirms each one.
 *
 * TRANSACTION CONFIRMATION:
 * After the user signs a transaction in their wallet, the transaction
 * is broadcast to the network and sits in the mempool until a validator
 * includes it in a block. "Confirmation" means the transaction has been
 * mined into a block and is now part of the immutable chain. Wagmi's
 * `useWriteContract` returns `isSuccess` once the transaction is
 * confirmed (not just signed), so UI spinners should wait for that
 * flag before showing "Done".
 */
export function useStake() {
  const { writeContract: writeStake, isPending, isSuccess, data: hash } =
    useWriteContract()

  const { writeContract: writeApprove } = useWriteContract()

  /**
   * Execute the full stake flow: approve (if needed) then stake.
   *
   * @param amount - Human-readable amount (e.g. "10").
   * @param userAddress - The connected wallet address.
   */
  const write = useCallback(
    async (amount: string, userAddress: `0x${string}`) => {
      const parsed = parseEther(amount)
      if (parsed <= 0n) throw new Error("Amount must be greater than 0")

      console.log("[useStake] Starting stake flow for", amount, "TOKEN")

      // 1. Check current allowance granted to the StakingPool.
      console.log("[useStake] Checking allowance...")
      const allowanceRes = await queryClient.fetchQuery({
        queryKey: ["allowance", userAddress],
        queryFn: async () => {
          const { readContract } = await import("wagmi/actions")
          return readContract(config, {
            ...mockTokenContract,
            functionName: "allowance",
            args: [userAddress, stakingPoolContract.address],
          })
        },
      })
      console.log("[useStake] Current allowance:", formatEther(allowanceRes as bigint))

      // 2. Approve if the allowance is too low.
      if ((allowanceRes as bigint) < parsed) {
        console.log("[useStake] Allowance insufficient — submitting approval tx")
        await new Promise<void>((resolve, reject) => {
          writeApprove(
            {
              ...mockTokenContract,
              functionName: "approve",
              args: [stakingPoolContract.address, parsed],
            },
            {
              onSuccess: (txHash) => {
                console.log("[useStake] Approve confirmed:", txHash)
                resolve()
              },
              onError: (err) => {
                console.error("[useStake] Approve failed:", err)
                reject(err)
              },
            }
          )
        })
      } else {
        console.log("[useStake] Allowance sufficient — skipping approval")
      }

      // 3. Stake the tokens.
      console.log("[useStake] Submitting stake transaction")
      writeStake(
        {
          ...stakingPoolContract,
          functionName: "stake",
          args: [parsed],
        },
        {
          onSuccess: (txHash) => {
            console.log("[useStake] Stake confirmed:", txHash)
            invalidateDashboard()
          },
          onError: (err) => {
            console.error("[useStake] Stake failed:", err)
          },
        }
      )
    },
    [writeApprove, writeStake]
  )

  return { write, isPending, isSuccess, hash }
}

/* ------------------------------------------------------------------ */
/*  useWithdraw                                                        */
/* ------------------------------------------------------------------ */

/**
 * Write hook that withdraws staked tokens from the StakingPool.
 *
 * GAS:
 * Withdrawing is a state-changing operation, so the user must pay gas
 * in the native token. The gas cost depends on how much internal state
 * the contract needs to update (e.g. recalculating reward snapshots).
 *
 * TRANSACTION CONFIRMATION:
 * The user's wallet will first show a signing prompt. After they sign,
 * the transaction enters the mempool. `isPending` is true during this
 * entire window. Once a validator mines the transaction into a block,
 * wagmi flips `isSuccess` to true and we can update the UI.
 */
export function useWithdraw() {
  const { writeContract, isPending, isSuccess, data: hash } =
    useWriteContract()

  const write = useCallback(
    (amount: string) => {
      const parsed = parseEther(amount)
      if (parsed <= 0n) throw new Error("Amount must be greater than 0")

      console.log("[useWithdraw] Withdrawing", amount, "TOKEN")

      writeContract(
        {
          ...stakingPoolContract,
          functionName: "withdraw",
          args: [parsed],
        },
        {
          onSuccess: (txHash) => {
            console.log("[useWithdraw] Confirmed:", txHash)
            invalidateDashboard()
          },
          onError: (err) => {
            console.error("[useWithdraw] Failed:", err)
          },
        }
      )
    },
    [writeContract]
  )

  return { write, isPending, isSuccess, hash }
}

/* ------------------------------------------------------------------ */
/*  useClaimRewards                                                    */
/* ------------------------------------------------------------------ */

/**
 * Write hook that claims all accrued staking rewards.
 *
 * GAS:
 * Claiming rewards updates the user's reward balance and transfers tokens
 * from the pool to their wallet. Like any write operation, this requires
 * gas. If the pool has no rewards allocated, the transaction will still
 * cost gas but will simply transfer zero tokens.
 *
 * TRANSACTION CONFIRMATION:
 * Because reward calculations happen on-chain, the transaction must be
 * mined before the reward tokens actually appear in the user's wallet.
 * Frontend apps should wait for `isSuccess` before showing a "Claimed"
 * message or refreshing balances.
 */
export function useClaimRewards() {
  const { writeContract, isPending, isSuccess, data: hash } =
    useWriteContract()

  const write = useCallback(() => {
    console.log("[useClaimRewards] Claiming rewards")

    writeContract(
      {
        ...stakingPoolContract,
        functionName: "claimReward",
      },
      {
        onSuccess: (txHash) => {
          console.log("[useClaimRewards] Confirmed:", txHash)
          invalidateDashboard()
        },
        onError: (err) => {
          console.error("[useClaimRewards] Failed:", err)
        },
      }
    )
  }, [writeContract])

  return { write, isPending, isSuccess, hash }
}
