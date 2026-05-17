"use client"

import { useAccount, useChainId } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { useMounted } from "@/hooks/use-mounted"

/**
 * Footer bar displaying network connection status.
 *
 * Shows a green indicator when the user is connected to Base Sepolia,
 * and a red indicator when disconnected or on the wrong chain.
 */
export function Footer() {
  const mounted = useMounted()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectChain = chainId === baseSepolia.id

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center justify-between">
        <p className="text-xs text-muted-foreground">
          DeFi Staking Dashboard
        </p>

        <div className="flex items-center gap-2 min-w-[160px] justify-end">
          {!mounted ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : isConnected && isCorrectChain ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-600">
                Connected to Base Sepolia
              </span>
            </>
          ) : isConnected && !isCorrectChain ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">
                Wrong network
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Wallet disconnected
              </span>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
