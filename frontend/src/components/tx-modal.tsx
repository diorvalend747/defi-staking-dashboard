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
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

/**
 * Transaction status modal.
 *
 * Displays feedback while a blockchain transaction is in progress,
 * including the transaction hash with a link to the block explorer.
 */
export function TxModal() {
  const { isOpen, title, description, hash, status, close, reset } =
    useTxModalStore()

  const isDone = status === "success" || status === "error"

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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "pending" && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {hash && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Transaction Hash</p>
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate rounded-md bg-muted px-3 py-2 text-sm font-mono text-foreground hover:underline"
            >
              {hash}
            </a>
          </div>
        )}

        {isDone && (
          <div className="flex justify-end">
            <Button onClick={() => { close(); reset() }}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
