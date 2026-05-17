import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names using `clsx` and resolves Tailwind CSS conflicts with `twMerge`.
 *
 * `clsx` allows conditional and dynamic className composition by accepting strings, arrays,
 * and objects. `twMerge` ensures that when conflicting Tailwind utilities are present
 * (e.g., `px-2` and `px-4`), the last one wins without style duplication.
 *
 * Usage:
 *   cn("px-2", isActive && "bg-blue-500", ["py-1", "px-4"])
 *   // => "bg-blue-500 py-1 px-4" (px-4 wins over px-2)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as a compact currency string (e.g., "$1.2K", "$3.5M").
 *
 * Uses the Intl.NumberFormat API with the "compact" notation for concise display
 * of large monetary values in the US locale.
 *
 * @param value - The numeric amount to format.
 * @returns A localized compact currency string.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
  }).format(value)
}

/**
 * Formats a number as a compact decimal string (e.g., "1.2K", "3.5M").
 *
 * Useful for displaying large counts (users, transactions, votes) in a readable way.
 *
 * @param value - The number to format.
 * @returns A localized compact decimal string.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Truncates a blockchain address for display purposes.
 *
 * Converts a full Ethereum-style address like "0x1234...5678" into a shortened
 * version showing only the first and last few characters.
 *
 * @param address - The full address string.
 * @param startChars - Number of characters to show at the start (default: 6).
 * @param endChars - Number of characters to show at the end (default: 4).
 * @returns The truncated address or an empty string if input is invalid.
 */
export function truncateAddress(
  address: string | undefined | null,
  startChars = 6,
  endChars = 4
): string {
  if (!address) return ""
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Delays execution for a specified amount of time.
 *
 * Returns a Promise that resolves after `ms` milliseconds. Useful for adding
 * pauses in async flows, retry loops, or simulating network latency.
 *
 * @param ms - Number of milliseconds to sleep.
 * @returns A Promise that resolves after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
