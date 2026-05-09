// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import OpenZeppelin's standard ERC-20 implementation
// This gives us all the basic token functionality (transfer, balanceOf, approve, etc.)
// for free, so we don't have to write it from scratch.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Import Ownable so only the contract owner can call certain functions (like mint)
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @dev A simple ERC-20 token for testing the staking pool.
 *      Anyone can call mint() to get free tokens — perfect for testnets like Base Sepolia
 *      where you don't want to use real money.
 */
contract MockToken is ERC20, Ownable {

    /**
     * @dev Constructor runs once when the contract is deployed.
     * @param name     The full name of the token (e.g. "Mock Token")
     * @param symbol   The ticker symbol (e.g. "MTK")
     * @param initialSupply  How many tokens to create right away (in wei, so 1e18 = 1 token)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        // Mint the initial supply to the deployer (msg.sender)
        // internal _mint is provided by OpenZeppelin's ERC20
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint free tokens to any address.
     *      On a testnet this is super handy — users can just call mint() and get tokens
     *      to play with the staking pool without needing real ETH or going to a faucet.
     * @param to     Address that will receive the new tokens
     * @param amount Number of tokens to create (remember: 1 token = 1e18 wei)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
