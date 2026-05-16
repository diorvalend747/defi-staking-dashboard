import { Router, Request, Response } from "express";

/**
 * Health Check Routes
 * ===================
 * Simple endpoints to verify the backend is running and healthy.
 * Useful for monitoring, load balancers, and quick manual checks.
 */

const router = Router();

/**
 * GET /
 * Returns the current server status.
 * This is the first thing to check if your frontend can't connect.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * GET /health
 * A more detailed health check.
 * In a production app, you might also check database connectivity here.
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
