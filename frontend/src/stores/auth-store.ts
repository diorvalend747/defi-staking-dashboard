import { create } from "zustand"

/**
 * Authentication state for Sign-In with Ethereum (SIWE).
 *
 * Stores the JWT token returned by the backend after a successful
 * signature verification. The token is persisted in localStorage so
 * the user stays authenticated across page reloads.
 */
interface AuthState {
  /** JWT bearer token, or null if not authenticated. */
  token: string | null
  /** Set the JWT token (e.g. after /auth/verify succeeds). */
  setToken: (token: string | null) => void
  /** Remove the token and sign out. */
  logout: () => void
}

const STORAGE_KEY = "defi_auth_token"

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    set({ token })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null })
  },
}))
