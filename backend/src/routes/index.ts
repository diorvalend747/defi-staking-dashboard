/**
 * Routes Index
 * ============
 * This file re-exports all route modules so other files can import them
 * from a single location. As you add more routes, register them here.
 *
 * Example usage in server.ts:
 *   import { healthRoutes, authRoutes } from "./routes";
 */

export { default as healthRoutes } from "./health";
export { default as authRoutes } from "./auth";
export { default as stakeRoutes } from "./stakes";
