import { config as loadEnv } from "dotenv";
import { formatEther } from "ethers";
import { AgentVaultClient } from "./client.js";
import { loadAgentKitConfig } from "./config.js";

loadEnv({ quiet: true });

type CheckLevel = "PASS" | "WARN" | "FAIL";

interface DoctorCheck {
  level: CheckLevel;
  label: string;
  detail: string;
}

const checks: DoctorCheck[] = [];

function record(level: CheckLevel, label: string, detail: string): void {
  checks.push({ level, label, detail });
}

async function runDoctor(): Promise<void> {
  console.log("Paybound Agent Doctor\n");

  let config;
  try {
    config = loadAgentKitConfig();
    record("PASS", "Environment", "Vault address and agent private key are valid");
  } catch (error) {
    record("FAIL", "Environment", describeError(error));
    printReport();
    process.exitCode = 1;
    return;
  }

  const client = new AgentVaultClient(config);

  try {
    const network = await client.provider.getNetwork();
    const actualChainId = Number(network.chainId);
    if (actualChainId === config.chainId) {
      record("PASS", "RPC network", `Connected to Arc Testnet chain ${actualChainId}`);
    } else {
      record("FAIL", "RPC network", `Connected to chain ${actualChainId}; expected ${config.chainId}`);
    }
  } catch (error) {
    record("FAIL", "RPC network", describeError(error));
    printReport();
    process.exitCode = 1;
    return;
  }

  try {
    const code = await client.provider.getCode(config.vaultAddress);
    if (code === "0x") {
      record("FAIL", "Vault contract", `No contract found at ${config.vaultAddress}`);
      printReport();
      process.exitCode = 1;
      return;
    }
    record("PASS", "Vault contract", config.vaultAddress);
  } catch (error) {
    record("FAIL", "Vault contract", describeError(error));
    printReport();
    process.exitCode = 1;
    return;
  }

  try {
    const status = await client.getStatus();
    record(
      status.signerAuthorized ? "PASS" : "FAIL",
      "Agent signer",
      status.signerAuthorized
        ? `${status.connectedSigner} is authorized`
        : `${status.connectedSigner} is neither owner ${status.owner} nor agent ${status.agent}`
    );
    record(status.paused ? "FAIL" : "PASS", "Vault state", status.paused ? "Vault is paused" : "Vault is live");
    record(
      Number(status.balanceUsdc) > 0 ? "PASS" : "WARN",
      "Vault balance",
      `${status.balanceUsdc} USDC available in the vault`
    );
    record(
      Number(status.maxSpendPerTxUsdc) > 0 && Number(status.dailyLimitUsdc) > 0 ? "PASS" : "WARN",
      "Spend policy",
      `${status.maxSpendPerTxUsdc} USDC per action; ${status.dailyLimitUsdc} USDC daily`
    );

    const nativeBalance = await client.provider.getBalance(status.connectedSigner);
    record(
      nativeBalance > 0n ? "PASS" : "WARN",
      "Signer gas balance",
      `${formatEther(nativeBalance)} native USDC on Arc Testnet`
    );
  } catch (error) {
    record("FAIL", "Vault reads", describeError(error));
  }

  printReport();
  if (checks.some(check => check.level === "FAIL")) process.exitCode = 1;
}

function printReport(): void {
  for (const check of checks) {
    console.log(`[${check.level}] ${check.label}`);
    console.log(`       ${check.detail}`);
  }

  const passed = checks.filter(check => check.level === "PASS").length;
  const warnings = checks.filter(check => check.level === "WARN").length;
  const failed = checks.filter(check => check.level === "FAIL").length;
  console.log(`\nResult: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  if (failed === 0) console.log("Paybound is ready for a read-only MCP connection check.");
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

runDoctor().catch(error => {
  console.error(`Paybound doctor failed: ${describeError(error)}`);
  process.exitCode = 1;
});
