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
import { motion, AnimatePresence } from "framer-motion"

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
      <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-100">
        <DialogHeader className="gap-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700/50">
            <AnimatePresence mode="wait">
              {isPending && (
                <motion.div
                  key="pending"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
                </motion.div>
              )}
              {isSuccess && (
                <motion.div
                  key="success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </motion.div>
              )}
              {isError && (
                <motion.div
                  key="error"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <XCircle className="h-7 w-7 text-red-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogTitle className="text-center text-slate-100">
            {isPending && "Transaction Pending"}
            {isSuccess && "Transaction Confirmed"}
            {isError && "Transaction Failed"}
            {!status && title}
          </DialogTitle>

          <DialogDescription className="text-center text-slate-400">
            {isPending && description}
            {isSuccess && "Your transaction has been confirmed on-chain."}
            {isError && "Something went wrong. Check the details below and try again."}
            {!status && description}
          </DialogDescription>
        </DialogHeader>

        {hash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-2"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transaction Hash
            </p>
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span className="truncate">
                {hash.slice(0, 14)}…{hash.slice(-12)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </motion.div>
        )}

        {isError && (
          <p className="text-xs text-center text-slate-500">
            Common causes: user rejection, insufficient gas, network congestion,
            or a contract revert.
          </p>
        )}

        {isDone && (
          <div className="flex justify-center">
            <Button
              onClick={() => {
                close()
                reset()
              }}
              className="min-w-[120px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
