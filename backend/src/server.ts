import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

// Load environment variables from .env file
// This MUST happen before any other code that uses process.env
dotenv.config();

// Import route handlers
// Routes are organized into separate files so the codebase stays clean as it grows
import { healthRoutes, authRoutes, stakeRoutes } from "./routes";

// Import the blockchain event listener
// This service watches the StakingPool contract for events and broadcasts them
import { startEventListener } from "./services/listener";

// ============================================
// Create Express app and HTTP server
// ============================================
// We create a raw HTTP server first, then attach both Express and Socket.io to it.
// This lets them share the same port.
const app = express();
const httpServer = createServer(app);

// ============================================
// Configure Socket.io for real-time updates
// ============================================
// Socket.io lets the server push data to the frontend instantly (like live
// staking updates, reward notifications, etc.) without the frontend needing
// to constantly ask "anything new?"
//
// HOW IT WORKS:
//   - Frontend opens a persistent WebSocket connection to the server
//   - Server can push messages to the frontend at any time ("events")
//   - Frontend listens for these events and updates the UI
//
// WHY NOT JUST USE HTTP?
//   HTTP is "request-response" — the client must ask for data.
//   WebSocket is "bidirectional" — either side can send data at any time.
//   For a live dashboard, you NEED the server to push updates.
const io = new SocketIOServer(httpServer, {
  cors: {
    // Allow all origins in development (file://, localhost:5173, etc.)
    // In production, restrict this to your actual frontend domain!
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ============================================
// Socket.io Connection Handling
// ============================================
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ---- "subscribe" event ----
  // The frontend emits this after connecting to join rooms.
  // Rooms are like chat channels — you send a message to a room,
  // and everyone in that room receives it.
  //
  // We create a room named after the user's wallet address.
  // When a blockchain event happens for that user, we broadcast
  // to their room so their personal dashboard updates instantly.
  socket.on("subscribe", (walletAddress: string) => {
    if (!walletAddress || typeof walletAddress !== "string") {
      socket.emit("error", { message: "Invalid wallet address" });
      return;
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Join the user's personal room (e.g. "0xabc...")
    socket.join(normalizedAddress);
    console.log(`Socket ${socket.id} subscribed to room: ${normalizedAddress}`);

    // Also join the global "updates" room for stats/dashboard broadcasts
    socket.join("updates");
    console.log(`Socket ${socket.id} joined global updates room`);

    // Confirm subscription to the frontend
    socket.emit("subscribed", { room: normalizedAddress });
  });

  // ---- "unsubscribe" event ----
  // Optional: let the frontend leave rooms when switching pages
  socket.on("unsubscribe", (walletAddress: string) => {
    const normalizedAddress = walletAddress.toLowerCase();
    socket.leave(normalizedAddress);
    socket.leave("updates");
    console.log(
      `Socket ${socket.id} left rooms: ${normalizedAddress}, updates`,
    );
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ============================================
// Middleware
// ============================================
// Middleware runs on EVERY request before it reaches your route handlers.

// CORS = Cross-Origin Resource Sharing.
// Without this, the browser blocks requests from your frontend (e.g. localhost:5173)
// to this backend (e.g. localhost:3003) because they have different origins.
app.use(
  cors({
    // Allow all origins in development (including file:// and localhost:5173)
    // In production, restrict this to your actual frontend domain!
    origin: true,
    credentials: true,
  }),
);

// Parse incoming JSON request bodies into JavaScript objects
// (so you can read req.body in POST handlers)
app.use(express.json());

// ============================================
// Routes
// ============================================
// Mount route modules. Each module handles requests for a specific URL prefix.
// This keeps related endpoints grouped together.

// Health check — simple endpoint to confirm the server is alive
app.use("/", healthRoutes);

// Authentication routes — wallet-based login (SIWE)
app.use("/auth", authRoutes);

// Staking data routes
// /api/history is protected — only authenticated users can view their history
app.use("/api", stakeRoutes);

// ============================================
// Error handling
// ============================================
// Express error handler — catches any errors thrown in route handlers
// and sends a clean JSON response instead of crashing the server.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

// ============================================
// Start the server
// ============================================
const PORT = process.env.PORT || 3003;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);

  // ============================================
  // Start the blockchain event listener
  // ============================================
  // This connects to the blockchain via WebSocket and watches for
  // Staked / Withdrawn / RewardsClaimed events on the StakingPool contract.
  // When events are detected, they are saved to the database and
  // broadcast to connected Socket.io clients.
  startEventListener(io);
});

// ============================================
// Graceful shutdown
// ============================================
// When the server receives a shutdown signal (e.g. Ctrl+C), close
// the HTTP server and Socket.io connections cleanly.
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
