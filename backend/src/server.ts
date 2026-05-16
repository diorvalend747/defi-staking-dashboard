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
const io = new SocketIOServer(httpServer, {
  cors: {
    // Allow connections from the frontend origin
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Log when clients connect/disconnect (helpful for debugging)
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

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
// to this backend (e.g. localhost:3001) because they have different origins.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
});
