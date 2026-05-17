"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatEther } from "viem"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollText, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

import { api } from "@/hooks/use-api"
import { useAuth } from "@/hooks/use-auth"
import { useMounted } from "@/hooks/use-mounted"
import { AnimatedCard } from "@/components/animated-card"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Transaction {
  type: "Stake" | "Withdraw" | "Claim"
  amount: string
  timestamp: string
  blockNumber: number
  txHash: string
  address: string
}

const ITEMS_PER_PAGE = 10

export function TransactionHistory() {
  const mounted = useMounted()
  const { address, isConnected } = useAccount()
  const { isAuthenticated, authenticate } = useAuth()

  const [liveEvents, setLiveEvents] = useState<Transaction[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [authError, setAuthError] = useState(false)

  const {
    data: history,
    isLoading,
    error,
  } = useQuery<{ events: Transaction[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>({
    queryKey: ["history", address],
    queryFn: async () => {
      const res = await api.get(`/api/history/${address}`)
      return res.data
    },
    enabled: isConnected && !!address && isAuthenticated,
    retry: (failureCount, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) return false
      return failureCount < 2
    },
    staleTime: 30_000,
  })

  useEffect(() => {
    const status = (error as { response?: { status?: number } } | undefined)?.response?.status
    if (status === 401) {
      setAuthError(true)
    } else {
      setAuthError(false)
    }
  }, [error])

  useEffect(() => {
    if (!address) return

    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    const wsUrl = baseUrl.replace(/^http/, "ws")
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "subscribe", address }))
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (
          payload.type === "stake_update" &&
          payload.address?.toLowerCase() === address.toLowerCase()
        ) {
          const tx: Transaction = payload
          setLiveEvents((prev) => [tx, ...prev])
          toast.success(
            `${tx.type}: ${Number(formatEther(BigInt(tx.amount))).toFixed(4)} TOKEN`,
            { description: `Block #${tx.blockNumber}` }
          )
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onerror = () => {
      console.warn("[TransactionHistory] WebSocket connection failed. Live updates unavailable.")
    }

    ws.onclose = (event) => {
      if (!event.wasClean) {
        console.warn("[TransactionHistory] WebSocket closed unexpectedly.")
      }
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [address])

  const allTransactions = [...liveEvents, ...(history?.events || [])]
  const totalPages = Math.max(1, Math.ceil(allTransactions.length / ITEMS_PER_PAGE))
  const paginated = allTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
    setLiveEvents([])
    setAuthError(false)
  }, [address])

  if (!mounted) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700">
              <ScrollText className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Transaction History</h3>
          </div>
          <LoadingSkeleton />
        </div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard delay={0.5}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700">
            <ScrollText className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Transaction History</h3>
        </div>

        {!isConnected ? (
          <p className="text-sm text-slate-500">Connect your wallet to view transaction history.</p>
        ) : authError ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">Authentication required to view transaction history.</p>
            <Button onClick={authenticate} size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
              Sign In with Ethereum
            </Button>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Please authenticate to view your transaction history.</p>
            <Button onClick={authenticate} size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
              Sign In with Ethereum
            </Button>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : error && !authError ? (
          <p className="text-sm text-red-400">Failed to load history. Please try again later.</p>
        ) : (
          <>
            <div className="rounded-xl border border-slate-800/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800/60 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium">Type</TableHead>
                    <TableHead className="text-slate-400 font-medium">Amount</TableHead>
                    <TableHead className="text-slate-400 font-medium">Time</TableHead>
                    <TableHead className="text-slate-400 font-medium">Block</TableHead>
                    <TableHead className="text-slate-400 font-medium">Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12">
                          <EmptyState />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((tx, idx) => (
                        <motion.tr
                          key={`${tx.txHash}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                        >
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              tx.type === "Stake" && "bg-emerald-500/10 text-emerald-400",
                              tx.type === "Withdraw" && "bg-amber-500/10 text-amber-400",
                              tx.type === "Claim" && "bg-violet-500/10 text-violet-400",
                            )}>
                              {tx.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-200 font-mono text-sm">
                            {Number(formatEther(BigInt(tx.amount))).toFixed(4)} TOKEN
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {new Date(tx.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm font-mono">
            #{tx.blockNumber}
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors"
                            >
                              {tx.txHash.slice(0, 6)}…{tx.txHash.slice(-4)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </AnimatedCard>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-3 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 border border-slate-700/50">
        <ScrollText className="h-8 w-8 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">No transactions yet</p>
        <p className="text-xs text-slate-500 max-w-[260px] mx-auto mt-1">
          Stake, withdraw, or claim rewards to see your on-chain activity here.
        </p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 bg-slate-800" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: 5 }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-8 flex-1 bg-slate-800" />
          ))}
        </div>
      ))}
    </div>
  )
}

function cn(...inputs: (string | false | undefined)[]) {
  return inputs.filter(Boolean).join(" ")
}
