"use client"

import { WagmiProvider } from "wagmi"
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"
import { config } from "@/lib/wagmi"

// Import RainbowKit CSS for the connect modal and wallet buttons.
import "@rainbow-me/rainbowkit/styles.css"

/**
 * Global application providers.
 *
 * Wraps the entire app with the three layers needed for Web3 + data fetching:
 *
 * 1. WagmiProvider  – Manages wallet connections, chain state, and contract
 *    interactions through the configured wagmi client.
 * 2. QueryClientProvider (from @tanstack/react-query) – Powers server-state
 *    caching for both wagmi's internal hooks and our application queries.
 * 3. RainbowKitProvider – Renders the connect-modal UI and theming. We use the
 *    built-in dark theme to match the app's aesthetic.
 *
 * The QueryClient is created once per session so that cache is preserved
 * across hot-reloads in development.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#6366f1",
            accentColorForeground: "#ffffff",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
