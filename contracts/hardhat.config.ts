import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Load environment variables from .env file
// This lets you keep sensitive info (like API keys and private keys) out of your code
import * as dotenv from "dotenv";
dotenv.config();

// Read environment variables (or use empty strings as fallback)
// NEVER commit your .env file to git — it contains secrets!
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

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

  // Etherscan verification settings
  // Lets you verify contracts on Base Sepolia explorer automatically
  etherscan: {
    apiKey: {
      "base-sepolia": "PLACEHOLDER_STRING", // Base Sepolia doesn't need a real API key for verification
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

  // TypeChain configuration — auto-generates TypeScript types from your contracts
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
