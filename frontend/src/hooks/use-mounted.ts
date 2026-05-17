"use client"

import { useState, useEffect } from "react"

/**
 * Returns true once the component has mounted on the client.
 *
 * Use this to guard any UI that depends on browser-only APIs
 * (window, localStorage, wallet state) from causing React
 * hydration mismatches during SSR.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
