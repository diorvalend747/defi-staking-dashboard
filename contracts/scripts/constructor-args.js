// This file tells Hardhat what constructor arguments were used when the contract was deployed.
// You need this when verifying a contract that takes constructor inputs.
//
// Usage:
//   npx hardhat verify --constructor-args scripts/constructor-args.js <CONTRACT_ADDRESS> --network base-sepolia

module.exports = [
  // Arguments for MockToken constructor:
  // constructor(string name, string symbol, uint256 initialSupply)
  "Mock Token",                          // name
  "MTK",                                 // symbol
  "1000000000000000000000000",           // initialSupply (1,000,000 tokens in wei)

  // Arguments for StakingPool constructor:
  // constructor(address _stakingToken, uint256 _rewardRate, uint256 _rewardDuration)
  // "0x...",                            // _stakingToken (MockToken address)
  // "1000000000000000000",              // _rewardRate (1 token/sec in wei)
  // "2592000",                          // _rewardDuration (30 days in seconds)
];

// ⚠️ IMPORTANT: Only use the arguments for the specific contract you're verifying.
// Create separate files if you need to verify multiple contracts with different args.
