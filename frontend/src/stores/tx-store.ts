import { create } from "zustand"

/**
 * Transaction modal state managed by Zustand.
 *
 * Tracks the visibility and content of a modal that shows transaction
 * progress (pending, success, error) so users get feedback while their
 * wallet interacts with the blockchain.
 */
interface TxModalState {
  /** Whether the modal is currently visible. */
  isOpen: boolean
  /** Human-readable title of the current transaction step. */
  title: string
  /** Descriptive text explaining what is happening. */
  description: string
  /** Blockchain transaction hash, if one has been submitted. */
  hash: string | null
  /** Current status of the transaction lifecycle. */
  status: "idle" | "pending" | "success" | "error"

  /** Open the modal with a new title and description. */
  open: (title: string, description: string) => void
  /** Close the modal. */
  close: () => void
  /** Update the transaction hash and status after submission. */
  setTx: (hash: string | null, status: TxModalState["status"]) => void
  /** Reset to initial closed state. */
  reset: () => void
}

export const useTxModalStore = create<TxModalState>((set) => ({
  isOpen: false,
  title: "",
  description: "",
  hash: null,
  status: "idle",

  open: (title, description) =>
    set({ isOpen: true, title, description, hash: null, status: "idle" }),

  close: () => set({ isOpen: false }),

  setTx: (hash, status) => set({ hash, status }),

  reset: () =>
    set({ isOpen: false, title: "", description: "", hash: null, status: "idle" }),
}))
