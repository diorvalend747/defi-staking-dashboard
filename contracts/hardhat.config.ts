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
    // This is where you deploy and test with fake ETH
    "base-sepolia": {
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      chainId: 84532, // Base Sepolia chain ID
    },
  },

  // Etherscan / Basescan verification settings
  // This is what lets you run `npx hardhat verify` and automatically
  // publish your source code to sepolia.basescan.org
  etherscan: {
    apiKey: {
      // You MUST provide a real Basescan API key for verification to work.
      // "PLACEHOLDER_STRING" will fail — replace it in your .env file.
      // Sign up free at: https://basescan.org/register
      "base-sepolia": BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },

  // Sourcify is a free, open-source alternative to Etherscan/Basescan.
  // It does NOT require an API key — great for testnets!
  // You can use it by adding `--via-sourcify` to your verify command.
  sourcify: {
    enabled: true,
  },

  // TypeChain configuration — auto-generates TypeScript types from your contracts
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
