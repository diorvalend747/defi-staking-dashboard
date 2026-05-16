import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * =============================
 *
 * After a user logs in with their wallet, the backend gives them a JWT
 * (JSON Web Token). The frontend must send this token in the Authorization
 * header on every protected request:
 *
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *
 * This middleware:
 *   1. Reads the Authorization header
 *   2. Verifies the JWT signature using JWT_SECRET
 *   3. Attaches the decoded user data to req.user
 *   4. Calls next() so the route handler can use req.user
 *
 * If the token is missing, expired, or tampered with, it returns 401 Unauthorized.
 */

// Extend Express's Request type so TypeScript knows about req.user.
// Without this, you'd get "Property 'user' does not exist on type 'Request'".
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        walletAddress: string;
      };
    }
  }
}

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  // Get the Authorization header
  // Expected format: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  // Extract the token string (everything after "Bearer ")
  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token not provided" });
    return;
  }

  // Verify the token using our secret key.
  // If the signature doesn't match, or the token is expired, jwt.verify throws.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      walletAddress: string;
    };

    // Attach user info to the request object so route handlers can access it.
    // Example usage in a route: const userWallet = req.user?.walletAddress;
    req.user = decoded;

    next(); // Continue to the actual route handler
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
