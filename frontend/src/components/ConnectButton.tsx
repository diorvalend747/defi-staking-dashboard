"use client"

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit"
import { motion } from "framer-motion"

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading"
        const connected =
          ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated")

        return (
          <div
            className="flex items-center"
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openConnectModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
                  >
                    Connect Wallet
                  </motion.button>
                )
              }

              if (chain.unsupported) {
                return (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20"
                  >
                    Switch Network
                  </motion.button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/60 transition-colors"
                  >
                    {chain.hasIcon && (
                      <div
                        className="mr-1 h-4 w-4 overflow-hidden rounded-full"
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={chain.name ?? "Chain icon"} src={chain.iconUrl} className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openAccountModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
                  >
                    {account.displayName}
                    {account.displayBalance ? ` (${account.displayBalance})` : ""}
                  </motion.button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </RainbowConnectButton.Custom>
  )
}
