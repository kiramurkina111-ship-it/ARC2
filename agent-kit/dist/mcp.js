import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { AgentVaultClient } from "./client.js";
import { loadAgentKitConfig } from "./config.js";
loadEnv({ quiet: true });
const config = loadAgentKitConfig();
const vault = new AgentVaultClient(config);
const server = new McpServer({
    name: "paybound",
    version: "0.3.0"
});
server.registerTool("get_vault_status", {
    title: "Get agent vault status",
    description: "Read the active Paybound vault balance, spend limits, pause state, owner, agent signer, and remaining daily budget.",
    inputSchema: {}
}, async () => runTool(() => vault.getStatus()));
server.registerTool("check_recipient", {
    title: "Check recipient policy",
    description: "Check whether an address is allowed to receive automatic USDC payments from the vault.",
    inputSchema: {
        recipient: z.string().describe("EVM recipient address")
    }
}, async ({ recipient }) => runTool(() => vault.checkRecipient(recipient)));
server.registerTool("request_payment", {
    title: "Request agent payment",
    description: "Initiate a USDC payment. The vault executes it when policy passes or creates an onchain approval request when policy requires human review.",
    inputSchema: {
        recipient: z.string().describe("EVM address that should receive USDC"),
        amountUsdc: z.string().describe("Human-readable USDC amount, for example 0.42"),
        reason: z.string().min(3).describe("Why the agent needs to make this payment"),
        taskId: z.string().optional().describe("Optional external task identifier"),
        service: z.string().optional().describe("Optional service or vendor name")
    }
}, async (input) => runTool(() => vault.initiatePayment(input)));
server.registerTool("create_approval_request", {
    title: "Create payment approval request",
    description: "Always create an onchain payment request for human review, even when the payment might fit automatic policy.",
    inputSchema: {
        recipient: z.string().describe("EVM address that should receive USDC"),
        amountUsdc: z.string().describe("Human-readable USDC amount, for example 3.00"),
        reason: z.string().min(3).describe("Why the agent needs owner approval"),
        taskId: z.string().optional().describe("Optional external task identifier"),
        service: z.string().optional().describe("Optional service or vendor name")
    }
}, async (input) => runTool(() => vault.requestPayment(input)));
server.registerTool("get_payment_request", {
    title: "Get payment request",
    description: "Read recipient, amount, metadata hash, timestamps, and current status for an onchain request.",
    inputSchema: {
        requestId: z.union([z.string(), z.number().int().positive()]).describe("Onchain payment request ID")
    }
}, async ({ requestId }) => runTool(() => vault.getPaymentRequest(requestId)));
server.registerTool("cancel_payment_request", {
    title: "Cancel payment request",
    description: "Cancel a pending payment request as the configured agent signer.",
    inputSchema: {
        requestId: z.union([z.string(), z.number().int().positive()]).describe("Pending onchain payment request ID")
    }
}, async ({ requestId }) => runTool(() => vault.cancelPaymentRequest(requestId)));
server.registerResource("agent-vault-connection", "paybound://connection", {
    title: "Paybound connection",
    description: "Public network and vault connection details. Private keys are never exposed.",
    mimeType: "application/json"
}, async (uri) => ({
    contents: [
        {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
                chainId: config.chainId,
                rpcUrl: config.rpcUrl,
                explorerUrl: config.explorerUrl,
                vaultAddress: config.vaultAddress
            }, null, 2)
        }
    ]
}));
async function runTool(operation) {
    try {
        const result = await operation();
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: result
        };
    }
    catch (error) {
        const message = describeError(error);
        return {
            content: [{ type: "text", text: `Paybound error: ${message}` }],
            isError: true
        };
    }
}
function describeError(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Paybound MCP connected to ${config.vaultAddress} on chain ${config.chainId}`);
}
main().catch(error => {
    console.error("Paybound MCP failed to start:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=mcp.js.map