"use client"

import { useCallback } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "./use-api"

/**
 * Sign-In with Ethereum (SIWE) hook.
 *
 * Implements the three-step auth flow required by the backend:
 *   1. Request a nonce for the connected wallet address.
 *   2. Sign the message "Sign this message to authenticate...\nNonce: <nonce>"
 *      with the user's private key via their wallet.
 *   3. Send the signature back to the backend; receive a JWT on success.
 *
 * The JWT is then stored in localStorage (via auth-store) and automatically
 * attached to every Axios request made through the `api` instance.
 */
export function useAuth() {
  const { address, isConnected } = useAccount()
  const { setToken, token, logout } = useAuthStore()

  const { signMessageAsync } = useSignMessage()

  /**
   * Authenticate the connected wallet.
   *
   * Returns the JWT token string on success, or throws on failure.
   */
  const authenticate = useCallback(async (): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected")
    }

    // Step 1: Request a nonce from the backend.
    console.log("[Auth] Requesting nonce for", address)
    const { data: nonceRes } = await api.post<{ nonce: string }>("/auth/nonce", {
      walletAddress: address,
    })
    const nonce = nonceRes.nonce
    console.log("[Auth] Received nonce:", nonce)

    // Step 2: Sign the nonce with the user's wallet.
    const message = `Sign this message to authenticate with DeFi Staking Dashboard.\nNonce: ${nonce}`
    console.log("[Auth] Signing message:", message)
    const signature = await signMessageAsync({ message })
    console.log("[Auth] Signature:", signature)

    // Step 3: Verify the signature and get a JWT.
    const { data: verifyRes } = await api.post<{
      token: string
      user: { id: string; walletAddress: string }
    }>("/auth/verify", {
      walletAddress: address,
      signature,
      nonce,
    })

    console.log("[Auth] JWT received:", verifyRes.token.slice(0, 20) + "...")
    setToken(verifyRes.token)
    return verifyRes.token
  }, [address, isConnected, signMessageAsync, setToken])

  return {
    /** Whether the user currently has a stored JWT. */
    isAuthenticated: !!token,
    /** The raw JWT token, or null. */
    token,
    /** Trigger the full SIWE auth flow. */
    authenticate,
    /** Clear the stored token and sign out. */
    logout,
  }
}
