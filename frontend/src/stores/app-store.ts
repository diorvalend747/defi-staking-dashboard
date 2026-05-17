import { create } from "zustand"

/**
 * Global application state managed by Zustand.
 *
 * Zustand provides a minimal, un-opinionated API for state management
 * without the boilerplate of reducers, providers, or context.
 */
interface AppState {
  /** Whether the UI is in dark mode. */
  darkMode: boolean
  /** Toggle between light and dark mode. */
  toggleDarkMode: () => void

  /** Connected wallet address, or null if disconnected. */
  walletAddress: string | null
  /** Set the connected wallet address. */
  setWalletAddress: (address: string | null) => void

  /** Whether a global loading spinner should be shown. */
  isLoading: boolean
  /** Show or hide the global loading state. */
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  walletAddress: null,
  setWalletAddress: (address) => set({ walletAddress: address }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
