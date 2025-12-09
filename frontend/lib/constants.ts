import { ethers } from "ethers";

// --- Contract Address Configuration ---

// 1. Define the interface for a contract set
export interface ContractAddresses {
  COMPANY_WALLET: string;
  MULTISIG_CONTROLLER: string;
}

// 2. Map of Chain ID to Contract Addresses (Using your deterministic addresses)
export const CHAIN_CONTRACT_ADDRESSES: { [chainId: number]: ContractAddresses } = {
  // Celo Mainnet
  42220: {
    COMPANY_WALLET: "0xe2FfA737dD82d0688CD1F563f6c53F0AE3E387F9",
    MULTISIG_CONTROLLER: "0xfBcD0dACa184481cFB59bf6EbF644465b788BD9C",
  },
  // Lisk Mainnet (Chain ID 1135)
  1135: {
    COMPANY_WALLET: "0xe2FfA737dD82d0688CD1F563f6c53F0AE3E387F9",
    MULTISIG_CONTROLLER: "0xfBcD0dACa184481cFB59bf6EbF644465b788BD9C",
  },
  // Base Mainnet (Chain ID 8453)
  8453: {
    COMPANY_WALLET: "0xe2FfA737dD82d0688CD1F563f6c53F0AE3E387F9",
    MULTISIG_CONTROLLER: "0xfBcD0dACa184481cFB59bf6EbF644465b788BD9C",
  },
  // Arbitrum One (Chain ID 42161)
  42161: {
    COMPANY_WALLET: "0xe2FfA737dD82d0688CD1F563f6c53F0AE3E387F9",
    MULTISIG_CONTROLLER: "0xfBcD0dACa184481cFB59bf6EbF644465b788BD9C",
  },
  // Optimism Mainnet (Chain ID 10)
  10: {
    COMPANY_WALLET: "0xe2FfA737dD82d0688CD1F563f6c53F0AE3E387F9",
    MULTISIG_CONTROLLER: "0xfBcD0dACa184481cFB59bf6EbF644465b788BD9C",
  },
} as const;


// --- Token Configuration (Chain-Specific) ---

// 3. Define the interface for a token
export interface Token {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
}

// 4. Map of Chain ID to an array of popular tokens on that chain
export const CHAIN_POPULAR_TOKENS: { [chainId: number]: readonly Token[] } = {
  // Base Mainnet (Chain ID 8453)
  8453: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "USD Coin",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
      symbol: "USDC",
      decimals: 6,
    },
    {
      name: "Tether USD",
      address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // Base Mainnet DAI
      symbol: "USDT",
      decimals: 6,
    },
  ],

  // Arbitrum One (Chain ID 42161)
  42161: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "USD Coin",
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum One USDC
      symbol: "USDC",
      decimals: 6,
    }, 
    {
      name: "Tether USD",
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Arbitrum One USDT
      symbol: "USDT",
      decimals: 6,
    }, 
  ],

  // Celo Mainnet (Chain ID 42220) - **Celo is the native token**
  42220: [
    {
      name: "Celo",
      address: ethers.ZeroAddress, // Native token
      symbol: "CELO",
      decimals: 18,
    },
    // Stablecoin on Celo Mainnet
    {
      name: "Celo Dollar",
      address: "0x765de816845861e75a25fca122bb6898b8b1282a", // Celo Mainnet cUSD
      symbol: "cUSD",
      decimals: 18,
    },
     {
      name: "Tether USD",
      address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", // Celo Mainnet cEUR
      symbol: "USDT",
      decimals: 6,
    },
  ],

  // Lisk Mainnet (Chain ID 1135)
  1135: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    // Placeholder for a main token on Lisk
    {
      name: "Lisk",
      address: "0xac485391EB2d7D88253a7F1eF18C37f4242D1A24", // Placeholder address
      symbol: "LSK",
      decimals: 18,
    },
    {
      name: "Tether USD",
      address: "0x05D032ac25d322df992303dCa074EE7392C117b9", // Placeholder address
      symbol: "USDT",
      decimals: 6,
    },
     {
      name: "USD Coin",
      address: "0xF242275d3a6527d877f2c927a82D9b057609cc71", // Placeholder address
      symbol: "USDC",
      decimals: 6,
    },
  ],

  // Optimism Mainnet (Chain ID 10)
  10: [
    {
      name: "Optimism",
      address: "0x4200000000000000000000000000000000000042", // Native token
      symbol: "OP",
      decimals: 18,
    },

    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "USD Coin",
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism Mainnet USDC
      symbol: "USDC",
      decimals: 6,
    }, 
    {
      name: "Tether USD",
      address: "0x01bFF41798a0BcF287b996046Ca68b395DbC1071", // Optimism Mainnet USDT
      symbol: "USDT",
      decimals: 6,
    }, 
  ],
} as const;


// Export a default/fallback state (e.g., UI initialization). 
// Components MUST now use web3Service.getPopularTokens() instead.
export const POPULAR_TOKENS = CHAIN_POPULAR_TOKENS[8453]; // **Default to Base Mainnet**

// Export a fallback for components that expect the old structure
export const CONTRACT_ADDRESSES = {
  COMPANY_WALLET: CHAIN_CONTRACT_ADDRESSES[8453].COMPANY_WALLET, // **Default to Base Mainnet**
  MULTISIG_CONTROLLER: CHAIN_CONTRACT_ADDRESSES[8453].MULTISIG_CONTROLLER, // **Default to Base Mainnet**
} as const;


// --- Other Configuration (Simplified/Cleaned up) ---

// Network configurations (These are mainly for reference; lib/networks.ts is the source of truth)
export const NETWORKS = {
  BASE: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
  },
} as const;

// Transaction status
export const TRANSACTION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  EXECUTED: "executed",
  FAILED: "failed",
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  DEFAULT_GAS_LIMIT: 300000,
  CONFIRMATION_BLOCKS: 2,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
} as const;