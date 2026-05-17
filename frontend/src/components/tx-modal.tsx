"use client"

import { useTxModalStore } from "@/stores/tx-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react"

/**
 * Transaction Pending / Success / Error modal.
 *
 * Displays real-time feedback for every blockchain interaction.
 * When a transaction is submitted, the modal shows the pending state
 * with a spinner and the transaction hash linked to BaseScan.
 *
 * WHY WEB3 TRANSACTIONS CAN FAIL EVEN WHEN CODE IS CORRECT:
 *
 * 1. User rejection — The user clicks "Reject" in their wallet popup.
 *    This is the most common failure and is expected UX, not a bug.
 *
 * 2. Out of gas — The transaction requires more gas than the user
 *    has available in native token (ETH on Base Sepolia). The EVM
 *    reverts the transaction but still deducts gas for work done.
 *
 * 3. Network congestion — During high traffic, gas prices spike and
 *    the wallet may refuse to broadcast if the fee cap is too low.
 *
 * 4. Nonce mismatch — If the user submits multiple transactions rapidly
 *    from another device or tab, the sequence number can get out of
 *    sync and the node rejects the second transaction.
 *
 * 5. Contract revert — The smart contract itself can reject the call
 *    (e.g. trying to withdraw more than staked). This is valid code
 *    behaviour, not a frontend bug.
 *
 * Because of these realities, every write operation must handle both
 * success and error paths gracefully with user-facing feedback.
 */
export function TxModal() {
  const { isOpen, title, description, hash, status, close, reset } =
    useTxModalStore()

  const isPending = status === "pending"
  const isSuccess = status === "success"
  const isError = status === "error"
  const isDone = isSuccess || isError

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          close()
          if (isDone) reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isPending && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
            {isSuccess && (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
            {isError && (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>

          <DialogTitle className="text-center">
            {isPending && "Transaction Pending"}
            {isSuccess && "Transaction Confirmed"}
            {isError && "Transaction Failed"}
            {!status && title}
          </DialogTitle>

          <DialogDescription className="text-center">
            {isPending && description}
            {isSuccess && "Your transaction has been confirmed on-chain."}
            {isError && "Something went wrong. Check the details below and try again."}
            {!status && description}
          </DialogDescription>
        </DialogHeader>

        {hash && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Transaction Hash
            </p>
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-primary transition-colors"
            >
              <span className="truncate">
                {hash.slice(0, 14)}…{hash.slice(-12)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        )}

        {isError && (
          <p className="text-xs text-center text-muted-foreground">
            Common causes: user rejection, insufficient gas, network congestion,
            or a contract revert (e.g. withdrawing more than your balance).
          </p>
        )}

        {isDone && (
          <div className="flex justify-center">
            <Button
              onClick={() => {
                close()
                reset()
              }}
              className="min-w-[120px]"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
