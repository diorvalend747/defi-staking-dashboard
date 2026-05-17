import { create } from "zustand";
import { io, Socket } from "socket.io-client";

/**
 * Socket.io client state managed by Zustand.
 *
 * Maintains a single Socket.io connection that can be accessed
 * from any component. The connection is lazily initialized on
 * the first call to `connect()`.
 */
interface SocketState {
  /** Active Socket.io client instance, or null if disconnected. */
  socket: Socket | null;
  /** Whether the socket is currently connected. */
  isConnected: boolean;
  /** Establish a connection to the backend Socket.io server. */
  connect: () => void;
  /** Disconnect from the backend Socket.io server. */
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    if (get().socket) return; // Already connected or connecting.

    const socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3003",
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    socket.on("connect", () => {
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
