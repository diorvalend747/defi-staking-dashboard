/**
 * Backend Integration Test Script
 * ================================
 * Run this to verify your backend endpoints are working correctly.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/test-backend.ts
 */

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const BASE_URL = process.env.BACKEND_URL || "http://localhost:3003";

// A throwaway test private key (DO NOT use this for real funds — it's public!)
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function request(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log("🧪 Backend Integration Tests\n");
  console.log(`Testing against: ${BASE_URL}\n`);

  // ---- Test 1: Health Check ----
  console.log("1️⃣  GET / (health check)");
  const health = await request("/");
  console.log(`   Status: ${health.status}`);
  console.log(`   Response:`, health.data);
  console.assert(health.data.status === "ok", "Health check failed");
  console.log(health.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  // ---- Test 2: Auth Nonce ----
  console.log("2️⃣  POST /auth/nonce");
  const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
  const walletAddress = testAccount.address;

  const nonceRes = await request("/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
  console.log(`   Status: ${nonceRes.status}`);
  console.log(`   Response:`, nonceRes.data);
  const nonce = nonceRes.data.nonce;
  console.assert(nonce && nonce.startsWith("0x"), "Nonce not returned");
  console.log(nonceRes.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  // ---- Test 3: Auth Verify ----
  console.log("3️⃣  POST /auth/verify (sign + verify)");

  // Create a viem wallet client to sign the nonce
  const walletClient = createWalletClient({
    account: testAccount,
    chain: baseSepolia,
    transport: http(),
  });

  // Build the exact same message the backend expects
  const message = `Sign this message to authenticate with DeFi Staking Dashboard.\nNonce: ${nonce}`;

  // Sign the message with the test wallet
  const signature = await walletClient.signMessage({
    account: testAccount,
    message,
  });
  console.log(`   Signature: ${signature.slice(0, 20)}...`);

  const verifyRes = await request("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature, nonce }),
  });
  console.log(`   Status: ${verifyRes.status}`);
  console.log(`   Response:`, verifyRes.data);
  const token = verifyRes.data.token;
  console.assert(token && token.startsWith("eyJ"), "JWT not returned");
  console.log(verifyRes.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  // ---- Test 4: Public Stats ----
  console.log("4️⃣  GET /api/stats (public)");
  const stats = await request("/api/stats");
  console.log(`   Status: ${stats.status}`);
  console.log(`   Response:`, stats.data);
  console.log(stats.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  // ---- Test 5: Public User Stats ----
  console.log("5️⃣  GET /api/user/:address (public)");
  const userStats = await request(`/api/user/${walletAddress}`);
  console.log(`   Status: ${userStats.status}`);
  console.log(`   Response:`, userStats.data);
  console.log(userStats.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  // ---- Test 6: Protected History (no JWT) ----
  console.log("6️⃣  GET /api/history/:address (WITHOUT JWT — should 401)");
  const noAuth = await request(`/api/history/${walletAddress}`);
  console.log(`   Status: ${noAuth.status}`);
  console.log(`   Response:`, noAuth.data);
  console.log(noAuth.status === 401 ? "   ✅ PASSED (correctly rejected)\n" : "   ❌ FAILED\n");

  // ---- Test 7: Protected History (with JWT) ----
  console.log("7️⃣  GET /api/history/:address (WITH JWT)");
  const withAuth = await request(`/api/history/${walletAddress}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${withAuth.status}`);
  console.log(`   Response:`, withAuth.data);
  console.log(withAuth.status === 200 ? "   ✅ PASSED\n" : "   ❌ FAILED\n");

  console.log("🏁 All tests completed!");
}

runTests().catch((err) => {
  console.error("\n💥 Test runner crashed:", err.message);
  process.exit(1);
});
