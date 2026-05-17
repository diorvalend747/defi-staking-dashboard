import { createPublicClient, webSocket, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "../lib/prisma";

/**
 * Blockchain Event Listener Service
 * ==================================
 *
 * WHAT IS A BLOCKCHAIN EVENT?
 * ---------------------------
 * A blockchain event (also called a "log" or "event log") is like a
 * receipt that the blockchain gives you whenever something interesting
 * happens inside a smart contract.
 *
 * Think of it like this:
 *   - The blockchain is a giant public notebook
 *   - Every time someone calls stake() on the StakingPool contract,
 *     the contract writes a log entry: "User 0xabc... staked 1000 tokens"
 *   - These log entries are PERMANENT and PUBLIC — anyone can read them
 *
 * Events are MUCH cheaper to store than full transaction data, so contracts
 * use them to broadcast "something happened" signals to the outside world.
 *
 * WHY USE WEBSOCKET?
 * ------------------
 * There are two ways to get events from the blockchain:
 *
 *   1. POLLING (HTTP): Ask the RPC node every few seconds "any new events?"
 *      - Wastes bandwidth and RPC credits
 *      - Delayed by the polling interval
 *
 *   2. WEBSOCKET: The RPC node PUSHES events to you as they happen
 *      - Instant notification (sub-second latency)
 *      - Efficient — only receives data when something actually happens
 *      - Perfect for real-time dashboards
 *
 * We use WebSocket because our dashboard needs to show live updates
 * ("Alice just staked 500 tokens!") without refreshing the page.
 *
 * WHY RECONNECTION MATTERS
 * -------------------------
 * WebSocket connections can drop due to:
 *   - Network hiccups
 *   - RPC provider maintenance
 *   - Server restarts
 *
 * Without reconnection, your dashboard would silently stop receiving updates.
 * viem's watchContractEvent automatically reconnects — we just need to
 * handle errors gracefully and log what's happening.
 */

// Minimal ABI containing only the events we want to listen to.
// We don't need the full contract ABI — just the event definitions.
const stakingPoolAbi = parseAbi([
  "event Staked(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
  "event RewardsClaimed(address indexed user, uint256 amount)",
]);

// Map contract event names to our database EventType enum values
const eventTypeMap: Record<string, "STAKE" | "WITHDRAW" | "CLAIM"> = {
  Staked: "STAKE",
  Withdrawn: "WITHDRAW",
  RewardsClaimed: "CLAIM",
};

/**
 * Starts listening for StakingPool events and broadcasts them via Socket.io.
 *
 * @param io  The Socket.io server instance (for broadcasting to rooms)
 */
export function startEventListener(io: SocketIOServer) {
  // Read configuration from environment variables
  const poolAddress = process.env.STAKING_POOL_ADDRESS as `0x${string}`;
  const alchemyKey = process.env.ALCHEMY_API_KEY || "";

  if (!poolAddress) {
    console.error("❌ STAKING_POOL_ADDRESS not set. Event listener cannot start.");
    return;
  }

  // Build the WebSocket RPC URL.
  // Alchemy provides WebSocket access with the same API key.
  // If no Alchemy key is set, we skip the listener (local dev without RPC).
  const wsUrl = alchemyKey
    ? `wss://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
    : undefined;

  if (!wsUrl) {
    console.warn("⚠️  No ALCHEMY_API_KEY found. Skipping blockchain event listener.");
    console.warn("   Set it in .env to enable real-time event streaming.");
    return;
  }

  // Create a viem public client using WebSocket transport.
  // This maintains a persistent connection to the RPC node.
  const client = createPublicClient({
    chain: baseSepolia,
    transport: webSocket(wsUrl, {
      // Retry configuration: if the connection drops, viem will try to reconnect
      retryCount: 10,
      retryDelay: 3000, // Wait 3 seconds between retries
    }),
  });

  console.log(`🔔 Starting blockchain event listener for pool: ${poolAddress}`);

  // watchContractEvent sets up a persistent listener that:
  //   1. Subscribes to new block headers via WebSocket
  //   2. Scans each block for matching event logs
  //   3. Calls our onLogs callback when events are found
  //   4. Automatically reconnects if the WebSocket drops
  const unwatch = client.watchContractEvent({
    address: poolAddress,
    abi: stakingPoolAbi,
    // Listen to ALL events defined in the ABI (Staked, Withdrawn, RewardsClaimed)
    // We could also filter by specific event names or indexed parameters.
    onLogs: async (logs) => {
      for (const log of logs) {
        // Each log contains one event occurrence.
        // log.eventName tells us which event fired (e.g. "Staked").
        // log.args contains the event parameters (e.g. { user, amount }).

        const eventName = log.eventName as keyof typeof eventTypeMap;
        const eventType = eventTypeMap[eventName];

        if (!eventType) {
          console.warn(`Unknown event: ${eventName}`);
          continue;
        }

        const userAddress = (log.args.user as string).toLowerCase();
        const amount = (log.args.amount as bigint).toString();
        const txHash = log.transactionHash;
        const blockNumber = log.blockNumber;

        // Get the block timestamp by fetching the block details.
        // This gives us the exact time the event was mined.
        let timestamp: Date;
        try {
          const block = await client.getBlock({ blockNumber });
          timestamp = new Date(Number(block.timestamp) * 1000);
        } catch {
          // Fallback: use current time if block fetch fails
          timestamp = new Date();
        }

        console.log(`⛓️  Event: ${eventName} | User: ${userAddress} | Amount: ${amount} | Tx: ${txHash}`);

        // ---- Save to database (with deduplication) ----
        // We wrap this in try/catch because the txHash has a @unique constraint.
        // If this event was already processed (e.g. after a reconnection),
        // Prisma will throw a unique constraint error and we simply skip it.
        try {
          await prisma.stakeEvent.create({
            data: {
              txHash,
              userAddress,
              type: eventType,
              amount,
              blockNumber,
              timestamp,
            },
          });
          console.log(`💾 Saved to database: ${txHash}`);
        } catch (err: any) {
          // P2002 = unique constraint violation (txHash already exists)
          if (err.code === "P2002") {
            console.log(`⏩ Skipped duplicate: ${txHash}`);
          } else {
            console.error(`❌ Database error for ${txHash}:`, err.message);
          }
        }

        // ---- Broadcast via Socket.io ----
        // We emit to TWO rooms:
        //   1. The user's specific room (so their personal dashboard updates instantly)
        //   2. A global "updates" room (so the stats page shows live numbers)

        const payload = {
          type: eventType,
          userAddress,
          amount,
          txHash,
          blockNumber: blockNumber.toString(),
          timestamp: timestamp.toISOString(),
        };

        // Emit to the user's personal room (e.g. "0xabc...")
        io.to(userAddress).emit("stake:event", payload);

        // Emit to the global updates room (for the stats/dashboard page)
        io.to("updates").emit("stake:event", payload);

        console.log(`📡 Broadcasted to rooms: ${userAddress}, updates`);
      }
    },
    onError: (err) => {
      console.error("🔴 WebSocket error:", err.message);
      // viem will automatically attempt to reconnect based on retryCount/retryDelay.
      // We just log the error so we can monitor connection health.
    },
  });

  // Return a cleanup function so server.ts can stop the listener on shutdown
  return unwatch;
}
