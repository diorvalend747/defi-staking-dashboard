import { Router, Request, Response } from "express";
import { verifyMessage } from "viem";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";

/**
 * Authentication Routes — Web3 "Sign-In with Ethereum" (SIWE)
 * ============================================================
 *
 * If you're new to Web3, this login flow is VERY different from email/password.
 * Here's how it works, step by step, compared to what you already know:
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  EMAIL/PASSWORD (what you know)          │  WEB3 WALLET LOGIN (SIWE)    │
 * ├──────────────────────────────────────────┼────────────────────────────────┤
 * │  1. User enters email + password         │  1. User clicks "Connect       │
 * │     on your website                      │     Wallet" button             │
 * │                                          │                                │
 * │  2. Frontend sends both to backend       │  2. Frontend asks wallet       │
 * │                                          │     (MetaMask, etc.) to sign   │
 * │                                          │     a message containing a     │
 * │                                          │     random "nonce"             │
 * │                                          │                                │
 * │  3. Backend checks password hash         │  3. Backend verifies the       │
 * │     against database                     │     signature using the        │
 * │                                          │     wallet's public key        │
 * │                                          │     (cryptographic math)       │
 * │                                          │                                │
 * │  4. If match → create session/JWT        │  4. If valid → create JWT      │
 * │                                          │     (same as email login!)     │
 * └──────────────────────────────────────────┴────────────────────────────────┘
 *
 * WHY THIS IS SECURE:
 * -------------------
 * - The user NEVER sends their private key to anyone. It stays in their wallet.
 * - The "nonce" is a random one-time string. Even if someone intercepts it,
 *   they can't reuse it because the backend generates a new one every login.
 * - The signature proves the user controls the wallet address (only the owner
 *   of the private key can produce a valid signature).
 *
 * KEY CONCEPTS:
 * -------------
 * - Private Key: A secret password stored in the user's wallet (MetaMask).
 *                NEVER leaves the device. NEVER sent to any server.
 * - Public Key / Address: Derived from the private key. Safe to share publicly.
 *                         This is the "0xabc..." string you see everywhere.
 * - Signature: A cryptographic proof created by the private key. Anyone can
 *              VERIFY a signature using only the public address, but only the
 *              private key owner can CREATE one.
 * - Nonce: "Number used once" — a random string that prevents replay attacks.
 *          Without a nonce, an attacker could reuse an old signature forever.
 */

const router = Router();

/**
 * POST /auth/nonce
 * ================
 * Step 1 of the login flow.
 *
 * The frontend calls this when a user clicks "Connect Wallet".
 * We generate a random nonce, save it to the database, and return it.
 * The user will sign this nonce with their wallet in the next step.
 *
 * Request body: { walletAddress: "0x..." }
 * Response:     { nonce: "random-string" }
 */
router.post("/nonce", async (req: Request, res: Response) => {
  const { walletAddress } = req.body;

  // Validate the wallet address format
  if (!walletAddress || typeof walletAddress !== "string" || !walletAddress.startsWith("0x")) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  // Generate a cryptographically secure random nonce (32 bytes = 64 hex chars)
  // This is the "one-time password" of Web3 login — fresh every time.
  const nonce = "0x" + randomBytes(32).toString("hex");

  // Upsert: create the user if they don't exist, or update their nonce if they do.
  // We use lowercase addresses for consistency (Ethereum addresses are case-insensitive
  // but checksum-encoded — storing lowercase avoids mismatch bugs).
  await prisma.user.upsert({
    where: { walletAddress: walletAddress.toLowerCase() },
    update: { nonce },
    create: {
      walletAddress: walletAddress.toLowerCase(),
      nonce,
    },
  });

  res.json({ nonce });
});

/**
 * POST /auth/verify
 * =================
 * Step 2 of the login flow.
 *
 * The frontend calls this after the user signs the nonce with their wallet.
 * We verify the signature cryptographically, then issue a JWT (JSON Web Token)
 * that the frontend can use for authenticated requests.
 *
 * Request body:
 *   {
 *     walletAddress: "0x...",
 *     signature: "0x...",      // The cryptographic signature from the wallet
 *     nonce: "0x..."           // The nonce we returned in step 1
 *   }
 *
 * Response:
 *   {
 *     token: "eyJhbG...",       // JWT — store this in localStorage / cookie
 *     user: { id, walletAddress, createdAt }
 *   }
 */
router.post("/verify", async (req: Request, res: Response) => {
  const { walletAddress, signature, nonce } = req.body;

  // ---- Input validation ----
  if (!walletAddress || !signature || !nonce) {
    res.status(400).json({ error: "Missing walletAddress, signature, or nonce" });
    return;
  }

  // ---- Look up the user and their stored nonce ----
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });

  if (!user) {
    res.status(401).json({ error: "User not found. Please request a nonce first." });
    return;
  }

  // Security check: the nonce in the request must match the one we stored.
  // If it doesn't match, this could be a replay attack (someone reusing an old signature).
  if (user.nonce !== nonce) {
    res.status(401).json({ error: "Invalid nonce. Please request a new one." });
    return;
  }

  // ---- Build the message that the user signed ----
  // The message format MUST exactly match what the frontend showed the user
  // in their wallet. If there's even a tiny difference (extra space, different
  // capitalization), signature verification will fail.
  const message = `Sign this message to authenticate with DeFi Staking Dashboard.\nNonce: ${nonce}`;

  // ---- Verify the signature using viem ----
  // viem's verifyMessage does the cryptographic math to recover the signer's
  // address from the signature. If the recovered address matches walletAddress,
  // we know the user truly owns that wallet.
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch (err) {
    console.error("Signature verification error:", err);
    res.status(400).json({ error: "Invalid signature format" });
    return;
  }

  if (!isValid) {
    res.status(401).json({ error: "Signature verification failed" });
    return;
  }

  // ---- Signature is valid — issue a JWT ----
  // A JWT is a signed token that contains the user's identity.
  // The frontend sends this token in the Authorization header on every request.
  // We sign it with JWT_SECRET so only our server can create valid tokens.
  const token = jwt.sign(
    { userId: user.id, walletAddress: user.walletAddress },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" } // Token expires after 7 days
  );

  // ---- Rotate (replace) the nonce ----
  // This is CRITICAL for security. After a successful login, we generate a
  // NEW nonce so the old signature can NEVER be used again. This prevents
  // replay attacks even if someone stole the old signature.
  const newNonce = "0x" + randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { nonce: newNonce },
  });

  res.json({
    token,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    },
  });
});

export default router;
