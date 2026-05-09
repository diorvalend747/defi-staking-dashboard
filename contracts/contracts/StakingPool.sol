// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin's ReentrancyGuard protects against reentrancy attacks.
// A reentrancy attack is when a malicious contract calls back into your contract
// before the first call finishes, potentially draining funds.
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// IERC20 is the interface (blueprint) for any ERC-20 token.
// We only need the interface here because the actual token code lives in MockToken.sol.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// SafeERC20 adds extra safety checks when interacting with ERC-20 tokens
// (some older tokens don't return a boolean on transfer, which can cause bugs).
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Ownable lets us restrict certain functions (like funding rewards) to the contract owner.
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingPool
 * @dev Users stake MockToken and earn more MockToken as rewards over time.
 *      The longer you stake, the more rewards you accumulate.
 *      The owner must deposit reward tokens into the pool so there are tokens to pay out.
 */
contract StakingPool is ReentrancyGuard, Ownable {

    // Tell Solidity to use SafeERC20 for all IERC20 operations
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    // The ERC-20 token users will stake and also receive as rewards.
    // We store it as an interface so this contract can call .transfer(), .balanceOf(), etc.
    IERC20 public stakingToken;

    // Reward rate: how many tokens (in wei) are rewarded per second per token staked.
    // Example: if rewardRate = 1e15 (0.001 tokens/sec) and you stake 1000 tokens,
    // you earn 1 token per second.
    uint256 public rewardRate;

    // When the reward period ends. After this timestamp, no new rewards accrue.
    uint256 public rewardEndTime;

    // Last time the contract updated its reward calculations.
    // We use this to figure out how much time has passed since the last update.
    uint256 public lastUpdateTime;

    // Accumulated reward per token staked, scaled by 1e18 to avoid fractions.
    // Think of it like a "scoreboard" that tracks how much reward each staked token has earned.
    uint256 public rewardPerTokenStored;

    // ============ Mappings ============

    // Tracks how much reward each user has already been "paid" (per token).
    // This prevents double-paying someone when they claim multiple times.
    mapping(address => uint256) public userRewardPerTokenPaid;

    // Tracks how many rewards each user has earned but not yet claimed.
    mapping(address => uint256) public rewards;

    // Tracks how many tokens each user has currently staked in the pool.
    mapping(address => uint256) public balances;

    // Total tokens staked across ALL users.
    uint256 public totalStaked;

    // ============ Events ============
    // Events are cheap logs on the blockchain that frontends (like your React app)
    // can listen to and update the UI in real time.

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardFunded(uint256 amount);

    // ============ Constructor ============

    /**
     * @dev Deploy the staking pool.
     * @param _stakingToken  Address of the ERC-20 token users will stake
     * @param _rewardRate    Tokens rewarded per second per staked token (in wei)
     * @param _rewardDuration How many seconds the reward period will last
     */
    constructor(
        address _stakingToken,
        uint256 _rewardRate,
        uint256 _rewardDuration
    ) Ownable(msg.sender) {
        require(_stakingToken != address(0), "StakingPool: token address cannot be zero");
        require(_rewardRate > 0, "StakingPool: reward rate must be > 0");
        require(_rewardDuration > 0, "StakingPool: duration must be > 0");

        stakingToken = IERC20(_stakingToken);
        rewardRate = _rewardRate;
        rewardEndTime = block.timestamp + _rewardDuration;
        lastUpdateTime = block.timestamp;
    }

    // ============ Modifiers ============

    /**
     * @dev This modifier runs BEFORE the function body.
     *      It updates the global reward bookkeeping so rewards are calculated
     *      up to the current moment before anything else happens.
     */
    modifier updateReward(address _account) {
        // Update the global reward-per-token value
        rewardPerTokenStored = rewardPerToken();
        // Record that we just updated everything to this moment in time
        lastUpdateTime = lastTimeRewardApplicable();

        // If we're updating for a specific user, calculate what they earned
        // since their last update and reset their tracking values.
        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _; // Continue executing the rest of the function
    }

    // ============ View Functions ============

    /**
     * @dev Returns the most recent timestamp that rewards should be calculated up to.
     *      If the reward period has ended, we cap it at rewardEndTime.
     *      Otherwise we use the current block time.
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < rewardEndTime ? block.timestamp : rewardEndTime;
    }

    /**
     * @dev Calculates the total reward earned per staked token since the contract started.
     *      This is a global value — it doesn't depend on any specific user.
     *      We multiply by 1e18 to keep precision (Solidity doesn't have decimals).
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            // If nobody has staked yet, don't change the stored value.
            // This prevents the global reward from inflating before anyone joins.
            return rewardPerTokenStored;
        }

        // Time elapsed since last update
        uint256 timeElapsed = lastTimeRewardApplicable() - lastUpdateTime;

        // New reward per token = old reward + (rewardRate * timeElapsed)
        // We scale by 1e18 to maintain precision, then divide later when calculating earnings.
        return rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalStaked);
    }

    /**
     * @dev Returns how many reward tokens a specific user has earned so far.
     * @param _account The user address to check
     */
    function earned(address _account) public view returns (uint256) {
        // Formula: balance * (current global reward per token - user's paid-up-to reward per token)
        // This gives the "unpaid" portion of rewards for this user.
        return
            (balances[_account] * (rewardPerToken() - userRewardPerTokenPaid[_account])) /
            1e18 +
            rewards[_account];
    }

    /**
     * @dev Convenience function for frontends — returns pending rewards for a user.
     * @param _user The address to check
     */
    function getPendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }

    // ============ External Functions ============

    /**
     * @dev Stake tokens into the pool to start earning rewards.
     *      You must call `approve()` on the token contract first,
     *      giving this StakingPool permission to pull your tokens.
     * @param _amount How many tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "StakingPool: cannot stake 0");
        require(block.timestamp < rewardEndTime, "StakingPool: reward period ended");

        // Update user's balance and total staked
        totalStaked += _amount;
        balances[msg.sender] += _amount;

        // Pull tokens from the user into this contract
        // safeTransferFrom will revert if the transfer fails
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Withdraw your staked tokens from the pool.
     *      Your unclaimed rewards stay in the contract — call claimReward() to get them.
     * @param _amount How many tokens to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "StakingPool: cannot withdraw 0");
        require(balances[msg.sender] >= _amount, "StakingPool: insufficient balance");

        // Update balances BEFORE sending tokens (checks-effects-interactions pattern)
        totalStaked -= _amount;
        balances[msg.sender] -= _amount;

        // Send tokens back to the user
        stakingToken.safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev Claim all your accumulated reward tokens.
     *      This does NOT withdraw your staked principal — use withdraw() for that.
     */
    function claimReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "StakingPool: no rewards to claim");

        // Reset their pending rewards BEFORE transferring (prevents reentrancy)
        rewards[msg.sender] = 0;

        // Send reward tokens to the user
        stakingToken.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @dev Convenience function: withdraw everything (staked + rewards) in one call.
     */
    function exit() external nonReentrant updateReward(msg.sender) {
        uint256 stakedAmount = balances[msg.sender];
        uint256 reward = rewards[msg.sender];

        require(stakedAmount > 0 || reward > 0, "StakingPool: nothing to exit");

        // Update balances BEFORE external calls (checks-effects-interactions)
        totalStaked -= stakedAmount;
        balances[msg.sender] = 0;
        rewards[msg.sender] = 0;

        // Send staked tokens back
        if (stakedAmount > 0) {
            stakingToken.safeTransfer(msg.sender, stakedAmount);
            emit Withdrawn(msg.sender, stakedAmount);
        }

        // Send reward tokens
        if (reward > 0) {
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // ============ Owner Functions ============

    /**
     * @dev Owner deposits reward tokens into the pool so users can be paid.
     *      The owner must have approved this contract to spend their tokens first.
     * @param _amount How many reward tokens to deposit
     */
    function fundRewards(uint256 _amount) external onlyOwner {
        require(_amount > 0, "StakingPool: cannot fund 0");

        // Pull reward tokens from the owner into this contract
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit RewardFunded(_amount);
    }

    /**
     * @dev Owner can extend the reward period.
     * @param _additionalDuration Seconds to add to the current rewardEndTime
     */
    function extendRewardPeriod(uint256 _additionalDuration) external onlyOwner {
        require(_additionalDuration > 0, "StakingPool: must add time");
        rewardEndTime += _additionalDuration;
    }

    /**
     * @dev Owner can update the reward rate.
     * @param _newRate New reward rate (tokens per second per staked token, in wei)
     */
    function setRewardRate(uint256 _newRate) external onlyOwner updateReward(address(0)) {
        require(_newRate > 0, "StakingPool: rate must be > 0");
        rewardRate = _newRate;
    }
}
