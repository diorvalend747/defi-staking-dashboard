import { useQuery, useMutation, QueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useAuthStore } from "@/stores/auth-store"

/**
 * Base Axios instance pre-configured with the backend URL.
 *
 * All API calls should use this instance so that base URL, timeouts,
 * and interceptors are applied consistently.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3003",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * Request interceptor that injects the JWT Authorization header
 * on every outgoing request. The token is read from the Zustand
 * auth store so it stays in sync across the app.
 */
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Shared QueryClient used to invalidate caches after mutations.
 *
 * We export a singleton so that custom wagmi hooks can also trigger
 * refreshes of TanStack Query data (e.g. stats cards).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Generic GET hook for fetching data from the backend.
 *
 * @param key - TanStack Query cache key.
 * @param url - API endpoint path.
 * @returns Query result with data, error, and loading state.
 */
export function useApiQuery<T>(key: string[], url: string) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<T>(url)
      return data
    },
  })
}

/**
 * Generic POST mutation hook for sending data to the backend.
 *
 * @param url - API endpoint path.
 * @returns Mutation result with mutate function and state.
 */
export function useApiMutation<T, V = unknown>(url: string) {
  return useMutation<T, Error, V>({
    mutationFn: async (payload) => {
      const { data } = await api.post<T>(url, payload)
      return data
    },
  })
}
