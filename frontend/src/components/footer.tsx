"use client"

import { useAccount, useChainId } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { Wifi, WifiOff, Loader2, Zap } from "lucide-react"
import { useMounted } from "@/hooks/use-mounted"
import { motion } from "framer-motion"

export function Footer() {
  const mounted = useMounted()
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectChain = chainId === baseSepolia.id

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="border-t border-slate-800/60 bg-[#020617]/80 backdrop-blur-xl relative z-10"
    >
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <Zap className="h-3.5 w-3.5" />
          <p className="text-xs">
            DeFi Dash
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!mounted ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
          ) : isConnected && isCorrectChain ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-400">
                Base Sepolia
              </span>
            </>
          ) : isConnected && !isCorrectChain ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">
                Wrong network
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-xs text-slate-600">
                Disconnected
              </span>
            </>
          )}
        </div>
      </div>
    </motion.footer>
  )
}
