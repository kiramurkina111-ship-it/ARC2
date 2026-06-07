export const agentVaultFactoryAbi = [
  {
    type: "constructor",
    inputs: [{ name: "usdc_", type: "address" }],
  },
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "maxSpendPerTx", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
    ],
    outputs: [{ name: "vault", type: "address" }],
  },
  {
    type: "function",
    name: "vaultsOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "maxSpendPerTx", type: "uint256", indexed: false },
      { name: "dailyLimit", type: "uint256", indexed: false },
    ],
  },
] as const;
