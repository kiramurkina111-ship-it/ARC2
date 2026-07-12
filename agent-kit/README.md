# Paybound Agent Kit

The Paybound Agent Kit lets an AI agent read and use an existing AgentVault on Arc Testnet.

It includes:

- a typed `AgentVaultClient` SDK;
- a local MCP server over stdio;
- an executable payment example;
- safe environment-based signer configuration.

No new contract deployment is required. The current AgentVault already supports agent-initiated payments and approval requests.

## Requirements

- Node.js 20.11 or newer;
- an existing AgentVault on Arc Testnet;
- the private key for the address assigned as the vault's `agent` signer;
- Arc Testnet USDC in the vault.

## Install

```bash
cd agent-kit
npm install
```

Create a local environment file from `.env.example` and fill in:

```txt
VAULT_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...
```

The address derived from `AGENT_PRIVATE_KEY` must equal the vault's configured `agent` address, or the owner address for owner-operated testing.

Never place this private key in `web/`, Vercel environment variables used by the static frontend, GitHub, screenshots, or an MCP configuration file.

## Build And Check

```bash
npm run typecheck
npm run build
```

Before connecting an MCP client, run the read-only readiness check:

```bash
npm run doctor
```

The doctor checks the environment, RPC chain, vault contract, signer authorization, pause state, vault balance,
spend limits, and signer gas balance. It never submits a transaction or prints the private key.

With the environment variables loaded, run a read-only MCP round-trip check:

```bash
npm run smoke:mcp
```

## Run The Example Agent Flow

Add an approved vendor or recipient address to `.env`:

```txt
RECIPIENT_ADDRESS=0x...
PAYMENT_AMOUNT_USDC=0.42
PAYMENT_REASON=Buy data for the research task
```

Then run:

```bash
npm run example
```

The example:

1. reads vault balance and policy;
2. checks the vendor/recipient allowlist;
3. calls `initiatePayment`;
4. reports whether the payment executed or entered the approval queue;
5. prints the Arcscan transaction URL.

## Connect The MCP Server

Build the package first:

```bash
npm run build
```

Use `mcp-config.example.json` as a template. Replace both paths with absolute paths on your machine. The MCP process loads secrets from `agent-kit/.env`; the private key does not need to appear in the client configuration.

Available tools:

| Tool | Purpose |
| --- | --- |
| `get_vault_status` | Read balance, limits, signer authorization, pause state, and daily budget. |
| `check_recipient` | Check whether an address is allowed for automatic payment. |
| `request_payment` | Execute policy-safe spend or create an approval request. |
| `create_approval_request` | Always create a human approval request. |
| `get_payment_request` | Read the current onchain request status. |
| `cancel_payment_request` | Cancel a pending request as agent or owner. |

The server also exposes the public `paybound://connection` resource with chain, RPC, explorer, and vault address.

## Security Model

- The browser never receives the agent private key.
- The MCP server checks that its signer is the vault owner or configured agent before sending a transaction.
- Contract policy remains the final enforcement layer.
- Payments outside policy become onchain approval requests.
- MCP tool errors are returned to the model without printing secrets.
- stdio is local and process-spawned; it does not open a network port.

For production, move signing into a managed wallet, HSM, or isolated signer service instead of a long-lived plaintext private key.
