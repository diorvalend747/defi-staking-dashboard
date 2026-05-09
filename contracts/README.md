# DeFi Staking Dashboard — Smart Contracts

This folder contains the Hardhat TypeScript project for the DeFi Staking Dashboard smart contracts.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Alchemy API key and private key
```

- **ALCHEMY_API_KEY** — Get a free key at [alchemy.com](https://www.alchemy.com/)
- **PRIVATE_KEY** — Your wallet's private key (keep this secret!)
- Need test ETH? Use the [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)

---

## 🖥️ Running a Local Test Network

Start a local Ethereum network on your machine:

```bash
npx hardhat node
```

This will:
- Start a local blockchain at `http://127.0.0.1:8545`
- Create 20 test accounts pre-funded with 10,000 fake ETH each
- Display the private keys of all test accounts

Keep this terminal running! In a **new terminal**, you can then:

```bash
# Deploy to the local network
npx hardhat run scripts/deploy.ts --network localhost

# Run tests against the local network
npx hardhat test --network localhost
```

> 💡 **Tip:** The local network resets every time you restart `npx hardhat node`. For persistent local testing, use the in-memory Hardhat Network (default) instead.

---

## 🧪 Running Tests

Run the test suite using Hardhat's built-in network:

```bash
npx hardhat test
```

This uses an in-memory blockchain that is created and destroyed automatically for each test run — fast and clean!

---

## 📦 Compiling Contracts

```bash
npx hardhat compile
```

This will:
- Compile all `.sol` files in the `contracts/` folder
- Auto-generate TypeScript type definitions in `typechain-types/`

---

## 🌐 Deploying to Base Sepolia Testnet

Make sure your `.env` file is set up, then:

```bash
npx hardhat run scripts/deploy.ts --network base-sepolia
```

Your contract will be deployed to the Base Sepolia testnet. You can view it on [Base Sepolia Explorer](https://sepolia.basescan.org/).

---

## 📁 Project Structure

```
contracts/
├── contracts/          # Solidity smart contracts
├── test/               # Test files (TypeScript)
├── ignition/           # Hardhat Ignition deployment modules
├── typechain-types/    # Auto-generated TypeScript contract types
├── hardhat.config.ts   # Hardhat configuration (networks, compiler, etc.)
├── .env.example        # Example environment variables
└── tsconfig.json       # TypeScript configuration
```

---

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `npx hardhat node` | Start a local Ethereum network |
| `npx hardhat test` | Run tests |
| `npx hardhat compile` | Compile contracts |
| `npx hardhat run scripts/deploy.ts --network localhost` | Deploy to local network |
| `npx hardhat run scripts/deploy.ts --network base-sepolia` | Deploy to Base Sepolia |
| `npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS>` | Verify contract on explorer |

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it contains your private key!
- The `.gitignore` already ignores `.env`, `node_modules/`, and other sensitive files.
- Only use the `PRIVATE_KEY` for testnet wallets with fake ETH.

---

Happy building! 🛠️
