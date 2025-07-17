// Contract addresses (replace with your actual deployed contract addresses)
export const CONTRACT_ADDRESSES = {
  COMPANY_WALLET: "0x3540C2C5CbdFf2e2309195C581f3d4960D5BFd7a",
  MULTISIG_CONTROLLER: "0x8AA9a0e65352532076dbc09a4D745B7FAA33745B",
} as const

// Popular token addresses on Ethereum mainnet
export const POPULAR_TOKENS = [
 
  {
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    symbol: "cUSD",
    decimals: 18,
  },
  {
    name: "Celo Euro",
    address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    symbol: "cEUR",
    decimals: 18,
  },
  {
    name: "Celo",
    address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    symbol: "CELO",
    decimals: 18,
  },
  
  {
    name: "Celo Alfajores",
    symbol: "CELO",
    address: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
    decimals: 18,
  },
] as const

// Network configurations
export const NETWORKS = {
  ALFAJORES: {
    chainId: 44787,
    name: "Alfajores Testnet",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
  },
  MAINNET: {
    chainId: 42220,
    name: "Celo Mainnet",
    rpcUrl: "https://forno.celo.org",
  },
} as const
