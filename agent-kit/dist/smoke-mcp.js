import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const serverPath = fileURLToPath(new URL("./mcp.js", import.meta.url));
const requiredEnv = ["ARC_RPC", "ARC_CHAIN_ID", "ARC_EXPLORER", "VAULT_ADDRESS", "AGENT_PRIVATE_KEY"];
const env = {};
for (const name of requiredEnv) {
    const value = process.env[name];
    if (!value)
        throw new Error(`${name} is required for the MCP smoke test`);
    env[name] = value;
}
const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env
});
const client = new Client({ name: "agent-vault-smoke-test", version: "0.3.0" });
try {
    await client.connect(transport);
    const tools = await client.listTools();
    const status = await client.callTool({ name: "get_vault_status", arguments: {} });
    console.log(JSON.stringify({
        toolNames: tools.tools.map(tool => tool.name),
        vaultStatus: status.structuredContent
    }, null, 2));
}
finally {
    await client.close();
}
//# sourceMappingURL=smoke-mcp.js.map