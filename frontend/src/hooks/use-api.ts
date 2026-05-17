import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";

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
});

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
      const { data } = await api.get<T>(url);
      return data;
    },
  });
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
      const { data } = await api.post<T>(url, payload);
      return data;
    },
  });
}
