import { getAddress, isAddress } from "ethers";

export interface AgentKitConfig {
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  vaultAddress: string;
  agentPrivateKey: string;
}

export function loadAgentKitConfig(env: NodeJS.ProcessEnv = process.env): AgentKitConfig {
  const rpcUrl = env.ARC_RPC?.trim() || "https://rpc.testnet.arc.network";
  const chainId = Number(env.ARC_CHAIN_ID || 5042002);
  const explorerUrl = env.ARC_EXPLORER?.trim() || "https://testnet.arcscan.app";
  const vaultAddress = env.VAULT_ADDRESS?.trim() || "";
  const agentPrivateKey = env.AGENT_PRIVATE_KEY?.trim() || "";

  if (!isAddress(vaultAddress)) {
    throw new Error("VAULT_ADDRESS must be a valid 0x address");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(agentPrivateKey)) {
    throw new Error("AGENT_PRIVATE_KEY must be a 32-byte hex private key prefixed with 0x");
  }
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("ARC_CHAIN_ID must be a positive integer");
  }

  return {
    rpcUrl,
    chainId,
    explorerUrl: explorerUrl.replace(/\/$/, ""),
    vaultAddress: getAddress(vaultAddress),
    agentPrivateKey
  };
}
