/**
 * Routes Index
 * ============
 * This file re-exports all route modules so other files can import them
 * from a single location. As you add more routes, register them here.
 *
 * Example usage in server.ts:
 *   import { healthRoutes, userRoutes } from "./routes";
 */

export { default as healthRoutes } from "./health";

// Future routes:
// export { default as userRoutes } from "./user";
// export { default as stakeRoutes } from "./stake";
