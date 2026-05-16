import hre from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deployment Script
 * =================
 * This script deploys the MockToken and StakingPool contracts,
 * funds the pool with reward tokens, and saves the contract info
 * so the frontend can interact with them.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network <network-name>
 *
 * Examples:
 *   npx hardhat run scripts/deploy.ts              (default in-memory network)
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 */

async function main() {
  // Get the deployer account (first account from Hardhat's list)
  // This account pays the gas fees for all deployments
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check deployer balance (useful for real networks)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ===================== 1. Deploy MockToken =====================
  console.log("1. Deploying MockToken...");

  // Initial supply: 1,000,000 tokens (Solidity uses 18 decimals by default,
  // so parseEther converts 1,000,000 → 1,000,000,000,000,000,000,000,000 wei)
  const initialSupply = hre.ethers.parseEther("1000000");

  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy("Mock Token", "MTK", initialSupply);
  await mockToken.waitForDeployment();

  const mockTokenAddress = await mockToken.getAddress();
  console.log("   MockToken deployed to:", mockTokenAddress);
  console.log("   Initial supply: 1,000,000 MTK\n");

  // ===================== 2. Deploy StakingPool =====================
  console.log("2. Deploying StakingPool...");

  // Reward rate: 1 token per second total pool reward (in wei)
  // This is split among all stakers proportionally to their stake
  const rewardRate = hre.ethers.parseEther("1");

  // Reward duration: 30 days (in seconds)
  // After this time, no new rewards accrue unless the owner extends it
  const rewardDuration = 30 * 24 * 60 * 60; // 2,592,000 seconds

  const StakingPool = await hre.ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(
    mockTokenAddress,
    rewardRate,
    rewardDuration
  );
  await stakingPool.waitForDeployment();

  const stakingPoolAddress = await stakingPool.getAddress();
  console.log("   StakingPool deployed to:", stakingPoolAddress);
  console.log("   Reward rate:", hre.ethers.formatEther(rewardRate), "tokens/sec (total pool)");
  console.log("   Reward duration:", rewardDuration, "seconds (30 days)\n");

  // ===================== 3. Fund StakingPool with reward tokens =====================
  console.log("3. Funding StakingPool with reward tokens...");

  // We'll send 500,000 tokens to the pool as the reward budget
  // These tokens will be paid out to stakers over time
  const rewardBudget = hre.ethers.parseEther("500000");

  // Approve the pool to spend deployer's tokens (required by ERC-20)
  const approveTx = await mockToken.approve(stakingPoolAddress, rewardBudget);
  await approveTx.wait();
  console.log("   Approved pool to spend", hre.ethers.formatEther(rewardBudget), "MTK");

  // Call fundRewards() to deposit the tokens into the pool
  const fundTx = await stakingPool.fundRewards(rewardBudget);
  await fundTx.wait();
  console.log("   Deposited", hre.ethers.formatEther(rewardBudget), "MTK into StakingPool\n");

  // Verify the pool actually received the tokens
  const poolBalance = await mockToken.balanceOf(stakingPoolAddress);
  console.log("   Pool token balance:", hre.ethers.formatEther(poolBalance), "MTK\n");

  // ===================== 4. Save contract info for frontend =====================
  console.log("4. Saving contract addresses and ABIs...");

  /**
   * What is an ABI?
   * ----------------
   * ABI stands for "Application Binary Interface".
   * Think of it as the API documentation for a smart contract, but in a
   * machine-readable JSON format.
   *
   * Just like an API tells your frontend what endpoints are available
   * (GET /users, POST /login, etc.), an ABI tells your frontend:
   *   - What functions the contract has (stake, withdraw, claimReward)
   *   - What arguments each function needs
   *   - What events the contract emits (Staked, Withdrawn, RewardsClaimed)
   *   - Whether a function reads data (view) or changes state (transaction)
   *
   * Ethers.js uses the ABI to know how to encode function calls into the
   * binary format that the Ethereum Virtual Machine (EVM) understands,
   * and how to decode the responses back into JavaScript values.
   *
   * Without the ABI, your frontend would have no idea how to talk to the contract!
   */

  // Read the compiled artifact files that Hardhat generated during compilation.
  // These JSON files contain the bytecode and ABI for each contract.
  const mockTokenArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/MockToken.sol/MockToken.json"),
      "utf8"
    )
  );

  const stakingPoolArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/StakingPool.sol/StakingPool.json"),
      "utf8"
    )
  );

  // Build the contract info object that the frontend will import
  const contractInfo = {
    // The network name helps the frontend know which network these contracts are on
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),

    contracts: {
      MockToken: {
        address: mockTokenAddress,
        // The ABI is extracted from the compiled artifact
        abi: mockTokenArtifact.abi,
      },
      StakingPool: {
        address: stakingPoolAddress,
        abi: stakingPoolArtifact.abi,
      },
    },
  };

  // Write the JSON file to the frontend src folder
  // This lets the React app import the addresses and ABIs directly
  const outputPath = path.join(__dirname, "../../frontend/src/contracts/contract-info.json");

  // Create the directory if it doesn't exist yet
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
  console.log("   Saved to:", outputPath);
  console.log("\n✅ Deployment complete!\n");

  // Print a nice summary table
  console.log("================== DEPLOYMENT SUMMARY ==================");
  console.log("Network:        ", hre.network.name);
  console.log("MockToken:      ", mockTokenAddress);
  console.log("StakingPool:    ", stakingPoolAddress);
  console.log("Reward Budget:  ", hre.ethers.formatEther(rewardBudget), "MTK");
  console.log("=======================================================\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("\n❌ Deployment failed:\n", error);
  process.exitCode = 1;
});
