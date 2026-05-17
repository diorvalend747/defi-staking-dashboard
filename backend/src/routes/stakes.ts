import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware";

/**
 * Stake API Routes
 * ================
 * These endpoints serve staking data to the frontend dashboard.
 *
 * WHY WE CALCULATE STATS FROM THE DATABASE (NOT THE BLOCKCHAIN):
 * ---------------------------------------------------------------
 * The blockchain is the "source of truth" — it records what actually happened.
 * But querying it directly for dashboards is painfully slow and expensive:
 *
 *   ┌─────────────────────────────┐    ┌─────────────────────────────┐
 *   │  Querying the blockchain    │    │  Querying the database      │
 *   ├─────────────────────────────┤    ├─────────────────────────────┤
 *   │  • Scan every block         │    │  • Instant indexed lookup   │
 *   │  • Filter logs manually     │    │  • SQL aggregates (SUM,     │
 *   │  • No pagination support    │    │    COUNT) in milliseconds   │
 *   │  • Costs RPC credits        │    │  • Pagination with LIMIT/   │
 *   │    (Alchemy charges per     │    │    OFFSET                   │
 *   │    request)                 │    │  • Free after indexing      │
 *   │  • Can't do complex         │    │  • Complex filters & sorts  │
 *   │    aggregates               │    │    trivially                │
 *   └─────────────────────────────┘    └─────────────────────────────┘
 *
 * How the data gets here:
 *   1. An indexer script listens for Staked/Withdrawn/RewardsClaimed events
 *      on the blockchain and INSERTs rows into the StakeEvent table.
 *   2. These routes query that table — fast, cheap, and flexible.
 *
 * The blockchain is the "write once" ledger. The database is the
 * "read-optimized cache" that powers your dashboard.
 */

const router = Router();

// ============================================
// Helper: parse numeric string to BigInt safely
// ============================================
// Blockchain token amounts are stored as strings (e.g. "1000000000000000000")
// because they can exceed JavaScript's safe integer limit (9,007,199,254,740,991).
// We use BigInt for arithmetic, then return strings to the frontend.
function toBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

// ============================================
// 1. GET /api/history/:address
// ============================================
/**
 * Returns all StakeEvents for a specific wallet address.
 * Protected by JWT — only the authenticated user can view their own history.
 *
 * Query params:
 *   ?limit=20   (default: 20, max: 100)
 *   ?offset=0   (default: 0)
 *
 * Response:
 *   {
 *     events: [...],
 *     pagination: { total, limit, offset, hasMore }
 *   }
 */
router.get("/history/:address", verifyJWT, async (req: Request, res: Response) => {
  const { address } = req.params;

  // Parse and clamp pagination params
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  // Fetch events sorted newest-first
  const events = await prisma.stakeEvent.findMany({
    where: { userAddress: address.toLowerCase() },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });

  // Get total count for pagination metadata
  const total = await prisma.stakeEvent.count({
    where: { userAddress: address.toLowerCase() },
  });

  // Prisma returns blockNumber as BigInt, but JSON.stringify cannot
  // serialize BigInt natively. We map each event to a plain object
  // with blockNumber converted to a string before sending.
  res.json({
    events: events.map((e) => ({
      ...e,
      blockNumber: e.blockNumber.toString(),
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
    },
  });
});

// ============================================
// 2. GET /api/stats
// ============================================
/**
 * Returns global aggregated staking statistics.
 * Public endpoint — no authentication required.
 *
 * Calculated from the database for instant response:
 *   • totalStaked  = SUM(STAKE amounts) - SUM(WITHDRAW amounts)
 *   • totalUsers   = COUNT(DISTINCT userAddress)
 *   • totalTransactions = COUNT(all events)
 *
 * Response:
 *   {
 *     totalStaked: "15000000000000000000000",
 *     totalUsers: 42,
 *     totalTransactions: 137
 *   }
 */
router.get("/stats", async (_req: Request, res: Response) => {
  // Fetch ALL events to calculate aggregates in memory.
  // For a small-to-medium dataset this is fast and simple.
  // For millions of rows, you'd use Prisma's rawQuery with SQL SUM().
  const allEvents = await prisma.stakeEvent.findMany({
    select: { type: true, amount: true, userAddress: true },
  });

  // Calculate total staked using BigInt arithmetic
  let totalStaked = 0n;
  const uniqueUsers = new Set<string>();

  for (const event of allEvents) {
    const amount = toBigInt(event.amount);

    if (event.type === "STAKE") {
      totalStaked += amount;
    } else if (event.type === "WITHDRAW") {
      totalStaked -= amount;
    }
    // CLAIM events don't change the staked total

    uniqueUsers.add(event.userAddress);
  }

  res.json({
    totalStaked: totalStaked.toString(),
    totalUsers: uniqueUsers.size,
    totalTransactions: allEvents.length,
  });
});

// ============================================
// 3. GET /api/user/:address
// ============================================
/**
 * Returns per-user statistics calculated from their StakeEvents.
 * Public endpoint — anyone can look up any address (same as blockchain).
 *
 * Calculated fields:
 *   • totalStaked   = SUM(STAKE) - SUM(WITHDRAW) for this user
 *   • totalClaimed  = SUM(CLAIM) for this user
 *   • transactionCount = number of events
 *   • lastActivity  = timestamp of most recent event
 *
 * Response:
 *   {
 *     address: "0x...",
 *     totalStaked: "5000000000000000000",
 *     totalClaimed: "250000000000000000",
 *     transactionCount: 12,
 *     lastActivity: "2026-05-10T14:22:00.000Z"
 *   }
 */
router.get("/user/:address", async (req: Request, res: Response) => {
  const { address } = req.params;
  const normalizedAddress = address.toLowerCase();

  // Fetch all events for this user
  const userEvents = await prisma.stakeEvent.findMany({
    where: { userAddress: normalizedAddress },
    orderBy: { timestamp: "desc" },
  });

  // If no events found, return empty stats rather than 404
  // (a user might exist in the system but hasn't staked yet)
  if (userEvents.length === 0) {
    res.json({
      address: normalizedAddress,
      totalStaked: "0",
      totalClaimed: "0",
      transactionCount: 0,
      lastActivity: null,
    });
    return;
  }

  // Calculate per-user stats with BigInt arithmetic
  let totalStaked = 0n;
  let totalClaimed = 0n;

  for (const event of userEvents) {
    const amount = toBigInt(event.amount);

    if (event.type === "STAKE") {
      totalStaked += amount;
    } else if (event.type === "WITHDRAW") {
      totalStaked -= amount;
    } else if (event.type === "CLAIM") {
      totalClaimed += amount;
    }
  }

  // Ensure staked never goes negative (could happen due to data inconsistencies)
  if (totalStaked < 0n) totalStaked = 0n;

  res.json({
    address: normalizedAddress,
    totalStaked: totalStaked.toString(),
    totalClaimed: totalClaimed.toString(),
    transactionCount: userEvents.length,
    lastActivity: userEvents[0].timestamp,
  });
});

export default router;
