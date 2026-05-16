import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Explicitly import the verification plugin so it's registered with Hardhat.
// This adds the `npx hardhat verify` command.
import "@nomicfoundation/hardhat-verify";

// Load environment variables from .env file
// This lets you keep sensitive info (like API keys and private keys) out of your code
import * as dotenv from "dotenv";
dotenv.config();

// Read environment variables (or use empty strings as fallback)
// NEVER commit your .env file to git — it contains secrets!
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// Basescan API key — required for automated contract verification
// Get one free at: https://basescan.org/register (use the same account for sepolia.basescan.org)
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

// Choose the best available RPC endpoint for Base Sepolia:
// 1. Alchemy (fastest, most reliable) — requires ALCHEMY_API_KEY in .env
// 2. Public RPC (free, no signup) — works fine for testnet, just slower
const baseSepoliaRpc =
  ALCHEMY_API_KEY !== ""
    ? `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : "https://sepolia.base.org";

const config: HardhatUserConfig = {
  // Solidity compiler version
  // Hardhat will download and use this automatically
  solidity: "0.8.28",

  // Network configurations
  networks: {
    // Hardhat built-in local network (default)
    // Runs in-memory, perfect for quick testing
    hardhat: {
      chainId: 31337, // Hardhat's default local chain ID
    },

    // Base Sepolia testnet configuration
    // We use the name "baseSepolia" because hardhat-verify already knows
    // the explorer URLs for this network (chainId 84532).
    baseSepolia: {
      url: baseSepoliaRpc,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },

  // Etherscan / Basescan verification settings
  // This is what lets you run `npx hardhat verify` and automatically
  // publish your source code to sepolia.basescan.org
  etherscan: {
    // Use a single string API key to trigger V2 mode.
    // The plugin will automatically route to the correct explorer
    // based on the network's chain ID.
    apiKey: BASESCAN_API_KEY,
  },

  // TypeChain configuration — auto-generates TypeScript types from your contracts
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  sourcify: {
    enabled: true,
  },
};

export default config;
