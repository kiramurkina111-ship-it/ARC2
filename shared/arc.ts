export const ARC_TESTNET = {
  id: 5042002,
  chainIdHex: "0x4cef52",
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
} as const;

export const ARC_TESTNET_USDC = {
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6,
  symbol: "USDC",
} as const;

export const ARC_FEE_POLICY = {
  minMaxFeePerGasGwei: 20,
  suggestedPriorityFeePerGasGwei: 1,
} as const;
