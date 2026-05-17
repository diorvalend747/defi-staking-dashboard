"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatEther } from "viem"

import { api } from "@/hooks/use-api"
import { useAuth } from "@/hooks/use-auth"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Single transaction record returned by the backend or pushed via WebSocket. */
interface Transaction {
  /** Event type emitted by the smart contract. */
  type: "Stake" | "Withdraw" | "Claim"
  /** Amount in wei (as a string so it survives JSON serialization). */
  amount: string
  /** ISO-8601 timestamp of the block or event. */
  timestamp: string
  /** Block number on Base Sepolia where the event was mined. */
  blockNumber: number
  /** Transaction hash on the blockchain. */
  txHash: string
  /** Wallet address that triggered the transaction. */
  address: string
}

const ITEMS_PER_PAGE = 10

/**
 * Transaction history table with live WebSocket updates.
 *
 * On mount the component:
 *   1. Fetches historical transactions from the REST API (requires JWT auth).
 *   2. Opens a WebSocket to the backend to receive real-time events.
 *
 * WebSocket lifecycle:
 *   - The connection is created inside a `useEffect` so it only runs on the
 *     client after React has rendered the component.
 *   - We pass `[address]` as the dependency array so the socket reconnects
 *     when the user switches wallets.
 *   - The cleanup function returned by `useEffect` calls `ws.close()`.
 *     This is critical: without it the socket would leak across re-renders
 *     and keep listening even after the component is unmounted.
 */
export function TransactionHistory() {
  const { address, isConnected } = useAccount()
  const { isAuthenticated, authenticate } = useAuth()

  // Live events pushed from the WebSocket are stored in React state so they
  // appear instantly without waiting for a new REST fetch.
  const [liveEvents, setLiveEvents] = useState<Transaction[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [authError, setAuthError] = useState(false)

  // ------------------------------------------------------------------
  // 1. Fetch existing history via TanStack Query (authenticated)
  // ------------------------------------------------------------------
  const {
    data: history,
    isLoading,
    error,
  } = useQuery<Transaction[]>({
    queryKey: ["history", address],
    queryFn: async () => {
      const res = await api.get(`/api/history/${address}`)
      return res.data
    },
    // Only run the query when a wallet is connected, we have an address,
    // and the user has authenticated (JWT is attached by the interceptor).
    enabled: isConnected && !!address && isAuthenticated,
    // If the server returns 401, surface it so we can prompt for auth.
    retry: (failureCount, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) return false
      return failureCount < 2
    },
    staleTime: 30_000,
  })

  // Detect 401 from the query error and show the auth prompt.
  useEffect(() => {
    const status = (error as { response?: { status?: number } } | undefined)?.response?.status
    if (status === 401) {
      setAuthError(true)
    } else {
      setAuthError(false)
    }
  }, [error])

  // ------------------------------------------------------------------
  // 2. WebSocket connection for real-time updates
  // ------------------------------------------------------------------
  useEffect(() => {
    // Guard: don't open a socket if the user hasn't connected a wallet.
    if (!address) return

    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3003"
    // Convert http(s):// to ws:// so the browser opens a WebSocket rather
    // than making HTTP long-polling requests.
    const wsUrl = baseUrl.replace(/^http/, "ws")
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // Optional: send a subscribe message so the backend knows which
      // address this client is interested in.
      ws.send(JSON.stringify({ action: "subscribe", address }))
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        // Only handle stake_update events that belong to the current user.
        if (
          payload.type === "stake_update" &&
          payload.address?.toLowerCase() === address.toLowerCase()
        ) {
          const tx: Transaction = payload

          // Prepend the new event so it appears at the top of the table.
          setLiveEvents((prev) => [tx, ...prev])

          // Show a toast notification so the user knows something happened
          // even if they are scrolled down or on another tab.
          toast.success(
            `${tx.type}: ${Number(formatEther(BigInt(tx.amount))).toFixed(4)} TOKEN`,
            { description: `Block #${tx.blockNumber}` }
          )
        }
      } catch {
        // Ignore malformed messages from the server.
      }
    }

    ws.onerror = (err) => {
      console.error("WebSocket error:", err)
    }

    // ----------------------------------------------------------------
    // Cleanup: close the socket when the component unmounts or when the
    // wallet address changes. This prevents memory leaks and stops the
    // client from receiving events for a previously connected wallet.
    // ----------------------------------------------------------------
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [address])

  // ------------------------------------------------------------------
  // 3. Merge history + live events and paginate
  // ------------------------------------------------------------------
  const allTransactions = [...liveEvents, ...(history || [])]
  const totalPages = Math.max(1, Math.ceil(allTransactions.length / ITEMS_PER_PAGE))
  const paginated = allTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when the wallet changes so we don't show an empty page.
  useEffect(() => {
    setCurrentPage(1)
    setLiveEvents([])
    setAuthError(false)
  }, [address])

  // ------------------------------------------------------------------
  // 4. Render
  // ------------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <p className="text-sm text-muted-foreground">
            Connect your wallet to view transaction history.
          </p>
        ) : authError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              Authentication required to view transaction history.
            </p>
            <Button onClick={authenticate} size="sm">
              Sign In with Ethereum
            </Button>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please authenticate to view your transaction history.
            </p>
            <Button onClick={authenticate} size="sm">
              Sign In with Ethereum
            </Button>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : error && !authError ? (
          <p className="text-sm text-destructive">
            Failed to load history. Please try again later.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((tx, idx) => (
                      <TableRow key={`${tx.txHash}-${idx}`}>
                        <TableCell className="font-medium">{tx.type}</TableCell>
                        <TableCell>
                          {Number(formatEther(BigInt(tx.amount))).toFixed(4)} TOKEN
                        </TableCell>
                        <TableCell>
                          {new Date(tx.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>#{tx.blockNumber}</TableCell>
                        <TableCell>
                          <a
                            href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono text-xs"
                          >
                            {tx.txHash.slice(0, 6)}…{tx.txHash.slice(-4)}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loading state for the transaction table.
 *
 * Renders placeholder rows so the layout doesn't jump when the real data
 * arrives from the backend.
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: 5 }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
