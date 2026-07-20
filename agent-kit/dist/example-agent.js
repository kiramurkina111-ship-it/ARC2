import { config as loadEnv } from "dotenv";
import { AgentVaultClient } from "./client.js";
import { loadAgentKitConfig } from "./config.js";
loadEnv({ quiet: true });
async function main() {
    const recipient = process.env.RECIPIENT_ADDRESS?.trim();
    if (!recipient)
        throw new Error("Set RECIPIENT_ADDRESS before running the example");
    const taskId = process.env.TASK_ID || "example-research-001";
    const taskTitle = process.env.TASK_TITLE || "German fintech lead research";
    const taskBrief = process.env.TASK_BRIEF ||
        "Find 25 fintech leads in Germany. Use approved vendors only, keep spend under 5 USDC, and return source links.";
    const amountUsdc = process.env.PAYMENT_AMOUNT_USDC || "0.42";
    const service = process.env.SERVICE_NAME || "Example Data Provider";
    const vault = new AgentVaultClient(loadAgentKitConfig());
    console.log("Agent task:", { taskId, taskTitle, taskBrief });
    const status = await vault.getStatus();
    console.log("Step 1 - vault status:", status);
    const recipientPolicy = await vault.checkRecipient(recipient);
    console.log("Step 2 - recipient policy:", recipientPolicy);
    const outcome = await vault.initiatePayment({
        recipient,
        amountUsdc,
        reason: process.env.PAYMENT_REASON || taskBrief,
        taskId,
        service
    });
    console.log("Step 3 - payment outcome:", outcome);
    console.log("Step 4 - result artifact:", {
        taskId,
        title: `${taskTitle} result`,
        summary: outcome.executed
            ? `${service} was paid ${amountUsdc} USDC and returned data linked to the payment metadata.`
            : `${service} spend requires owner review before the agent can receive the result.`,
    });
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=example-agent.js.map