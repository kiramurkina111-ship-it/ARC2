import { config as loadEnv } from "dotenv";
import { AgentVaultClient } from "./client.js";
import { loadAgentKitConfig } from "./config.js";

loadEnv({ quiet: true });

async function main(): Promise<void> {
  const recipient = process.env.RECIPIENT_ADDRESS?.trim();
  if (!recipient) throw new Error("Set RECIPIENT_ADDRESS before running the example");

  const vault = new AgentVaultClient(loadAgentKitConfig());
  const status = await vault.getStatus();
  console.log("Vault status:", status);

  const recipientPolicy = await vault.checkRecipient(recipient);
  console.log("Recipient policy:", recipientPolicy);

  const outcome = await vault.initiatePayment({
    recipient,
    amountUsdc: process.env.PAYMENT_AMOUNT_USDC || "0.42",
    reason: process.env.PAYMENT_REASON || "Buy data for the research task",
    taskId: process.env.TASK_ID || "example-research-001",
    service: process.env.SERVICE_NAME || "Example Data Provider"
  });

  console.log("Payment outcome:", outcome);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
