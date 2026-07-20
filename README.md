# Paybound

An Arc-native financial control plane for AI agents.

The first version focuses on one primitive: a user gives an agent a USDC budget on Arc Testnet, then the agent can spend only inside user-defined policy.

## Product Scope

- Create an agent vault
- Create and switch between multiple agent vaults
- Fund it with USDC
- Deposit and withdraw funds from an existing vault
- Delete a vault after its balance reaches zero
- Set an agent signer
- Define approved vendors
- Set max spend per transaction
- Set a daily spend limit
- Execute policy-approved payments
- Route risky payments through human approval
- Review pending approval requests in the app
- Approve, reject, or cancel risky spend requests
- Use `initiatePayment` to execute safe payments or queue approval requests
- Keep a readable agent spending trail with vendor context, metadata hashes, and transaction hashes

## Arc Testnet

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- USDC ERC-20: `0x3600000000000000000000000000000000000000`
- USDC ERC-20 decimals: `6`

Arc uses USDC as native gas with 18-decimal accounting, while the ERC-20 interface uses 6 decimals. Application-level USDC amounts in this project use the ERC-20 interface and 6-decimal units.

## Structure

```txt
contracts/
  AgentVault.sol
  AgentVaultFactory.sol
shared/
  arc.ts
  agentVaultAbi.ts
  agentVaultFactoryAbi.ts
agent-kit/
  src/client.ts
  src/mcp.ts
  src/example-agent.ts
web/
  index.html
  vault.html
  styles.css
  app.js
  home.js
```

## Run The UI

Open `web/index.html` in a browser. It is the product landing page.

Open `web/vault.html` for the full application workspace. It keeps multiple vaults, vault setup, vendor policy, payment testing, approval inbox, and the activity trail on one page.

The app includes a first-run guided tour and a persistent `How to use` launcher.

The app can run in two modes:

- **Arc onchain mode** after a wallet is connected and an `AgentVaultFactory` address is saved in the Network panel.
- **Local preview mode** only on `localhost` or `file://` for development. Public deployments always use the Arc onchain flow.

In onchain mode the UI calls:

- `AgentVaultFactory.createVault`
- `AgentVaultFactory.vaultsOf`
- `AgentVault.setAgent`
- `AgentVault.setPolicy`
- `AgentVault.setRecipientAllowed`
- `IERC20.approve`
- `AgentVault.deposit`
- `AgentVault.withdraw`
- `AgentVault.initiatePayment`
- `AgentVault.pause` / `AgentVault.unpause`

The local activity trail stores UI-side transaction notes and links hashes to Arcscan. Onchain vaults cannot be deleted in v0.1; withdraw funds to zero and leave the vault inactive.

## v0.2

The second version adds a real approval queue for risky agent spend:

- read `nextRequestId` and recent `paymentRequests` from the active vault
- show pending and closed requests in the app
- approve requests through `approveRequest`
- reject requests through `rejectRequest`
- cancel requests through `cancelRequest`
- keep the request outcome visible in the activity trail

This turns policy failures into a usable human-in-the-loop workflow instead of a dead end.

## v0.2.1 UX Hardening

- hide the factory address behind advanced network settings
- show an empty onchain state instead of falling back to a preview vault
- explain the three core roles: owner, agent signer, vendor
- support vendor names next to payment addresses
- show wallet USDC balance beside vault balance
- add a guided risky-payment demo that creates an approval request

## v0.3 Agent Connection Kit

v0.3 connects an actual AI agent to an existing vault without changing the deployed contracts.

- typed `AgentVaultClient` SDK for Arc Testnet;
- local MCP server using the official production v1 TypeScript SDK;
- tools for status, vendor address checks, payments, approval requests, request status, and cancellation;
- example agent payment flow;
- frontend-generated environment and MCP configuration;
- guided five-step agent connection wizard and launch readiness checklist;
- `npm run doctor` for read-only RPC, contract, signer, balance, and policy diagnostics;
- wallet, submitted, confirmed, and failed transaction states with actionable errors;
- private keys remain outside the browser and Vercel frontend.

See `agent-kit/README.md` and `AGENT_CONNECTION_GUIDE.md`.

## v0.4 Vendor Payments

v0.4 turns the payment test harness into a clearer agent work scenario without changing the deployed contracts.

- approved payment addresses are presented as vendors with category, guide price, SLA, and expected result;
- the Vendor workspace lets a user build an agent job from an approved service provider;
- suggested demo vendors can prefill the policy form during local preview;
- the policy engine previews whether a vendor payment will execute or require approval;
- the approval inbox shows vendor name, agent reason, policy reason, amount, and metadata hash;
- the activity trail records vendor payment results and owner decisions in readable language;
- cache-busting was bumped to `v=0.4.1` for Vercel deployments.

No new onchain deployment is required for v0.4.

## v0.5 Agent Task Execution

v0.5 turns Paybound from a payment console into a task execution surface. The contract deployment stays the same.

- new Agent task runner on the app page;
- task brief, task budget, and active task status;
- step-by-step execution timeline: task created, budget checked, vendor selected, policy checked, result or approval;
- task flow prepares the existing vendor payment form instead of hiding the payment primitive;
- local preview can complete the task and show a readable result artifact;
- onchain vaults stop at `Ready to submit`, so the user still confirms the real Arc transaction through the wallet;
- Agent Kit example now describes a full task-and-payment flow;
- cache-busting was bumped to `v=0.5.1` for Vercel deployments.

Polish pass in `v=0.5.1`:

- task launch checklist item;
- clearer task status labels;
- explicit `Submit prepared payment` handoff into the Payments section;
- richer result artifact with vendor, spend, policy, and metadata hash receipt.

No new onchain deployment is required for v0.5. Reuse the existing factory and vault contracts.

## Launch Flow

1. Deploy `AgentVaultFactory` through Remix using `ONCHAIN_LAUNCH_GUIDE.md`.
2. Open `web/vault.html`.
3. Connect a wallet on Arc Testnet.
4. Use the prefilled `AgentVaultFactory` address, or paste a new one into the Network panel and click `Save factory`.
5. Use `New`, `Deposit USDC`, `Update policy`, and `Run policy check` from the frontend.

Default Arc Testnet factory:

```txt
0xF6b1B036942364dAabe62c833700414fd77d948D
```

## Deploy To Vercel

This repo includes `vercel.json`, so it can be deployed from the repository root.

Recommended settings:

```txt
Framework Preset: Other
Root Directory: .
Build Command: empty
Output Directory: empty
Install Command: empty
```

Routes:

```txt
/          -> web/index.html
/vault.html -> web/vault.html
/assets/*   -> web/assets/*
```
