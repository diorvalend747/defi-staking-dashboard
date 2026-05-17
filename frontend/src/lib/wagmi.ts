import { createConfig, http } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

/**
 * ABI (Application Binary Interface)
 *
 * An ABI is a JSON description of a smart contract's interface. It tells the
 * frontend exactly which functions exist on the contract, what arguments they
 * expect, and what they return. Without the ABI, the app wouldn't know how to
 * encode function calls into the low-level bytecode that Ethereum nodes
 * understand, nor how to decode the responses back into readable data.
 *
 * Think of it as a "header file" or "API schema" for a deployed smart contract.
 */
import contractInfo from "@/contracts/contract-info.json"

/**
 * StakingPool contract configuration.
 *
 * We destructure the deployed address and ABI from the shared contract-info
 * JSON so that every component and hook references the same canonical source.
 */
export const stakingPoolContract = {
  address: contractInfo.contracts.StakingPool.address as `0x${string}`,
  abi: contractInfo.contracts.StakingPool.abi,
} as const

/**
 * Why we tell wagmi which blockchain network to talk to:
 *
 * A blockchain is a distributed network of nodes, and each network (Ethereum
 * mainnet, Base, Base Sepolia, etc.) is completely isolated. Wagmi needs to
 * know which network to target so that:
 *   1. RPC requests are sent to the correct node cluster.
 *   2. Transactions are signed for the right chain ID.
 *   3. The user's wallet knows which network to switch to.
 *   4. Contract addresses are validated against the correct network.
 *
 * Without specifying Base Sepolia here, wagmi would default to Ethereum mainnet
 * and all our contract calls would fail because the StakingPool contract only
 * exists on Base Sepolia.
 */
export const config = createConfig({
  // The blockchain network this application targets.
  chains: [baseSepolia],

  // How wagmi talks to the network. We use Alchemy's HTTP RPC endpoint
  // for reliable, fast access to Base Sepolia nodes.
  transports: {
    [baseSepolia.id]: http(
      `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
    ),
  },

  // Wallet connectors that users can choose from.
  connectors: [
    // Injected wallets (MetaMask, Coinbase Wallet extension, etc.)
    injected(),
    // WalletConnect v2 for mobile wallets and QR-code connections.
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "PLACEHOLDER_PROJECT_ID",
      metadata: {
        name: "DeFi Staking Dashboard",
        description: "Stake tokens and earn rewards on Base Sepolia",
        url: "https://localhost:3000",
        icons: ["https://localhost:3000/favicon.ico"],
      },
    }),
  ],

  // Synchronize the connected chain with the wallet state.
  syncConnectedChain: true,
})
