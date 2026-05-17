import { useQuery } from "@tanstack/react-query"

/**
 * Fetches deployed contract addresses and ABIs from the local JSON file.
 *
 * This hook uses TanStack Query to cache contract metadata so multiple
 * components can access it without re-fetching the static JSON asset.
 */
async function fetchContractInfo() {
  const res = await fetch("/contracts/contract-info.json")
  if (!res.ok) {
    throw new Error("Failed to load contract info")
  }
  return res.json()
}

/**
 * React hook that returns deployed contract metadata.
 *
 * @returns Query result containing contract addresses and ABIs.
 */
export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContractInfo,
    staleTime: Infinity, // Static JSON never goes stale.
  })
}
