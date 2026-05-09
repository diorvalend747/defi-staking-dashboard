import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

/**
 * Test suite for the StakingPool contract.
 *
 * We use `loadFixture` to deploy the contracts once, snapshot the blockchain state,
 * and reset back to that snapshot before each test. This makes tests fast and isolated.
 */
describe("StakingPool", function () {

  // ===================== FIXTURE =====================

  /**
   * deployStakingFixture
   * Deploys MockToken and StakingPool, then sets everything up for testing.
   * Returns all the objects and values our tests will need.
   */
  async function deployStakingFixture() {
    // Get test accounts from Hardhat's local network
    // accounts[0] = owner (deploys contracts, funds rewards)
    // accounts[1] = user1 (stakes tokens, earns rewards)
    // accounts[2] = user2 (used for isolation tests)
    const [owner, user1, user2] = await hre.ethers.getSigners();

    // --- Deploy MockToken ---
    // Total supply: 1,000,000 tokens (with 18 decimals)
    const initialSupply = hre.ethers.parseEther("1000000");
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy("Mock Token", "MTK", initialSupply);
    await mockToken.waitForDeployment();

    // --- Deploy StakingPool ---
    // Reward rate: 1 token per second total pool reward (in wei)
    // This is divided among all stakers proportionally.
    // Example: if you stake 1000 tokens and total staked is 1000, after 100 seconds you earn 100 tokens.
    const rewardRate = hre.ethers.parseEther("1"); // 1 * 10^18
    const rewardDuration = 365 * 24 * 60 * 60; // 1 year in seconds

    const StakingPool = await hre.ethers.getContractFactory("StakingPool");
    const stakingPool = await StakingPool.deploy(
      await mockToken.getAddress(),
      rewardRate,
      rewardDuration
    );
    await stakingPool.waitForDeployment();

    // --- Setup: give user1 some tokens to play with ---
    const userStakeAmount = hre.ethers.parseEther("1000"); // 1000 tokens
    // Mint 1000 tokens to user1
    await mockToken.connect(user1).mint(user1.address, userStakeAmount);

    // --- Setup: fund the pool with reward tokens ---
    // Owner transfers 500,000 tokens into the pool as reward budget
    const rewardBudget = hre.ethers.parseEther("500000");
    await mockToken.approve(await stakingPool.getAddress(), rewardBudget);
    await stakingPool.fundRewards(rewardBudget);

    // --- Setup: user1 approves the pool to pull their tokens ---
    // This is REQUIRED before staking — ERC-20 tokens need explicit approval
    await mockToken.connect(user1).approve(await stakingPool.getAddress(), userStakeAmount);

    return {
      mockToken,
      stakingPool,
      owner,
      user1,
      user2,
      userStakeAmount,
      rewardRate,
      rewardDuration,
      rewardBudget,
    };
  }

  // ===================== TESTS =====================

  describe("Staking", function () {
    it("1. User can stake MockToken successfully", async function () {
      // Load the pre-deployed fixture
      const { stakingPool, user1, userStakeAmount } = await loadFixture(deployStakingFixture);

      // Call stake() from user1's account
      const tx = await stakingPool.connect(user1).stake(userStakeAmount);

      // --- Verify the Staked event was emitted ---
      // This is how frontends know something happened on-chain
      await expect(tx)
        .to.emit(stakingPool, "Staked")
        .withArgs(user1.address, userStakeAmount);

      // --- Verify user's staked balance increased ---
      // `balances` is the mapping that tracks how much each user has staked
      const stakedBalance = await stakingPool.balances(user1.address);
      expect(stakedBalance).to.equal(userStakeAmount);

      // --- Verify total staked across all users ---
      const totalStaked = await stakingPool.totalStaked();
      expect(totalStaked).to.equal(userStakeAmount);
    });
  });

  describe("Rewards", function () {
    it("2. User's pending rewards increase over time", async function () {
      const { stakingPool, user1, userStakeAmount } = await loadFixture(deployStakingFixture);

      // Step 1: User stakes their tokens
      await stakingPool.connect(user1).stake(userStakeAmount);

      // Immediately after staking, no time has passed → no rewards yet
      const pendingBefore = await stakingPool.getPendingRewards(user1.address);
      expect(pendingBefore).to.equal(0);

      // Step 2: Fast-forward time by 100 seconds
      // In a real blockchain you'd have to wait. In Hardhat we can jump forward instantly.
      await time.increase(100);

      // Step 3: Check pending rewards again
      // With 1000 tokens staked (100% of pool) and rewardRate=1 token/sec total:
      //   rewards = 1000 * (1 / 1000) * 100 = 100 tokens
      const pendingAfter = await stakingPool.getPendingRewards(user1.address);

      // We expect ~100 tokens (in wei). Allow a tiny margin for block timestamp rounding.
      const expectedRewards = hre.ethers.parseEther("100");
      // Use `closeTo` because block timestamps can vary by 1-2 seconds
      expect(pendingAfter).to.be.closeTo(expectedRewards, hre.ethers.parseEther("2"));
    });

    it("3. User can claim rewards and receive tokens", async function () {
      const { mockToken, stakingPool, user1, userStakeAmount } = await loadFixture(
        deployStakingFixture
      );

      // Step 1: Stake tokens
      await stakingPool.connect(user1).stake(userStakeAmount);

      // Step 2: Advance time so rewards accumulate
      await time.increase(100);

      // Step 3: Record user's token balance BEFORE claiming
      const balanceBefore = await mockToken.balanceOf(user1.address);
      // User started with 1000 tokens but staked them all, so balance should be 0
      expect(balanceBefore).to.equal(0);

      // Step 4: Claim rewards
      const tx = await stakingPool.connect(user1).claimReward();

      // --- Verify the RewardsClaimed event ---
      // We use `anyValue` for the amount because of tiny timing differences
      await expect(tx).to.emit(stakingPool, "RewardsClaimed");

      // Step 5: Check user's token balance AFTER claiming
      const balanceAfter = await mockToken.balanceOf(user1.address);

      // Should have received ~100 reward tokens (not the original stake, just rewards)
      expect(balanceAfter).to.be.closeTo(
        hre.ethers.parseEther("100"),
        hre.ethers.parseEther("2")
      );

      // Step 6: Pending rewards should now be 0 (they were just claimed)
      const pendingAfterClaim = await stakingPool.getPendingRewards(user1.address);
      expect(pendingAfterClaim).to.equal(0);
    });
  });

  describe("Withdrawals", function () {
    it("4. User can withdraw their original stake", async function () {
      const { mockToken, stakingPool, user1, userStakeAmount } = await loadFixture(
        deployStakingFixture
      );

      // Step 1: Stake tokens
      await stakingPool.connect(user1).stake(userStakeAmount);

      // Step 2: Record balances before withdrawal
      const userBalanceBefore = await mockToken.balanceOf(user1.address);
      expect(userBalanceBefore).to.equal(0); // All 1000 tokens were staked

      const poolBalanceBefore = await mockToken.balanceOf(await stakingPool.getAddress());
      // Pool has: rewardBudget (500,000) + userStakeAmount (1000)
      expect(poolBalanceBefore).to.be.gte(userStakeAmount);

      // Step 3: Withdraw the full staked amount
      const tx = await stakingPool.connect(user1).withdraw(userStakeAmount);

      // --- Verify the Withdrawn event ---
      await expect(tx)
        .to.emit(stakingPool, "Withdrawn")
        .withArgs(user1.address, userStakeAmount);

      // Step 4: Verify user's token balance is restored
      const userBalanceAfter = await mockToken.balanceOf(user1.address);
      expect(userBalanceAfter).to.equal(userStakeAmount);

      // Step 5: Verify user's staked balance is now 0
      const stakedBalance = await stakingPool.balances(user1.address);
      expect(stakedBalance).to.equal(0);

      // Step 6: Verify totalStaked decreased
      const totalStaked = await stakingPool.totalStaked();
      expect(totalStaked).to.equal(0);
    });
  });

  describe("Contract Balance Tracking", function () {
    it("5. Contract balance updates correctly after each action", async function () {
      const { mockToken, stakingPool, user1, userStakeAmount, rewardBudget } =
        await loadFixture(deployStakingFixture);

      const poolAddress = await stakingPool.getAddress();

      // --- Starting state: pool only has reward budget ---
      const balanceStart = await mockToken.balanceOf(poolAddress);
      expect(balanceStart).to.equal(rewardBudget);

      // --- Action 1: User stakes 1000 tokens ---
      await stakingPool.connect(user1).stake(userStakeAmount);

      const balanceAfterStake = await mockToken.balanceOf(poolAddress);
      // Pool now has: rewardBudget + staked tokens
      expect(balanceAfterStake).to.equal(rewardBudget + userStakeAmount);

      // --- Action 2: Advance time & claim rewards ---
      await time.increase(100);
      await stakingPool.connect(user1).claimReward();

      const balanceAfterClaim = await mockToken.balanceOf(poolAddress);
      // Pool balance went DOWN by the reward amount sent to user
      // It should now be approximately: rewardBudget + stake - ~100 rewards
      expect(balanceAfterClaim).to.be.closeTo(
        rewardBudget + userStakeAmount - hre.ethers.parseEther("100"),
        hre.ethers.parseEther("2")
      );

      // --- Action 3: User withdraws their stake ---
      await stakingPool.connect(user1).withdraw(userStakeAmount);

      const balanceAfterWithdraw = await mockToken.balanceOf(poolAddress);
      // Pool gave back the 1000 staked tokens, so now it only has:
      // rewardBudget - claimedRewards
      expect(balanceAfterWithdraw).to.be.closeTo(
        rewardBudget - hre.ethers.parseEther("100"),
        hre.ethers.parseEther("2")
      );
    });
  });
});
