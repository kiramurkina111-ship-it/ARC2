import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

const ARC_TESTNET = {
  chainIdHex: "0x4cef52",
  chainId: 5042002,
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  currency: { name: "USDC", symbol: "USDC", decimals: 18 },
};

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const DEFAULT_FACTORY_ADDRESS = "0xF6b1B036942364dAabe62c833700414fd77d948D";
const USDC_DECIMALS = 6;
const STORAGE_KEY = "arc-agent-vault-onchain-state";
const LEGACY_STORAGE_KEY = "arc-agent-vault-state";
const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const FACTORY_ABI = [
  "function createVault(address agent,uint256 maxSpendPerTx,uint256 dailyLimit) returns (address)",
  "function vaultsOf(address owner) view returns (address[])",
  "event VaultCreated(address indexed owner,address indexed vault,address indexed agent,uint256 maxSpendPerTx,uint256 dailyLimit)",
];

const VAULT_ABI = [
  "function agent() view returns (address)",
  "function maxSpendPerTx() view returns (uint256)",
  "function dailyLimit() view returns (uint256)",
  "function spentToday() view returns (uint256)",
  "function currentDay() view returns (uint256)",
  "function availableToday() view returns (uint256)",
  "function paused() view returns (bool)",
  "function balance() view returns (uint256)",
  "function nextRequestId() view returns (uint256)",
  "function paymentRequests(uint256 requestId) view returns (address recipient,uint256 amount,bytes32 metadataHash,uint8 status,uint64 createdAt,uint64 decidedAt)",
  "function setAgent(address newAgent)",
  "function setPolicy(uint256 maxSpendPerTx,uint256 dailyLimit)",
  "function setRecipientAllowed(address recipient,bool allowed)",
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function initiatePayment(address recipient,uint256 amount,bytes32 metadataHash) returns (uint256 requestId,bool executed)",
  "function approveRequest(uint256 requestId)",
  "function rejectRequest(uint256 requestId)",
  "function cancelRequest(uint256 requestId)",
  "function pause()",
  "function unpause()",
  "event Deposited(address indexed from,uint256 amount)",
  "event Withdrawn(address indexed to,uint256 amount)",
  "event PolicyChanged(uint256 maxSpendPerTx,uint256 dailyLimit)",
  "event RecipientPolicyChanged(address indexed recipient,bool allowed)",
  "event PaymentExecuted(address indexed recipient,uint256 amount,bytes32 metadataHash)",
  "event PaymentRequested(uint256 indexed requestId,address indexed recipient,uint256 amount,bytes32 metadataHash)",
  "event PaymentApproved(uint256 indexed requestId,address indexed owner)",
  "event PaymentRejected(uint256 indexed requestId,address indexed owner)",
  "event PaymentCancelled(uint256 indexed requestId,address indexed caller)",
  "event Paused(address indexed caller)",
  "event Unpaused(address indexed caller)",
];

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

const DEFAULT_VENDOR_CATALOG = [
  {
    name: "Verified Data API",
    address: "Verified Data API",
    category: "Data",
    price: 0.42,
    description: "Buys enriched company records for the active research task.",
    result: "42 verified fintech leads with source links.",
    sla: "sub-second",
  },
  {
    name: "KYC Risk Check",
    address: "KYC Risk Check",
    category: "Compliance",
    price: 0.3,
    description: "Checks vendor reputation and sanctions risk before spend.",
    result: "Risk score, allow/deny signal, and signed review note.",
    sla: "2 sec",
  },
  {
    name: "Compute Inference Node",
    address: "Compute Inference Node",
    category: "Compute",
    price: 0.18,
    description: "Runs a small model inference job for lead scoring.",
    result: "Ranked lead list with confidence scores.",
    sla: "3 sec",
  },
  {
    name: "Premium Market Dataset",
    address: "Premium Market Dataset",
    category: "Dataset",
    price: 2.4,
    description: "Higher-value source that should require owner approval.",
    result: "Paid dataset receipt and normalized rows.",
    sla: "5 sec",
  },
];

const DEFAULT_SIM_VAULTS = [
  {
    id: "vault-research",
    source: "simulation",
    agentName: "Research Operator",
    agentSigner: "0x9A7b...A31f",
    balance: 25,
    maxSpend: 2,
    dailyLimit: 15,
    spentToday: 3.3,
    availableToday: 11.7,
    recipients: DEFAULT_VENDOR_CATALOG.slice(0, 2),
    paused: false,
    pendingRequests: [],
    activity: [
      {
        title: "Vault funded",
        detail: "25.00 USDC deposited on Arc Testnet preview",
        hash: "local",
        state: "ok",
        time: "20:12",
      },
    ],
  },
];

const EMPTY_VAULT = {
  id: "empty",
  source: "empty",
  address: "",
  agentName: "New Agent Vault",
  agentSigner: "unassigned",
  balance: 0,
  maxSpend: 1,
  dailyLimit: 5,
  spentToday: 0,
  availableToday: 5,
  recipients: [],
  paused: false,
  pendingRequests: [],
  activity: [],
};

const DEFAULT_AGENT_TASK = {
  id: "task-default",
  status: "idle",
  title: "German fintech lead research",
  brief: "Find 25 fintech leads in Germany. Use approved vendors only, keep spend under 5 USDC, and return source links.",
  budget: 5,
  vendorAddress: "",
  amount: 0,
  timeline: [],
  result: null,
};

const TOUR_STEPS = [
  {
    target: '[data-tour="vault-switcher"]',
    title: "Start with a vault",
    text: "A Paybound vault is the agent's USDC work budget on Arc. Each vault has its own signer, policy, and trail.",
  },
  {
    target: '[data-tour="wallet"]',
    title: "Connect the owner",
    text: "The owner wallet funds the vault, edits limits, withdraws unused USDC, and approves risky spend.",
  },
  {
    target: '[data-tour="summary"]',
    title: "Confirm the budget",
    text: "The summary keeps the active vault, policy state, and pending approvals visible before the agent spends.",
  },
  {
    target: '[data-tour="policy"]',
    title: "Set policy",
    text: "Assign the agent signer, set spend limits, and approve the vendors the agent is allowed to pay.",
  },
  {
    target: '[data-tour="vendors"]',
    title: "Build a vendor job",
    text: "Pick an approved vendor to create the agent's spend request with amount, reason, and expected result.",
  },
  {
    target: '[data-tour="tasks"]',
    title: "Run an agent task",
    text: "Give the agent a concrete job. Paybound shows budget checks, vendor selection, policy decisions, and the result artifact.",
  },
  {
    target: '[data-tour="treasury"]',
    title: "Fund the vault",
    text: "Deposit USDC before the agent can spend. The app submits approve and deposit transactions for the active vault.",
  },
  {
    target: '[data-tour="agent-connect"]',
    title: "Connect the agent",
    text: "Copy the vault environment and MCP configuration, then keep the agent signer private key in the local agent process.",
  },
  {
    target: '[data-tour="payments"]',
    title: "Let policy decide",
    text: "Safe vendor payments execute. Spend above policy becomes a reviewable approval request.",
  },
  {
    target: '[data-tour="approvals"]',
    title: "Review risky spend",
    text: "The owner can approve, reject, or cancel a risky agent payment without leaving the workspace.",
  },
  {
    target: '[data-tour="trail"]',
    title: "Read the trail",
    text: "The trail explains what the agent tried to buy, how policy decided, and which Arc transaction or request records it.",
  },
];

const $ = (id) => document.getElementById(id);
const state = loadState();
let provider = null;
let signer = null;

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function localPreviewAllowed() {
  return window.location.protocol === "file:" || LOCAL_PREVIEW_HOSTS.has(window.location.hostname);
}

function loadState() {
  const stored = readJson(STORAGE_KEY);
  if (stored) return normalizeState(stored);

  const legacy = readJson(LEGACY_STORAGE_KEY);
  if (legacy && Array.isArray(legacy.vaults)) {
    return normalizeState({
      vaults: legacy.vaults.map((vault) => ({ ...vault, source: "simulation" })),
      activeVaultId: legacy.activeVaultId,
      connectedAccount: legacy.connectedAccount,
      tourSeen: legacy.tourSeen,
    });
  }

  return normalizeState({});
}

function readJson(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function normalizeState(stored) {
  const storedVaults = Array.isArray(stored.vaults) ? stored.vaults : [];
  const availableVaults = localPreviewAllowed()
    ? storedVaults.length > 0
      ? storedVaults
      : clone(DEFAULT_SIM_VAULTS)
    : storedVaults.filter((vault) => vault?.source === "onchain");
  const next = {
    connectedAccount: stored.connectedAccount || null,
    factoryAddress: stored.factoryAddress || DEFAULT_FACTORY_ADDRESS,
    walletUsdcBalance: Number(stored.walletUsdcBalance || 0),
    activeVaultId: stored.activeVaultId || "",
    fullLogOpen: Boolean(stored.fullLogOpen),
    logPage: Number(stored.logPage || 1),
    tourSeen: Boolean(stored.tourSeen),
    tourOpen: Boolean(stored.tourOpen),
    tourIndex: Number(stored.tourIndex || 0),
    agentWizardStep: Math.min(Math.max(Number(stored.agentWizardStep || 0), 0), 4),
    agentSetup: {
      envCopied: Boolean(stored.agentSetup?.envCopied),
      mcpCopied: Boolean(stored.agentSetup?.mcpCopied),
      doctorCopied: Boolean(stored.agentSetup?.doctorCopied),
    },
    activeTask: normalizeTask(stored.activeTask),
    transaction: null,
    confirm: null,
    busy: false,
    vaultMetadata: stored.vaultMetadata || {},
    vaults: availableVaults,
  };

  next.vaults = next.vaults.map(normalizeVault);
  if (!next.vaults.some((vault) => vault.id === next.activeVaultId)) {
    next.activeVaultId = next.vaults[0]?.id || "";
  }
  return next;
}

function normalizeVault(vault) {
  return {
    id: vault.id || createVaultId(),
    source: vault.source || "simulation",
    address: vault.address || "",
    agentName: vault.agentName || "Agent Vault",
    agentSigner: vault.agentSigner || "unassigned",
    balance: Number(vault.balance || 0),
    maxSpend: Number(vault.maxSpend || 0),
    dailyLimit: Number(vault.dailyLimit || 0),
    spentToday: Number(vault.spentToday || 0),
    availableToday: Number(vault.availableToday ?? Math.max(Number(vault.dailyLimit || 0) - Number(vault.spentToday || 0), 0)),
    recipients: Array.isArray(vault.recipients) ? vault.recipients.map(normalizeRecipient) : [],
    paused: Boolean(vault.paused),
    pendingRequests: Array.isArray(vault.pendingRequests) ? vault.pendingRequests.map(normalizeRequest) : [],
    activity: Array.isArray(vault.activity) ? vault.activity : [],
  };
}

function normalizeRecipient(recipient) {
  if (typeof recipient === "string") {
    const vendor = findCatalogVendor(recipient);
    return {
      name: vendor?.name || (ethers.isAddress(recipient) ? shortHash(recipient) : recipient),
      address: recipient,
      category: vendor?.category || "Service",
      price: Number(vendor?.price || 0.42),
      description: vendor?.description || "Approved service provider.",
      result: vendor?.result || "Service result returned to the agent.",
      sla: vendor?.sla || "live",
    };
  }

  const address = recipient?.address || recipient?.value || "";
  const vendor = findCatalogVendor(address) || findCatalogVendor(recipient?.name);
  return {
    name: recipient?.name || vendor?.name || (ethers.isAddress(address) ? shortHash(address) : address || "Unnamed vendor"),
    address,
    category: recipient?.category || vendor?.category || "Service",
    price: Number(recipient?.price ?? vendor?.price ?? 0.42),
    description: recipient?.description || vendor?.description || "Approved service provider.",
    result: recipient?.result || vendor?.result || "Service result returned to the agent.",
    sla: recipient?.sla || vendor?.sla || "live",
  };
}

function normalizeRequest(request) {
  return {
    id: String(request.id || request.requestId || ""),
    recipient: request.recipient || "",
    amount: Number(request.amount || 0),
    metadataHash: request.metadataHash || "",
    reason: request.reason || "",
    policyReason: request.policyReason || "",
    vendorName: request.vendorName || "",
    status: Number(request.status || 0),
    createdAt: Number(request.createdAt || 0),
    decidedAt: Number(request.decidedAt || 0),
  };
}

function normalizeTask(task = {}) {
  return {
    id: task.id || `task-${Date.now().toString(36)}`,
    status: task.status || "idle",
    title: task.title || DEFAULT_AGENT_TASK.title,
    brief: task.brief || DEFAULT_AGENT_TASK.brief,
    budget: Number(task.budget || DEFAULT_AGENT_TASK.budget),
    vendorAddress: task.vendorAddress || "",
    amount: Number(task.amount || 0),
    timeline: Array.isArray(task.timeline) ? task.timeline.map(normalizeTaskStep) : [],
    result: task.result || null,
    createdAt: task.createdAt || "",
    updatedAt: task.updatedAt || "",
  };
}

function normalizeTaskStep(step = {}) {
  return {
    title: step.title || "Task step",
    detail: step.detail || "",
    state: step.state || "pending",
    time: step.time || nowLabel(),
  };
}

function findCatalogVendor(value = "") {
  const needle = String(value).toLowerCase();
  return DEFAULT_VENDOR_CATALOG.find(
    (vendor) => vendor.address.toLowerCase() === needle || vendor.name.toLowerCase() === needle,
  );
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeVault() {
  if (!Array.isArray(state.vaults) || state.vaults.length === 0) return clone(EMPTY_VAULT);

  let vault = state.vaults.find((item) => item.id === state.activeVaultId);
  if (!vault) {
    vault = state.vaults[0];
    state.activeVaultId = vault.id;
  }
  return vault;
}

function hasActiveVault() {
  return Array.isArray(state.vaults) && state.vaults.length > 0 && activeVault().source !== "empty";
}

function activeMetadata() {
  const vault = activeVault();
  if (!isOnchainVault(vault)) return null;

  const key = vault.address.toLowerCase();
  state.vaultMetadata[key] ||= {};
  return state.vaultMetadata[key];
}

function syncActiveMetadata() {
  const vault = activeVault();
  const meta = activeMetadata();
  if (!meta) return;

  meta.agentName = vault.agentName;
  meta.recipients = vault.recipients;
  meta.activity = vault.activity;
  meta.pendingRequests = vault.pendingRequests;
}

function createVaultId() {
  return `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function isOnchainVault(vault = activeVault()) {
  return vault.source === "onchain" && ethers.isAddress(vault.address || "");
}

function hasFactory() {
  return ethers.isAddress(state.factoryAddress || "");
}

function isWalletReady() {
  return Boolean(state.connectedAccount && hasFactory());
}

function formatUsdc(value) {
  return Number(value || 0).toFixed(2);
}

function toUnits(value) {
  return ethers.parseUnits(String(Number(value || 0)), USDC_DECIMALS);
}

function fromUnits(value) {
  return Number(ethers.formatUnits(value || 0n, USDC_DECIMALS));
}

function nowLabel() {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function metadataHash(payload) {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  if (!globalThis.crypto?.subtle) return ethers.id(JSON.stringify(payload));

  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return `0x${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function shortHash(hash) {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function explorerTx(hash) {
  return `${ARC_TESTNET.explorerUrl}/tx/${hash}`;
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function setValue(id, value) {
  const element = $(id);
  if (element) element.value = value ?? "";
}

function addActivity(item) {
  const vault = activeVault();
  vault.activity = [{ time: nowLabel(), ...item }, ...vault.activity].slice(0, 100);
  syncActiveMetadata();
  saveState();
  render();
}

function renderRecipients() {
  const select = $("paymentRecipient");
  const list = $("recipientList");
  const vault = activeVault();

  if (select) {
    select.innerHTML = "";
    vault.recipients.forEach((recipient) => {
      const normalized = normalizeRecipient(recipient);
      const option = document.createElement("option");
      option.value = normalized.address;
      option.textContent = recipientDisplay(normalized);
      select.appendChild(option);
    });
  }

  if (list) {
    list.innerHTML = "";
    if (vault.recipients.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-state";
      empty.textContent = "No approved vendors yet. Add a service address before the agent can pay.";
      list.appendChild(empty);
      return;
    }

    vault.recipients.forEach((recipient) => {
      const normalized = normalizeRecipient(recipient);
      const chip = document.createElement("div");
      chip.className = "recipient-chip";

      const label = document.createElement("span");
      label.textContent = recipientDisplay(normalized);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "x";
      remove.title = `Remove ${recipientDisplay(normalized)}`;
      remove.dataset.recipient = normalized.address;

      chip.append(label, remove);
      list.appendChild(chip);
    });
  }
}

function renderVendorDesk() {
  const grid = $("vendorGrid");
  const suggested = $("suggestedVendorGrid");
  if (!grid || !suggested) return;

  const vault = activeVault();
  const vendors = activeVendors(vault);
  const recommendations = localPreviewAllowed() ? suggestedVendors(vault) : [];
  grid.innerHTML = "";
  suggested.innerHTML = "";

  setText("vendorCount", `${vendors.length} approved`);
  setText(
    "vendorSpendHint",
    vendors.length ? `${formatUsdc(totalVendorGuidePrice(vendors))} USDC guide basket` : "Approve a service first",
  );

  if (vendors.length === 0) {
    const empty = document.createElement("article");
    empty.className = "vendor-card empty-vendor";
    empty.innerHTML =
      '<span class="empty-state">No approved vendors yet. Add a real service provider address in Spend policy, then build the first agent job here.</span>';
    grid.appendChild(empty);
  } else {
    vendors.forEach((vendor) => grid.appendChild(createVendorCard(vendor, true)));
  }

  recommendations.forEach((vendor) => suggested.appendChild(createVendorCard(vendor, false)));
  if (recommendations.length === 0) {
    const empty = document.createElement("article");
    empty.className = "vendor-card empty-vendor";
    empty.innerHTML = localPreviewAllowed()
      ? '<span class="empty-state">All suggested demo vendors are already approved.</span>'
      : '<span class="empty-state">Suggested demo vendors are hidden on public deploys. Use a real 0x service address on Arc Testnet.</span>';
    suggested.appendChild(empty);
  }
}

function createVendorCard(vendor, approved) {
  const card = document.createElement("article");
  card.className = `vendor-card${approved ? " approved" : ""}`;
  card.dataset.vendorAddress = vendor.address;

  const heading = document.createElement("div");
  heading.className = "vendor-heading";
  const title = document.createElement("strong");
  title.textContent = vendor.name;
  const badge = document.createElement("span");
  badge.textContent = approved ? "Approved" : "Suggested";
  heading.append(title, badge);

  const meta = document.createElement("div");
  meta.className = "vendor-meta";
  meta.innerHTML = `<span>${vendor.category}</span><span>${formatUsdc(vendor.price)} USDC</span><span>${vendor.sla}</span>`;

  const description = document.createElement("p");
  description.textContent = vendor.description;

  const result = document.createElement("small");
  result.textContent = vendor.result;

  const actions = document.createElement("div");
  actions.className = "vendor-actions";

  if (approved) {
    const use = document.createElement("button");
    use.type = "button";
    use.className = "secondary-button";
    use.textContent = "Build job";
    use.dataset.vendorAction = "use";
    use.dataset.vendorAddress = vendor.address;
    actions.appendChild(use);
  } else {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "small-button";
    add.textContent = "Fill policy";
    add.dataset.vendorAction = "fill";
    add.dataset.vendorAddress = vendor.address;
    actions.appendChild(add);
  }

  card.append(heading, meta, description, result, actions);
  return card;
}

function totalVendorGuidePrice(vendors) {
  return vendors.reduce((sum, vendor) => sum + Number(vendor.price || 0), 0);
}

function renderPaymentPreview() {
  const vault = activeVault();
  const recipient = $("paymentRecipient")?.value || activeVendors(vault)[0]?.address || "";
  const amount = Number($("paymentAmount")?.value || 0);
  const vendor = recipient ? vendorForAddress(vault, recipient) : null;
  const policy = recipient && amount > 0 ? evaluatePaymentPolicy(vault, recipient, amount) : null;

  setText("selectedVendorName", vendor?.name || "No vendor selected");
  setText("selectedVendorPrice", vendor ? `${formatUsdc(vendor.price)} USDC guide price` : "Choose an approved vendor");
  setText("selectedVendorResult", vendor?.result || "The agent result will appear in the audit trail after execution.");
  setText("policyOutcome", policy ? (policy.allowed ? "Will execute" : "Needs approval") : "Waiting for job");
  setText("policyReason", policy?.reason || "Select a vendor and amount to preview the policy decision.");

  const stack = $("policyCheckStack");
  if (!stack) return;
  stack.innerHTML = "";

  const checks = policy?.checks || [
    { label: "Vendor approved", ok: false },
    { label: "Per-action limit", ok: false },
    { label: "Daily budget", ok: false },
    { label: "Vault balance", ok: false },
  ];

  checks.forEach((check) => {
    const item = document.createElement("div");
    item.className = `policy-check ${check.ok ? "ok" : "warn"}`;
    const label = document.createElement("span");
    label.textContent = check.label;
    const value = document.createElement("strong");
    value.textContent = check.ok ? "Pass" : check.fail || "Pending";
    item.append(label, value);
    stack.appendChild(item);
  });
}

function recipientDisplay(recipient) {
  const normalized = normalizeRecipient(recipient);
  if (ethers.isAddress(normalized.address)) {
    return `${normalized.name} · ${shortHash(normalized.address)}`;
  }
  return normalized.name || normalized.address;
}

function recipientAllowed(vault, address) {
  return (vault.recipients || []).some(
    (recipient) => normalizeRecipient(recipient).address.toLowerCase() === String(address).toLowerCase(),
  );
}

function vendorForAddress(vault, address) {
  const normalizedAddress = String(address || "").toLowerCase();
  const vendor = (vault.recipients || [])
    .map(normalizeRecipient)
    .find((recipient) => recipient.address.toLowerCase() === normalizedAddress);
  return vendor || findCatalogVendor(address) || normalizeRecipient(address);
}

function activeVendors(vault = activeVault()) {
  return (vault.recipients || []).map(normalizeRecipient);
}

function suggestedVendors(vault = activeVault()) {
  const approved = new Set(activeVendors(vault).map((vendor) => vendor.address.toLowerCase()));
  return DEFAULT_VENDOR_CATALOG.filter((vendor) => !approved.has(vendor.address.toLowerCase()));
}

function evaluatePaymentPolicy(vault, recipient, amount) {
  const checks = [
    {
      key: "paused",
      label: "Vault active",
      ok: !vault.paused,
      fail: "Vault is paused",
    },
    {
      key: "recipient",
      label: "Vendor approved",
      ok: recipientAllowed(vault, recipient),
      fail: "Vendor is not on the allowlist",
    },
    {
      key: "maxSpend",
      label: "Per-action limit",
      ok: Number(amount) <= Number(vault.maxSpend || 0),
      fail: `Above ${formatUsdc(vault.maxSpend)} USDC per-action limit`,
    },
    {
      key: "daily",
      label: "Daily budget",
      ok: Number(amount) <= Number(vault.availableToday ?? Math.max(vault.dailyLimit - vault.spentToday, 0)),
      fail: "Above today's remaining budget",
    },
    {
      key: "balance",
      label: "Vault balance",
      ok: Number(amount) <= Number(vault.balance || 0),
      fail: "Vault balance is too low",
    },
  ];

  return {
    checks,
    allowed: checks.every((check) => check.ok),
    reason: checks.find((check) => !check.ok)?.fail || "All policy checks passed",
  };
}

function taskStep(title, detail, state = "ok") {
  return { title, detail, state, time: nowLabel() };
}

function selectedTaskVendor(vault = activeVault()) {
  const task = state.activeTask;
  const vendors = activeVendors(vault);
  if (task.vendorAddress) {
    const vendor = vendors.find((item) => item.address.toLowerCase() === task.vendorAddress.toLowerCase());
    if (vendor) return vendor;
  }
  return vendors[0] || null;
}

function renderTaskRunner() {
  const task = state.activeTask;
  const vault = activeVault();
  const vendor = selectedTaskVendor(vault);
  const timeline = $("taskTimeline");
  const artifact = $("taskArtifact");
  if (!timeline || !artifact) return;

  setText("taskStatus", task.status === "idle" ? "Ready for task" : taskStatusLabel(task.status));
  setText("taskActiveTitle", task.status === "idle" ? "No active task" : task.title);
  setText("taskBudgetLabel", `${formatUsdc(task.budget)} USDC task budget`);
  setText("taskVendorLabel", vendor ? vendor.name : "No approved vendor");
  setText("taskSpendLabel", task.amount > 0 ? `${formatUsdc(task.amount)} USDC planned spend` : "No spend prepared");

  const submitButton = $("submitPreparedPayment");
  if (submitButton) {
    submitButton.disabled = task.status !== "ready_to_submit" || state.busy;
    submitButton.textContent = task.status === "ready_to_submit" ? "Submit prepared payment" : "Prepare onchain submit";
  }

  timeline.innerHTML = "";
  if (task.timeline.length === 0) {
    const empty = document.createElement("article");
    empty.className = "task-step empty-task-step";
    empty.innerHTML = '<span class="empty-state">No task running yet. Start with the demo brief or write your own agent task.</span>';
    timeline.appendChild(empty);
  } else {
    task.timeline.forEach((step, index) => {
      const row = document.createElement("article");
      row.className = `task-step ${step.state}`;
      const indexEl = document.createElement("span");
      indexEl.className = "task-step-index";
      indexEl.textContent = String(index + 1).padStart(2, "0");
      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = step.title;
      const detail = document.createElement("p");
      detail.textContent = step.detail;
      body.append(title, detail);
      const time = document.createElement("small");
      time.textContent = step.time;
      row.append(indexEl, body, time);
      timeline.appendChild(row);
    });
  }

  artifact.innerHTML = "";
  if (!task.result) {
    const emptyCopy =
      task.status === "ready_to_submit"
        ? "The task is prepared for Arc Testnet. Confirm the payment in the Payments section to create the onchain trail."
        : task.status === "approval_needed"
          ? "The task is waiting for owner approval before the agent can receive the paid result."
          : "The result appears after the task passes policy or the owner approves risky spend.";
    artifact.innerHTML =
      `<div class="artifact-empty"><span class="eyebrow">Result artifact</span><strong>${task.status === "ready_to_submit" ? "Payment prepared" : "Waiting for agent output"}</strong><p>${emptyCopy}</p></div>`;
    return;
  }

  const header = document.createElement("div");
  header.className = "artifact-header";
  header.innerHTML = `<span class="eyebrow">Result artifact</span><strong>${task.result.title}</strong><p>${task.result.summary}</p>`;
  artifact.appendChild(header);

  const receipt = document.createElement("div");
  receipt.className = "artifact-receipt";
  const receiptItems = [
    ["Vendor", task.result.receipt?.vendor || "Unknown"],
    ["Spend", task.result.receipt?.spend || "0.00 USDC"],
    ["Policy", task.result.receipt?.policy || "Preview passed"],
    ["Metadata", shortHash(task.result.receipt?.metadataHash || "") || "local"],
  ];
  receiptItems.forEach(([label, value]) => {
    const item = document.createElement("div");
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.textContent = value;
    item.append(labelEl, valueEl);
    receipt.appendChild(item);
  });
  artifact.appendChild(receipt);

  const table = document.createElement("div");
  table.className = "artifact-table";
  task.result.rows.forEach((row) => {
    const item = document.createElement("article");
    item.innerHTML = `<strong>${row.name}</strong><span>${row.detail}</span><small>${row.source}</small>`;
    table.appendChild(item);
  });
  artifact.appendChild(table);
}

function taskStatusLabel(status) {
  const labels = {
    idle: "Draft",
    created: "Running",
    budget_checked: "Running",
    vendor_selected: "Running",
    policy_checked: "Policy checked",
    ready_to_submit: "Ready for onchain submit",
    approval_needed: "Needs approval",
    result_ready: "Completed",
  };
  return labels[status] || status;
}

function startAgentTask(event) {
  event.preventDefault();
  if (!hasActiveVault()) throw new Error("Create or select a vault before starting an agent task");

  const title = $("taskTitle")?.value.trim() || DEFAULT_AGENT_TASK.title;
  const brief = $("taskBrief")?.value.trim() || DEFAULT_AGENT_TASK.brief;
  const budget = Number($("taskBudget")?.value || DEFAULT_AGENT_TASK.budget);
  if (budget <= 0) throw new Error("Task budget must be greater than zero");

  state.activeTask = normalizeTask({
    id: `task-${Date.now().toString(36)}`,
    status: "created",
    title,
    brief,
    budget,
    vendorAddress: "",
    amount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [taskStep("Task created", `${title}. Budget: ${formatUsdc(budget)} USDC.`)],
    result: null,
  });

  addActivity({
    title: "Agent task created",
    detail: `${title}. Budget ${formatUsdc(budget)} USDC`,
    hash: "task",
    state: "ok",
  });
  document.querySelector("#tasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function runTaskStep() {
  const vault = activeVault();
  if (!hasActiveVault()) throw new Error("Create or select a vault before running a task");
  if (state.activeTask.status === "idle") {
    startAgentTask({ preventDefault() {} });
    return;
  }

  const task = state.activeTask;
  const vendor = selectedTaskVendor(vault);
  if (!vendor && ["budget_checked", "vendor_selected", "policy_checked"].includes(task.status)) {
    throw new Error("Approve at least one vendor before the agent can continue the task");
  }

  if (task.status === "created") {
    task.status = "budget_checked";
    task.timeline.push(
      taskStep(
        "Agent checked budget",
        `${vault.agentName} can use up to ${formatUsdc(task.budget)} USDC for this task. Vault available today: ${formatUsdc(vault.availableToday)} USDC.`,
      ),
    );
  } else if (task.status === "budget_checked") {
    const amount = Math.min(Number(vendor.price || 0.42), task.budget);
    task.status = "vendor_selected";
    task.vendorAddress = vendor.address;
    task.amount = amount;
    setPaymentJob(vendor);
    setValue("paymentAmount", amount);
    setValue("paymentReason", `Task ${task.id}: ${task.brief}`);
    task.timeline.push(taskStep("Vendor selected", `${vendor.name} selected for ${formatUsdc(amount)} USDC. Expected result: ${vendor.result}`));
  } else if (task.status === "vendor_selected") {
    const policy = evaluatePaymentPolicy(vault, vendor.address, task.amount);
    task.status = "policy_checked";
    task.timeline.push(
      taskStep(
        policy.allowed ? "Policy passed" : "Policy needs owner review",
        policy.allowed
          ? `${vendor.name} is approved and ${formatUsdc(task.amount)} USDC fits the vault limits.`
          : `${vendor.name} cannot execute automatically. ${policy.reason}.`,
        policy.allowed ? "ok" : "warn",
      ),
    );
  } else if (task.status === "policy_checked") {
    const policy = evaluatePaymentPolicy(vault, vendor.address, task.amount);
    if (policy.allowed) {
      task.status = isOnchainVault(vault) ? "ready_to_submit" : "result_ready";
      if (isOnchainVault(vault)) {
        task.timeline.push(
          taskStep(
            "Ready for onchain submit",
            "The payment form is prepared. Use Submit prepared payment to review the exact onchain action.",
            "warn",
          ),
        );
      } else {
        vault.balance = Math.max(vault.balance - task.amount, 0);
        vault.spentToday += task.amount;
        task.result = buildTaskResult(task, vendor);
        task.timeline.push(taskStep("Result returned", `${vendor.name} returned a structured result artifact.`, "ok"));
        addActivity({
          title: "Agent task completed",
          detail: `${task.title}: ${vendor.name} returned a result after ${formatUsdc(task.amount)} USDC spend`,
          hash: "task",
          state: "ok",
        });
      }
    } else {
      task.status = "approval_needed";
      task.timeline.push(
        taskStep(
          "Owner approval required",
          "The task is paused until the owner approves the risky spend in the approval inbox.",
          "warn",
        ),
      );
    }
  } else if (task.status === "ready_to_submit") {
    focusPreparedPayment();
  } else if (task.status === "approval_needed") {
    document.querySelector("#approvals")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (task.status === "result_ready") {
    document.querySelector("#taskArtifact")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  task.updatedAt = new Date().toISOString();
  saveState();
  render();
}

function runTaskAutopilot() {
  if (state.activeTask.status === "idle") startAgentTask({ preventDefault() {} });

  const limit = 5;
  for (let index = 0; index < limit && !["result_ready", "ready_to_submit", "approval_needed"].includes(state.activeTask.status); index += 1) {
    runTaskStep();
  }
}

function resetAgentTask() {
  state.activeTask = normalizeTask(DEFAULT_AGENT_TASK);
  saveState();
  render();
}

function buildTaskResult(task, vendor) {
  const metadataPayload = {
    taskId: task.id,
    title: task.title,
    vendor: vendor.name,
    amount: task.amount,
  };

  return {
    title: `${task.title} result`,
    summary: `${vendor.name} returned a structured preview artifact for the task. The receipt mirrors the metadata that an onchain payment can link back to.`,
    receipt: {
      vendor: vendor.name,
      spend: `${formatUsdc(task.amount)} USDC`,
      policy: task.resultPolicy || "Allowed in preview",
      metadataHash: ethers.id(JSON.stringify(metadataPayload)),
    },
    rows: [
      { name: "Northstar Pay", detail: "Berlin fintech infrastructure lead. Score 91.", source: "verified-data.example/northstar" },
      { name: "LedgerFlow", detail: "Hamburg B2B payments lead. Score 87.", source: "verified-data.example/ledgerflow" },
      { name: "KreditGrid", detail: "Munich credit automation lead. Score 84.", source: "verified-data.example/kreditgrid" },
    ],
  };
}

function focusPreparedPayment() {
  const payments = document.querySelector("#payments");
  payments?.scrollIntoView({ behavior: "smooth", block: "start" });
  payments?.classList.add("focus-pulse");
  window.setTimeout(() => payments?.classList.remove("focus-pulse"), 900);
  setText("decisionTitle", "Prepared payment");
  setText("decisionText", "The task prepared this vendor spend. Run the policy check to submit the real Arc Testnet transaction.");
  $("paymentForm")?.querySelector("button[type='submit']")?.focus();
}

function applyTaskTemplate() {
  setValue("taskTitle", DEFAULT_AGENT_TASK.title);
  setValue("taskBrief", DEFAULT_AGENT_TASK.brief);
  setValue("taskBudget", DEFAULT_AGENT_TASK.budget);
}

function renderActivity() {
  const log = $("activityLog");
  if (!log) return;

  log.classList.toggle("compact-hidden", state.fullLogOpen);
  log.innerHTML = "";

  if (activeVault().activity.length === 0) {
    const empty = document.createElement("article");
    empty.className = "activity-item";
    empty.innerHTML =
      '<span class="empty-state">No spending trail yet. Run the first vendor payment or approval request to create a readable audit record.</span>';
    log.appendChild(empty);
    return;
  }

  activeVault()
    .activity.slice(0, 8)
    .forEach((item) => log.appendChild(createActivityRow(item, "activity-item")));
}

function createActivityRow(item, className) {
  const row = document.createElement("article");
  row.className = className;

  const stateClass = item.state === "risk" ? "state-risk" : item.state === "warn" ? "state-warn" : "state-ok";
  const time = document.createElement("span");
  time.className = className === "activity-item" ? "activity-time" : "log-meta";
  time.textContent = item.time || nowLabel();

  const body = document.createElement("div");
  const title = document.createElement("strong");
  title.className = className === "activity-item" ? `activity-title ${stateClass}` : stateClass;
  title.textContent = item.title;
  const detail = document.createElement("span");
  detail.className = className === "activity-item" ? "activity-detail" : "";
  detail.textContent = item.detail;
  body.append(title, detail);

  const hash = document.createElement(item.hash?.startsWith("0x") ? "a" : "span");
  hash.className = className === "activity-item" ? "activity-hash" : "log-meta";
  hash.textContent = shortHash(item.hash);
  if (item.hash?.startsWith("0x")) {
    hash.href = explorerTx(item.hash);
    hash.target = "_blank";
    hash.rel = "noreferrer";
  }

  if (className === "full-log-row") {
    row.append(time, title, detail, hash);
    return row;
  }

  row.append(time, body, hash);
  return row;
}

function renderFullActivity() {
  const panel = $("fullLogPanel");
  const log = $("fullActivityLog");
  if (!panel || !log) return;

  const pageSize = 25;
  const activity = activeVault().activity;
  const totalPages = Math.max(Math.ceil(activity.length / pageSize), 1);
  state.logPage = Math.min(Math.max(Number(state.logPage || 1), 1), totalPages);
  const pageStart = (state.logPage - 1) * pageSize;
  const pageItems = activity.slice(pageStart, pageStart + pageSize);

  panel.hidden = !state.fullLogOpen;
  log.innerHTML = "";

  pageItems.forEach((item) => log.appendChild(createActivityRow(item, "full-log-row")));

  if (activity.length === 0) {
    const empty = document.createElement("article");
    empty.className = "full-log-row empty-log-row";
    empty.innerHTML = '<span class="empty-state">No spending trail yet. Agent actions, policy decisions, and Arc hashes will appear here.</span>';
    log.appendChild(empty);
  }

  setText("logPageLabel", `Page ${state.logPage} of ${totalPages}`);
  const prev = $("prevLogPage");
  const next = $("nextLogPage");
  if (prev) prev.disabled = state.logPage <= 1;
  if (next) next.disabled = state.logPage >= totalPages;
}

function renderVaultList() {
  const list = $("vaultList");
  if (!list) return;

  list.innerHTML = "";
  if (!Array.isArray(state.vaults) || state.vaults.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.connectedAccount
      ? "No Paybound vaults yet. Click New to create the first onchain vault."
      : "Connect the owner wallet to load or create Paybound vaults.";
    list.appendChild(empty);
    return;
  }

  state.vaults.forEach((vault) => {
    const button = document.createElement("button");
    button.className = `vault-tab${vault.id === state.activeVaultId ? " active" : ""}`;
    button.type = "button";
    button.dataset.vaultId = vault.id;

    const name = document.createElement("strong");
    name.textContent = vault.agentName;
    const meta = document.createElement("span");
    const label = isOnchainVault(vault) ? shortHash(vault.address) : "preview";
    meta.textContent = `${formatUsdc(vault.balance)} USDC / ${label}`;

    button.append(name, meta);
    list.appendChild(button);
  });
}

function requestStatusLabel(status) {
  return ["None", "Pending", "Approved", "Rejected", "Executed", "Cancelled"][Number(status)] || "Unknown";
}

function requestStateClass(status) {
  if (Number(status) === 1) return "state-warn";
  if (Number(status) === 3 || Number(status) === 5) return "state-risk";
  if (Number(status) === 2 || Number(status) === 4) return "state-ok";
  return "";
}

function renderApprovalQueue() {
  const queue = $("approvalQueue");
  if (!queue) return;

  const vault = activeVault();
  const requests = [...(vault.pendingRequests || [])].sort((a, b) => Number(b.id) - Number(a.id));
  queue.innerHTML = "";

  if (requests.length === 0) {
    const empty = document.createElement("article");
    empty.className = "approval-row";
    empty.innerHTML =
      '<span class="empty-state">No approval requests yet. Create a vendor payment above policy to see the owner review flow.</span>';
    queue.appendChild(empty);
    return;
  }

  requests.slice(0, 25).forEach((request) => {
    const row = document.createElement("article");
    row.className = "approval-row";

    const id = document.createElement("span");
    id.className = "approval-id";
    id.textContent = `#${request.id}`;

    const main = document.createElement("div");
    main.className = "approval-main";
    const title = document.createElement("strong");
    title.className = requestStateClass(request.status);
    title.textContent = `${requestStatusLabel(request.status)} · ${request.vendorName || vendorForAddress(vault, request.recipient).name}`;
    const recipient = document.createElement("span");
    recipient.textContent = request.reason || request.policyReason || (ethers.isAddress(request.recipient) ? `Vendor ${shortHash(request.recipient)}` : request.recipient);
    const policy = document.createElement("small");
    policy.textContent = request.policyReason || "Waiting for owner decision";
    main.append(title, recipient, policy);

    const amount = document.createElement("div");
    amount.className = "approval-amount";
    const amountValue = document.createElement("strong");
    amountValue.textContent = `${formatUsdc(request.amount)} USDC`;
    const meta = document.createElement("span");
    meta.className = "approval-meta";
    meta.textContent = shortHash(request.metadataHash);
    amount.append(amountValue, meta);

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    if (Number(request.status) === 1) {
      const approve = document.createElement("button");
      approve.className = "primary-button";
      approve.type = "button";
      approve.textContent = "Approve";
      approve.dataset.requestAction = "approve";
      approve.dataset.requestId = request.id;

      const reject = document.createElement("button");
      reject.className = "danger-button";
      reject.type = "button";
      reject.textContent = "Reject";
      reject.dataset.requestAction = "reject";
      reject.dataset.requestId = request.id;

      const cancel = document.createElement("button");
      cancel.className = "small-button";
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.dataset.requestAction = "cancel";
      cancel.dataset.requestId = request.id;

      actions.append(approve, reject, cancel);
    } else {
      const done = document.createElement("span");
      done.className = "approval-meta";
      done.textContent = "Closed";
      actions.appendChild(done);
    }

    row.append(id, main, amount, actions);
    queue.appendChild(row);
  });
}

function render() {
  const vault = activeVault();
  const hasVault = hasActiveVault();
  const available = Number.isFinite(vault.availableToday)
    ? vault.availableToday
    : Math.max(vault.dailyLimit - vault.spentToday, 0);
  const onchain = isOnchainVault(vault);

  setText("vaultBalance", formatUsdc(vault.balance));
  setText("spentToday", `${formatUsdc(vault.spentToday)} USDC`);
  setText("availableToday", `${formatUsdc(available)} USDC`);
  setText("maxAction", `${formatUsdc(vault.maxSpend)} USDC`);
  const pendingCount = (vault.pendingRequests || []).filter((request) => Number(request.status) === 1).length;

  setText("recipientRule", `${vault.recipients.length} active`);
  setText("perActionRule", `${formatUsdc(vault.maxSpend)} USDC`);
  setText("dailyRule", `${formatUsdc(vault.dailyLimit)} USDC`);
  setText("pauseVault", vault.paused ? "Unpause vault" : "Pause vault");
  setText("activeVaultName", hasVault ? vault.agentName : "No vault selected");
  setText("vaultCount", `${state.vaults.length} total`);
  setText("vaultPolicyState", hasVault ? (vault.paused ? "Paused" : "Live") : "No vault");
  setText("pendingApprovalCount", `${pendingCount} pending`);
  setText("toggleFullLog", state.fullLogOpen ? "Hide full log" : "View full log");
  setText("treasuryBalance", `${formatUsdc(vault.balance)} USDC`);
  setText("walletUsdcBalance", state.connectedAccount ? `${formatUsdc(state.walletUsdcBalance)} USDC` : "Connect wallet");
  setText("factoryStatus", hasFactory() ? `Factory ${shortHash(state.factoryAddress)}` : "Factory missing");
  setText("ownerRole", state.connectedAccount ? shortHash(state.connectedAccount) : "Connect wallet");
  setText("agentRole", ethers.isAddress(vault.agentSigner) ? shortHash(vault.agentSigner) : vault.agentSigner);
  setText("recipientRole", vault.recipients[0] ? recipientDisplay(vault.recipients[0]) : "No vendor");

  setValue("factoryAddress", state.factoryAddress);
  setValue("agentName", vault.agentName);
  setValue("agentSigner", vault.agentSigner);
  setValue("maxSpend", vault.maxSpend);
  setValue("dailyLimit", vault.dailyLimit);

  setText(
    "deleteVaultHint",
    onchain
      ? "Onchain vaults cannot be deleted yet. Withdraw funds to zero and archive locally when supported."
      : vault.balance > 0
        ? "Withdraw all funds before deleting this vault."
        : "This vault is empty and can be deleted.",
  );

  const deleteButton = $("deleteVault");
  if (deleteButton) deleteButton.disabled = onchain || vault.balance > 0 || state.busy;

  if (state.connectedAccount) {
    setText("connectWallet", shortHash(state.connectedAccount));
    setText("modeBadge", hasFactory() ? (hasVault ? "Arc onchain" : "No vault yet") : "Add factory address");
  } else {
    setText("connectWallet", "Connect wallet");
    setText("modeBadge", localPreviewAllowed() ? "Local preview" : "Connect to Arc");
  }

  document.querySelectorAll("button, input, select, textarea").forEach((element) => {
    if (element.id === "cancelConfirm" || element.id === "acceptConfirm") return;
    if (element.id === "connectWallet" || element.id === "openTour") return;
    if ("disabled" in element && state.busy) element.disabled = true;
  });

  if (!state.busy) {
    document.querySelectorAll("button, input, select, textarea").forEach((element) => {
      if ("disabled" in element) element.disabled = false;
    });
    if (deleteButton) deleteButton.disabled = onchain || vault.balance > 0;
  }

  ["vaultForm", "policyForm", "paymentForm", "taskForm"].forEach((formId) => {
    const form = $(formId);
    if (!form) return;
    form.querySelectorAll("button, input, select, textarea").forEach((element) => {
      if (
        !hasVault &&
        element.id !== "agentName" &&
        element.id !== "agentSigner" &&
        element.id !== "maxSpend" &&
        element.id !== "dailyLimit"
      ) {
        element.disabled = true;
      }
    });
  });

  ["depositFunds", "withdrawFunds", "withdrawAllFunds", "pauseVault", "deleteVault", "refreshRequests", "runTaskStep", "runTaskAutopilot", "submitPreparedPayment"].forEach((id) => {
    const element = $(id);
    if (element && !hasVault) element.disabled = true;
  });

  renderAgentConnection(vault, onchain);
  renderLaunchChecklist(vault, onchain);
  renderTransactionProgress();
  renderVaultList();
  renderRecipients();
  renderVendorDesk();
  renderTaskRunner();
  renderPaymentPreview();
  renderApprovalQueue();
  renderActivity();
  renderFullActivity();
  renderTour();
  renderConfirm();
}

function renderAgentConnection(vault, onchain) {
  const signerReady = ethers.isAddress(vault.agentSigner) && vault.agentSigner !== ethers.ZeroAddress;
  const connectionReady = onchain && signerReady;
  const configReady = state.agentSetup.envCopied && state.agentSetup.mcpCopied;
  const vaultAddress = connectionReady ? vault.address : "0xYOUR_VAULT_ADDRESS";
  const envSnippet = buildAgentEnvSnippet(vaultAddress);
  const mcpSnippet = buildMcpConfigSnippet();

  const connectionStatus = !onchain
    ? "Select onchain vault"
    : !signerReady
      ? "Assign agent signer"
      : !configReady
        ? "Continue setup"
        : "Ready to verify";

  setText("agentConnectionStatus", connectionStatus);
  setText("agentKitVault", onchain ? vault.address : "Not configured");
  setText("agentKitSigner", signerReady ? vault.agentSigner : "Unassigned");
  setText("agentEnvPreview", envSnippet);
  setText("agentMcpPreview", mcpSnippet);
  setText("wizardVaultStatus", onchain ? "Ready" : "Required");
  setText("wizardSignerStatus", signerReady ? "Ready" : "Required");
  setText("wizardEnvStatus", state.agentSetup.envCopied ? "Copied" : "Not copied");
  setText("wizardMcpStatus", state.agentSetup.mcpCopied ? "Copied" : "Not copied");
  setText("wizardDoctorStatus", state.agentSetup.doctorCopied ? "Command copied" : "Run doctor");

  const envButton = $("copyAgentEnv");
  const mcpButton = $("copyMcpConfig");
  if (envButton) envButton.disabled = !connectionReady || state.busy;
  if (mcpButton) mcpButton.disabled = !connectionReady || state.busy;

  const steps = [
    {
      done: onchain,
      title: "Select an onchain vault",
      text: state.connectedAccount
        ? "Create or select the Paybound vault this agent will use. Each vault has an independent balance and policy."
        : "Connect the owner wallet first, then create or select the Paybound vault this agent will use.",
      code: "",
      action: onchain ? "Vault selected" : state.connectedAccount ? "Open vaults" : "Connect wallet",
      disabled: onchain,
    },
    {
      done: signerReady,
      title: "Assign the agent signer",
      text: "Use a dedicated testnet wallet for the agent. Save its public address in Vault details; keep the private key only in the local agent process.",
      code: signerReady ? `AGENT_ADDRESS=${vault.agentSigner}` : "AGENT_ADDRESS=0xYOUR_AGENT_ADDRESS",
      action: signerReady ? "Signer assigned" : "Open vault details",
      disabled: signerReady || !onchain,
    },
    {
      done: state.agentSetup.envCopied,
      title: "Create the agent environment",
      text: "Copy the public connection values into agent-kit/.env, then add the private key locally. Paybound never sends that key to the website.",
      code: envSnippet,
      action: state.agentSetup.envCopied ? "Copy env again" : "Copy env",
      disabled: !connectionReady,
    },
    {
      done: state.agentSetup.mcpCopied,
      title: "Register the MCP server",
      text: "Add this server entry to your MCP client and replace both example paths with absolute paths on your machine.",
      code: mcpSnippet,
      action: state.agentSetup.mcpCopied ? "Copy config again" : "Copy config",
      disabled: !connectionReady,
    },
    {
      done: state.agentSetup.doctorCopied,
      title: "Verify the local connection",
      text: "Run the doctor command locally. It checks the RPC, chain, contract, signer authorization, balance, pause state, and policy without spending USDC.",
      code: "cd agent-kit\nnpm install\nnpm run doctor",
      action: state.agentSetup.doctorCopied ? "Copy command again" : "Copy doctor command",
      disabled: !configReady,
    },
  ];

  const currentStep = steps[state.agentWizardStep] || steps[0];
  document.querySelectorAll("[data-agent-step]").forEach((button, index) => {
    button.classList.toggle("active", index === state.agentWizardStep);
    button.classList.toggle("done", steps[index]?.done === true);
    button.setAttribute("aria-current", index === state.agentWizardStep ? "step" : "false");
  });

  setText("agentWizardEyebrow", `Step ${state.agentWizardStep + 1} of ${steps.length}`);
  setText("agentWizardTitle", currentStep.title);
  setText("agentWizardText", currentStep.text);
  setText("agentWizardAction", currentStep.action);

  const code = $("agentWizardCode");
  if (code) {
    code.hidden = !currentStep.code;
    code.textContent = currentStep.code;
  }

  const action = $("agentWizardAction");
  const prev = $("agentWizardPrev");
  const next = $("agentWizardNext");
  if (action) action.disabled = currentStep.disabled || state.busy;
  if (prev) prev.disabled = state.agentWizardStep === 0 || state.busy;
  if (next) next.disabled = state.agentWizardStep === steps.length - 1 || state.busy;
}

function renderLaunchChecklist(vault, onchain) {
  const signerReady = ethers.isAddress(vault.agentSigner) && vault.agentSigner !== ethers.ZeroAddress;
  const policyReady = vault.recipients.length > 0 && vault.maxSpend > 0 && vault.dailyLimit > 0;
  const vendorJobReady = Boolean($("paymentRecipient")?.value) && Number($("paymentAmount")?.value || 0) > 0;
  const taskReady = ["ready_to_submit", "approval_needed", "result_ready"].includes(state.activeTask.status);
  const setupReady = state.agentSetup.envCopied && state.agentSetup.mcpCopied;
  const checks = {
    wallet: Boolean(state.connectedAccount),
    vault: onchain,
    signer: signerReady,
    funded: onchain && vault.balance > 0,
    policy: onchain && policyReady,
    vendor: onchain && vendorJobReady,
    task: onchain && taskReady,
    agent: onchain && signerReady && setupReady,
  };
  const completed = Object.values(checks).filter(Boolean).length;
  const firstIncomplete = Object.keys(checks).find((key) => !checks[key]);

  setText("launchProgressLabel", `${completed} of ${Object.keys(checks).length} ready`);
  setText("checkWallet", checks.wallet ? shortHash(state.connectedAccount) : "Connect wallet");
  setText("checkVault", checks.vault ? shortHash(vault.address) : "Create or select");
  setText("checkSigner", checks.signer ? shortHash(vault.agentSigner) : "Assign signer");
  setText("checkFunded", checks.funded ? `${formatUsdc(vault.balance)} USDC` : "Deposit USDC");
  setText("checkPolicy", checks.policy ? `${vault.recipients.length} vendor${vault.recipients.length === 1 ? "" : "s"}` : "Add vendor and limits");
  setText("checkVendor", checks.vendor ? "Job prepared" : "Pick a vendor");
  setText("checkTask", checks.task ? taskStatusLabel(state.activeTask.status) : "Run task");
  setText("checkAgent", checks.agent ? "Ready to verify" : "Copy configuration");

  const bar = $("launchProgressBar");
  if (bar) bar.style.width = `${(completed / Object.keys(checks).length) * 100}%`;

  document.querySelectorAll("[data-checklist-key]").forEach((item) => {
    const key = item.dataset.checklistKey;
    item.classList.toggle("done", checks[key] === true);
    item.classList.toggle("current", key === firstIncomplete);
  });
}

function renderTransactionProgress() {
  const panel = $("transactionProgress");
  if (!panel) return;

  const transaction = state.transaction;
  panel.hidden = !transaction;
  if (!transaction) return;

  panel.dataset.phase = transaction.phase;
  setText("transactionPhase", transaction.phase === "wallet" ? "Wallet" : transaction.phase);
  setText("transactionTitle", transaction.title);
  setText("transactionDetail", transaction.detail);

  const explorer = $("transactionExplorer");
  if (explorer) {
    explorer.hidden = !transaction.hash || !transaction.hash.startsWith("0x");
    explorer.href = transaction.hash?.startsWith("0x") ? explorerTx(transaction.hash) : "#";
  }
}

function setTransactionProgress(phase, title, detail, hash = "") {
  state.transaction = { phase, title, detail, hash };
  renderTransactionProgress();
}

function clearTransactionProgress() {
  state.transaction = null;
  renderTransactionProgress();
}

function requestWalletConfirmation(detail) {
  setTransactionProgress("wallet", "Confirm in wallet", detail);
}

async function confirmTransaction(tx, detail) {
  setTransactionProgress("submitted", "Transaction submitted", detail, tx.hash);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction was submitted but no receipt was returned");
  setTransactionProgress("confirmed", "Confirmed on Arc", detail, receipt.hash || tx.hash);
  return receipt;
}

function buildAgentEnvSnippet(vaultAddress = "0xYOUR_VAULT_ADDRESS") {
  return [
    `ARC_RPC=${ARC_TESTNET.rpcUrl}`,
    `ARC_CHAIN_ID=${ARC_TESTNET.chainId}`,
    `ARC_EXPLORER=${ARC_TESTNET.explorerUrl}`,
    `VAULT_ADDRESS=${vaultAddress}`,
    "AGENT_PRIVATE_KEY="
  ].join("\n");
}

function buildMcpConfigSnippet() {
  return JSON.stringify(
    {
      mcpServers: {
        paybound: {
          command: "node",
          args: ["C:/absolute/path/to/agent-kit/dist/mcp.js"],
          env: {
            DOTENV_CONFIG_PATH: "C:/absolute/path/to/agent-kit/.env"
          }
        }
      }
    },
    null,
    2
  );
}

async function copyAgentIntegration(kind) {
  const vault = activeVault();
  if (!isOnchainVault(vault)) throw new Error("Select an onchain vault before copying agent configuration");

  const text = kind === "env" ? buildAgentEnvSnippet(vault.address) : buildMcpConfigSnippet();
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser");
  await navigator.clipboard.writeText(text);
  if (kind === "env") state.agentSetup.envCopied = true;
  if (kind === "mcp") state.agentSetup.mcpCopied = true;

  addActivity({
    title: kind === "env" ? "Agent environment copied" : "MCP configuration copied",
    detail: "Private key was not included",
    hash: "local",
    state: "ok"
  });
}

async function copyDoctorCommand() {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser");
  await navigator.clipboard.writeText("cd agent-kit\nnpm install\nnpm run doctor");
  state.agentSetup.doctorCopied = true;
  addActivity({
    title: "Doctor command copied",
    detail: "Run it locally to verify the agent connection without spending USDC",
    hash: "local",
    state: "ok",
  });
}

async function runAgentWizardAction() {
  const step = state.agentWizardStep;
  if (step === 0) {
    if (!state.connectedAccount) {
      await connectWallet();
      return;
    }
    document.querySelector('[data-tour="vault-switcher"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (step === 1) {
    document.querySelector("#policy")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => $("agentSigner")?.focus(), 320);
    return;
  }
  if (step === 2) await copyAgentIntegration("env");
  if (step === 3) await copyAgentIntegration("mcp");
  if (step === 4) await copyDoctorCommand();
}

function changeAgentWizardStep(delta) {
  state.agentWizardStep = Math.min(Math.max(state.agentWizardStep + delta, 0), 4);
  saveState();
  render();
}

function selectAgentWizardStep(event) {
  const button = event.target.closest("[data-agent-step]");
  if (!button) return;
  state.agentWizardStep = Number(button.dataset.agentStep || 0);
  saveState();
  render();
}

function handleChecklistNavigation(event) {
  const item = event.target.closest("[data-checklist-target]");
  if (!item) return;
  if (item.dataset.checklistKey === "wallet" && !state.connectedAccount) {
    runAction(connectWallet);
    return;
  }
  document.querySelector(item.dataset.checklistTarget)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderTour() {
  const overlay = $("tourOverlay");
  if (!overlay) return;

  state.tourIndex = Math.min(Math.max(Number(state.tourIndex || 0), 0), TOUR_STEPS.length - 1);
  const step = TOUR_STEPS[state.tourIndex];

  overlay.classList.toggle("active", state.tourOpen);
  overlay.setAttribute("aria-hidden", state.tourOpen ? "false" : "true");
  setText("tourStepLabel", `Step ${state.tourIndex + 1} of ${TOUR_STEPS.length}`);
  setText("tourTitle", step.title);
  setText("tourText", step.text);
  setText("nextTour", state.tourIndex === TOUR_STEPS.length - 1 ? "Done" : "Next");

  const prev = $("prevTour");
  if (prev) prev.disabled = state.tourIndex === 0;

  const progress = $("tourProgress");
  if (progress) {
    progress.style.setProperty("--tour-steps", TOUR_STEPS.length);
    progress.innerHTML = "";
    TOUR_STEPS.forEach((_, index) => {
      const bar = document.createElement("span");
      bar.className = index <= state.tourIndex ? "active" : "";
      progress.appendChild(bar);
    });
  }

  if (state.tourOpen) requestAnimationFrame(() => updateTourPosition(true));
}

function updateTourPosition(shouldScroll = false) {
  if (!state.tourOpen) return;

  const step = TOUR_STEPS[state.tourIndex];
  const target = document.querySelector(step.target);
  const spotlight = $("tourSpotlight");
  const card = $("tourCard");
  if (!target || !spotlight || !card) return;

  if (shouldScroll) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

  window.setTimeout(
    () => {
      const rect = target.getBoundingClientRect();
      const padding = 8;
      const left = Math.max(rect.left - padding, 12);
      const top = Math.max(rect.top - padding, 12);
      const width = Math.min(rect.width + padding * 2, window.innerWidth - left - 12);
      const height = Math.min(rect.height + padding * 2, window.innerHeight - top - 12);

      spotlight.style.left = `${left}px`;
      spotlight.style.top = `${top}px`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;

      const cardWidth = Math.min(420, window.innerWidth - 32);
      const rightX = rect.right + 22;
      const leftX = rect.left - cardWidth - 22;
      let cardLeft = rightX + cardWidth < window.innerWidth - 16 ? rightX : leftX;
      if (cardLeft < 16) cardLeft = Math.min(Math.max(rect.left, 16), window.innerWidth - cardWidth - 16);

      let cardTop = rect.top;
      if (cardTop + 280 > window.innerHeight) cardTop = window.innerHeight - 300;
      if (cardTop < 16) cardTop = 16;

      card.style.left = `${cardLeft}px`;
      card.style.top = `${cardTop}px`;
    },
    shouldScroll ? 260 : 0,
  );
}

function openTour(index = 0) {
  state.tourOpen = true;
  state.tourIndex = index;
  saveState();
  render();
}

function closeTour(markSeen = true) {
  state.tourOpen = false;
  if (markSeen) state.tourSeen = true;
  saveState();
  render();
}

function changeTourStep(delta) {
  if (delta > 0 && state.tourIndex === TOUR_STEPS.length - 1) {
    closeTour(true);
    return;
  }

  state.tourIndex = Math.min(Math.max(state.tourIndex + delta, 0), TOUR_STEPS.length - 1);
  saveState();
  render();
}

function renderConfirm() {
  const overlay = $("confirmOverlay");
  if (!overlay) return;

  const confirm = state.confirm;
  overlay.classList.toggle("active", Boolean(confirm));
  overlay.setAttribute("aria-hidden", confirm ? "false" : "true");

  if (!confirm) return;

  setText("confirmEyebrow", confirm.eyebrow || "Confirm action");
  setText("confirmTitle", confirm.title);
  setText("confirmText", confirm.text);
  setText("acceptConfirm", confirm.acceptLabel || "Confirm");
}

function requestConfirm(confirm) {
  state.confirm = confirm;
  saveState();
  render();
}

function closeConfirm() {
  state.confirm = null;
  saveState();
  render();
}

function acceptConfirm() {
  const confirm = state.confirm;
  if (!confirm) return;

  state.confirm = null;
  saveState();
  render();

  if (confirm.action === "clearTrail") clearTrailConfirmed();
  if (confirm.action === "withdrawAll") runAction(() => withdrawFunds(activeVault().balance));
  if (confirm.action === "deleteVault") deleteActiveVaultConfirmed();
  if (confirm.action === "removeRecipient") runAction(() => removeRecipientConfirmed(confirm.recipient));
}

async function runAction(action) {
  if (state.busy) return;
  state.busy = true;
  clearTransactionProgress();
  render();

  try {
    await action();
  } catch (error) {
    const detail = describeError(error);
    setTransactionProgress("failed", "Action failed", detail);
    addActivity({
      title: "Action failed",
      detail,
      hash: "wallet",
      state: "risk",
    });
  } finally {
    state.busy = false;
    saveState();
    render();
  }
}

function describeError(error) {
  const raw = (
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "The wallet or RPC rejected the request"
  );
  const message = String(raw);

  if (error?.code === 4001 || error?.code === "ACTION_REJECTED" || /user rejected|user denied/i.test(message)) {
    return "You rejected the request in your wallet. No transaction was submitted.";
  }
  if (/insufficient funds/i.test(message)) return "The connected wallet does not have enough balance for this transaction.";
  if (/No injected wallet/i.test(message)) return "No browser wallet was detected. Install or unlock an EVM wallet and try again.";
  if (/NotOwner/i.test(message)) return "Only the vault owner can perform this action. Connect the owner wallet.";
  if (/NotAgentOrOwner/i.test(message)) return "The connected signer is not authorized as this vault's owner or agent.";
  if (/PausedVault/i.test(message)) return "This vault is paused. Unpause it before sending a payment.";
  if (/RecipientNotAllowed/i.test(message)) return "This vendor is not approved by the active vault policy.";
  if (/MaxSpendExceeded/i.test(message)) return "The requested amount exceeds the per-action spending limit.";
  if (/DailyLimitExceeded/i.test(message)) return "The requested amount exceeds today's remaining budget.";
  if (/RequestNotPending/i.test(message)) return "This approval request has already been resolved.";
  if (/network|chain/i.test(message) && /expected|unsupported|switch/i.test(message)) {
    return "Switch the connected wallet to Arc Testnet and try again.";
  }
  return message.replace(/^execution reverted:\s*/i, "");
}

async function ensureWallet() {
  if (!window.ethereum) throw new Error("No injected wallet was detected");

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  state.connectedAccount = ethers.getAddress(accounts[0]);
  await switchNetwork(false);
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  saveState();
}

async function connectWallet() {
  await ensureWallet();
  addActivity({
    title: "Wallet connected",
    detail: `${shortHash(state.connectedAccount)} connected on Arc Testnet`,
    hash: "wallet",
    state: "ok",
  });
  if (hasFactory()) await refreshOnchainVaults();
}

async function switchNetwork(writeActivity = true) {
  if (!window.ethereum) throw new Error("No injected wallet was detected");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainIdHex }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET.chainIdHex,
          chainName: ARC_TESTNET.name,
          rpcUrls: [ARC_TESTNET.rpcUrl],
          nativeCurrency: ARC_TESTNET.currency,
          blockExplorerUrls: [ARC_TESTNET.explorerUrl],
        },
      ],
    });
  }

  if (writeActivity) {
    addActivity({
      title: "Arc Testnet selected",
      detail: `Wallet network set to chain ${ARC_TESTNET.chainId}`,
      hash: "wallet",
      state: "ok",
    });
  }
}

function getFactory(runner = signer || provider) {
  if (!hasFactory()) throw new Error("Paste and save your AgentVaultFactory address first");
  return new ethers.Contract(state.factoryAddress, FACTORY_ABI, runner);
}

function getVaultContract(address = activeVault().address, runner = signer || provider) {
  if (!ethers.isAddress(address)) throw new Error("Active vault has no valid onchain address");
  return new ethers.Contract(address, VAULT_ABI, runner);
}

async function refreshOnchainVaults() {
  if (!state.connectedAccount || !hasFactory()) return;
  await ensureWallet();

  const factory = getFactory(provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const [addresses, walletBalance] = await Promise.all([
    factory.vaultsOf(state.connectedAccount),
    usdc.balanceOf(state.connectedAccount),
  ]);
  state.walletUsdcBalance = fromUnits(walletBalance);

  const onchainVaults = [];
  for (const address of addresses) {
    const vault = getVaultContract(address, provider);
    const [agent, maxSpend, dailyLimit, storedSpentToday, currentDay, availableToday, balance, paused, requests] = await Promise.all([
      vault.agent(),
      vault.maxSpendPerTx(),
      vault.dailyLimit(),
      vault.spentToday(),
      vault.currentDay(),
      vault.availableToday(),
      vault.balance(),
      vault.paused(),
      readVaultRequests(vault),
    ]);

    const key = address.toLowerCase();
    const today = BigInt(Math.floor(Date.now() / 86_400_000));
    const spentToday = currentDay === today ? storedSpentToday : 0n;
    const meta = state.vaultMetadata[key] || {};
    onchainVaults.push(
      normalizeVault({
        id: key,
        source: "onchain",
        address,
        agentName: meta.agentName || `Vault ${shortHash(address)}`,
        agentSigner: agent,
        balance: fromUnits(balance),
        maxSpend: fromUnits(maxSpend),
        dailyLimit: fromUnits(dailyLimit),
        spentToday: fromUnits(spentToday),
        availableToday: availableToday > 10n ** 30n ? fromUnits(dailyLimit) : fromUnits(availableToday),
        recipients: meta.recipients || [],
        paused,
        pendingRequests: requests.length > 0 ? requests : meta.pendingRequests || [],
        activity: meta.activity || [],
      }),
    );
  }

  if (onchainVaults.length > 0) {
    state.vaults = onchainVaults;
    if (!state.vaults.some((vault) => vault.id === state.activeVaultId)) {
      state.activeVaultId = state.vaults[0].id;
    }
  } else {
    state.vaults = [];
    state.activeVaultId = "";
  }

  saveState();
  render();
}

async function readVaultRequests(vaultContract) {
  const nextRequestId = Number(await vaultContract.nextRequestId());
  const firstRequestId = Math.max(1, nextRequestId - 50);
  const requests = [];

  for (let id = firstRequestId; id < nextRequestId; id += 1) {
    const request = await vaultContract.paymentRequests(id);
    const status = Number(request.status ?? request[3] ?? 0);
    if (status === 0) continue;

    requests.push(
      normalizeRequest({
        id,
        recipient: request.recipient ?? request[0],
        amount: fromUnits(request.amount ?? request[1]),
        metadataHash: request.metadataHash ?? request[2],
        status,
        createdAt: Number(request.createdAt ?? request[4] ?? 0),
        decidedAt: Number(request.decidedAt ?? request[5] ?? 0),
      }),
    );
  }

  return requests;
}

async function saveFactoryAddress() {
  const input = $("factoryAddress")?.value.trim() || "";
  if (!ethers.isAddress(input)) throw new Error("Factory address must be a full 0x address");

  state.factoryAddress = ethers.getAddress(input);
  saveState();
  addActivity({
    title: "Factory saved",
    detail: `${shortHash(state.factoryAddress)} is now the active factory`,
    hash: "local",
    state: "ok",
  });
  if (state.connectedAccount) await refreshOnchainVaults();
}

async function updateVault(event) {
  event.preventDefault();

  const vault = activeVault();
  const nextName = $("agentName").value.trim() || "Agent Vault";
  const nextAgent = $("agentSigner").value.trim();
  vault.agentName = nextName;

  if (isOnchainVault(vault)) {
    if (!ethers.isAddress(nextAgent)) throw new Error("Agent signer must be a full 0x address");
    await ensureWallet();
    requestWalletConfirmation(`Assign ${shortHash(nextAgent)} as the agent signer`);
    const tx = await getVaultContract(vault.address, signer).setAgent(nextAgent);
    addActivity({
      title: "Agent update submitted",
      detail: `Waiting for ${shortHash(tx.hash)}`,
      hash: tx.hash,
      state: "warn",
    });
    await confirmTransaction(tx, `Agent signer ${shortHash(nextAgent)}`);
    vault.agentSigner = ethers.getAddress(nextAgent);
    syncActiveMetadata();
    await refreshOnchainVaults();
  } else {
    vault.agentSigner = nextAgent || "unassigned";
  }

  addActivity({
    title: "Vault saved",
    detail: `${vault.agentName} details updated`,
    hash: "local",
    state: "ok",
  });
}

async function depositFunds() {
  const vault = activeVault();
  const amount = Number($("depositAmount")?.value || 0);
  if (amount <= 0) throw new Error("Deposit amount must be greater than zero");

  if (isOnchainVault(vault)) {
    await ensureWallet();
    const amountUnits = toUnits(amount);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const onchainVault = getVaultContract(vault.address, signer);

    requestWalletConfirmation(`Approve ${formatUsdc(amount)} USDC for the active vault`);
    const approveTx = await usdc.approve(vault.address, amountUnits);
    addActivity({
      title: "USDC approval submitted",
      detail: `${formatUsdc(amount)} USDC allowance for ${shortHash(vault.address)}`,
      hash: approveTx.hash,
      state: "warn",
    });
    await confirmTransaction(approveTx, `USDC approval for ${shortHash(vault.address)}`);

    requestWalletConfirmation(`Deposit ${formatUsdc(amount)} USDC into ${vault.agentName}`);
    const depositTx = await onchainVault.deposit(amountUnits);
    addActivity({
      title: "Deposit submitted",
      detail: `${formatUsdc(amount)} USDC moving into ${vault.agentName}`,
      hash: depositTx.hash,
      state: "warn",
    });
    await confirmTransaction(depositTx, `${formatUsdc(amount)} USDC deposit`);
    await refreshOnchainVaults();
    addActivity({
      title: "Funds deposited",
      detail: `${formatUsdc(amount)} USDC added on Arc Testnet`,
      hash: depositTx.hash,
      state: "ok",
    });
    return;
  }

  vault.balance += amount;
  addActivity({
    title: "Funds deposited",
    detail: `${formatUsdc(amount)} USDC added to ${vault.agentName}`,
    hash: "local",
    state: "ok",
  });
}

async function withdrawFunds(amountOverride) {
  const vault = activeVault();
  const amount = Number(amountOverride ?? $("withdrawAmount")?.value ?? 0);
  if (amount <= 0) throw new Error("Withdrawal amount must be greater than zero");
  if (amount > vault.balance) throw new Error(`${formatUsdc(amount)} USDC exceeds available vault balance`);

  if (isOnchainVault(vault)) {
    await ensureWallet();
    requestWalletConfirmation(`Withdraw ${formatUsdc(amount)} USDC to the owner wallet`);
    const tx = await getVaultContract(vault.address, signer).withdraw(toUnits(amount));
    addActivity({
      title: "Withdrawal submitted",
      detail: `${formatUsdc(amount)} USDC returning to owner`,
      hash: tx.hash,
      state: "warn",
    });
    await confirmTransaction(tx, `${formatUsdc(amount)} USDC withdrawal`);
    await refreshOnchainVaults();
    addActivity({
      title: "Funds withdrawn",
      detail: `${formatUsdc(amount)} USDC returned to owner`,
      hash: tx.hash,
      state: "ok",
    });
    return;
  }

  vault.balance = Math.max(vault.balance - amount, 0);
  addActivity({
    title: "Funds withdrawn",
    detail: `${formatUsdc(amount)} USDC returned to owner`,
    hash: "local",
    state: "ok",
  });
}

function withdrawAllFunds() {
  const vault = activeVault();
  if (vault.balance <= 0) {
    addActivity({
      title: "Withdrawal skipped",
      detail: "Vault balance is already 0.00 USDC",
      hash: "local",
      state: "warn",
    });
    return;
  }

  requestConfirm({
    action: "withdrawAll",
    eyebrow: "Withdraw all",
    title: `Withdraw ${formatUsdc(vault.balance)} USDC?`,
    text: isOnchainVault(vault)
      ? "This submits an Arc Testnet transaction from the active vault."
      : "This returns the entire preview balance to the owner.",
    acceptLabel: "Withdraw all",
  });
}

function deleteActiveVault() {
  const vault = activeVault();
  if (isOnchainVault(vault)) {
    addActivity({
      title: "Delete unavailable",
      detail: "Onchain vaults cannot be deleted yet. Withdraw funds and leave the vault inactive.",
      hash: "local",
      state: "warn",
    });
    return;
  }

  if (vault.balance > 0) {
    addActivity({
      title: "Delete blocked",
      detail: "Vault balance must be 0.00 USDC before deletion",
      hash: "local",
      state: "risk",
    });
    return;
  }

  requestConfirm({
    action: "deleteVault",
    eyebrow: "Delete vault",
    title: `Delete ${vault.agentName}?`,
    text: "This removes the preview vault from the local workspace.",
    acceptLabel: "Delete vault",
  });
}

function deleteActiveVaultConfirmed() {
  const vault = activeVault();
  if (isOnchainVault(vault) || vault.balance > 0) return;

  const deletedName = vault.agentName;
  state.vaults = state.vaults.filter((item) => item.id !== vault.id);
  if (state.vaults.length === 0) state.vaults = clone(DEFAULT_SIM_VAULTS);
  state.activeVaultId = state.vaults[0].id;
  state.fullLogOpen = false;
  state.logPage = 1;
  saveState();
  addActivity({
    title: "Vault deleted",
    detail: `${deletedName} removed after its balance reached zero`,
    hash: "local",
    state: "warn",
  });
}

async function updatePolicy(event) {
  event.preventDefault();

  const vault = activeVault();
  const recipient = $("recipientInput").value.trim();
  const recipientName = $("recipientNameInput")?.value.trim();
  const maxSpend = Number($("maxSpend").value || 0);
  const dailyLimit = Number($("dailyLimit").value || 0);
  if (maxSpend < 0 || dailyLimit < 0) throw new Error("Policy amounts cannot be negative");

  if (isOnchainVault(vault)) {
    if (recipient && !ethers.isAddress(recipient)) throw new Error("Approved vendor must be a full 0x address");
    await ensureWallet();
    const contract = getVaultContract(vault.address, signer);
    requestWalletConfirmation(`Set ${formatUsdc(maxSpend)} USDC per action and ${formatUsdc(dailyLimit)} USDC daily`);
    const policyTx = await contract.setPolicy(toUnits(maxSpend), toUnits(dailyLimit));
    addActivity({
      title: "Policy update submitted",
      detail: `${formatUsdc(maxSpend)} USDC max action, ${formatUsdc(dailyLimit)} USDC daily limit`,
      hash: policyTx.hash,
      state: "warn",
    });
    await confirmTransaction(policyTx, "Vault spending limits");

    if (
      recipient &&
      !vault.recipients.some((item) => normalizeRecipient(item).address.toLowerCase() === recipient.toLowerCase())
    ) {
      const vendor = normalizeRecipient({ ...(findCatalogVendor(recipient) || {}), name: recipientName || findCatalogVendor(recipient)?.name, address: recipient });
      requestWalletConfirmation(`Approve ${shortHash(recipient)} as a vendor`);
      const allowTx = await contract.setRecipientAllowed(recipient, true);
      addActivity({
        title: "Vendor approval submitted",
        detail: `${shortHash(recipient)} added to the vendor allowlist`,
        hash: allowTx.hash,
        state: "warn",
      });
      await confirmTransaction(allowTx, `Vendor ${shortHash(recipient)} approved`);
      vault.recipients.push({ ...vendor, address: ethers.getAddress(recipient) });
    }

    vault.maxSpend = maxSpend;
    vault.dailyLimit = dailyLimit;
    syncActiveMetadata();
    await refreshOnchainVaults();
  } else {
    vault.maxSpend = maxSpend;
    vault.dailyLimit = dailyLimit;
    if (
      recipient &&
      !vault.recipients.some((item) => normalizeRecipient(item).address.toLowerCase() === recipient.toLowerCase())
    ) {
      vault.recipients.push(
        normalizeRecipient({
          ...(findCatalogVendor(recipient) || {}),
          name: recipientName || findCatalogVendor(recipient)?.name,
          address: recipient,
        }),
      );
    }
  }

  setValue("recipientNameInput", "");
  setValue("recipientInput", "");
  addActivity({
    title: "Policy updated",
    detail: `${formatUsdc(maxSpend)} USDC max action, ${formatUsdc(dailyLimit)} USDC daily limit`,
    hash: "local",
    state: "ok",
  });
}

async function initiatePayment(event) {
  event.preventDefault();

  const vault = activeVault();
  const recipient = $("paymentRecipient").value;
  const amount = Number($("paymentAmount").value || 0);
  const reason = $("paymentReason").value.trim() || "Agent payment";
  const vendor = vendorForAddress(vault, recipient);
  const policy = evaluatePaymentPolicy(vault, recipient, amount);
  const hash = await metadataHash({
    vendor: vendor.name,
    recipient,
    amount,
    reason,
    policyReason: policy.reason,
    createdAt: new Date().toISOString(),
  });

  if (!recipient) throw new Error("Add an approved vendor before testing agent spend");
  if (amount <= 0) throw new Error("Payment amount must be greater than zero");

  if (isOnchainVault(vault)) {
    if (!ethers.isAddress(recipient)) throw new Error("Payment vendor must be a full 0x address");
    await ensureWallet();
    requestWalletConfirmation(`Request ${formatUsdc(amount)} USDC payment to ${vendor.name}`);
    const tx = await getVaultContract(vault.address, signer).initiatePayment(recipient, toUnits(amount), hash);
    setText("decisionTitle", "Submitted");
    setText("decisionText", `${vendor.name} payment is waiting for Arc Testnet finality.`);
    addActivity({
      title: "Agent payment submitted",
      detail: `${formatUsdc(amount)} USDC to ${vendor.name}. Reason: ${reason}`,
      hash: tx.hash,
      state: "warn",
    });

    const receipt = await confirmTransaction(tx, `${formatUsdc(amount)} USDC agent payment`);
    const outcome = parsePaymentOutcome(receipt, vault.address);
    await refreshOnchainVaults();

    if (outcome.executed) {
      if (state.activeTask.status === "ready_to_submit") {
        state.activeTask.status = "result_ready";
        state.activeTask.resultPolicy = "Executed on Arc";
        state.activeTask.result = buildTaskResult(state.activeTask, vendor);
        state.activeTask.timeline.push(taskStep("Arc transaction confirmed", `${vendor.name} received ${formatUsdc(amount)} USDC on Arc Testnet.`, "ok"));
      }
      setText("decisionTitle", "Executed");
      setText("decisionText", `${vendor.name} was paid. Result expected: ${vendor.result}`);
      addActivity({
        title: "Vendor paid",
        detail: `${vendor.name} received ${formatUsdc(amount)} USDC. Result: ${vendor.result}`,
        hash: tx.hash,
        state: "ok",
      });
      return;
    }

    setText("decisionTitle", "Approval required");
    setText(
      "decisionText",
      outcome.requestId
        ? `Request #${outcome.requestId} was queued onchain for ${vendor.name}.`
        : `${vendor.name} payment was queued for approval.`,
    );
    if (state.activeTask.status === "ready_to_submit") {
      state.activeTask.status = "approval_needed";
      state.activeTask.timeline.push(taskStep("Queued for owner approval", `${vendor.name} spend is now an onchain approval request.`, "warn"));
    }
    addActivity({
      title: "Approval requested",
      detail: `${formatUsdc(amount)} USDC to ${vendor.name} requires owner approval. ${policy.reason}`,
      hash: tx.hash,
      state: "warn",
    });
    return;
  }

  if (!policy.allowed) {
    const requestId = String((vault.pendingRequests || []).length + 1);
    vault.pendingRequests ||= [];
    vault.pendingRequests.push(
      normalizeRequest({
        id: requestId,
        recipient,
        amount,
        metadataHash: hash,
        reason,
        policyReason: policy.reason,
        vendorName: vendor.name,
        status: 1,
        createdAt: Math.floor(Date.now() / 1000),
        decidedAt: 0,
      }),
    );

    setText("decisionTitle", "Approval required");
    setText("decisionText", `Request #${requestId} was queued. ${policy.reason}.`);
    addActivity({
      title: "Approval requested",
      detail: `Request #${requestId}: ${vendor.name} asks for ${formatUsdc(amount)} USDC. ${policy.reason}`,
      hash,
      state: "warn",
    });
    return;
  }

  vault.balance = Math.max(vault.balance - amount, 0);
  vault.spentToday += amount;
  setText("decisionTitle", "Executed");
  setText("decisionText", `${vendor.name} returned a result: ${vendor.result}`);
  addActivity({
    title: "Vendor paid",
    detail: `${vendor.name} received ${formatUsdc(amount)} USDC. Result: ${vendor.result}`,
    hash,
    state: "ok",
  });
}

async function runRiskyDemo() {
  const vault = activeVault();
  if (!hasActiveVault()) throw new Error("Create or select a vault before running the demo");
  if (!vault.recipients.length) throw new Error("Add an approved vendor before creating an approval request");

  const recipient = normalizeRecipient(vault.recipients[0]);
  const riskyAmount = vault.maxSpend > 0 ? vault.maxSpend + 1 : Math.max(vault.dailyLimit + 1, 1);

  const select = $("paymentRecipient");
  if (select) select.value = recipient.address;
  setValue("paymentAmount", riskyAmount);
  setValue("paymentReason", `Demo: ${recipient.name} spend above policy limit`);

  await initiatePayment({ preventDefault() {} });
  document.querySelector("#approvals")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parsePaymentOutcome(receipt, vaultAddress) {
  const iface = new ethers.Interface(VAULT_ABI);
  const outcome = { executed: false, requestId: null };

  for (const log of receipt.logs || []) {
    if (log.address.toLowerCase() !== vaultAddress.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PaymentExecuted") outcome.executed = true;
      if (parsed?.name === "PaymentRequested") outcome.requestId = parsed.args.requestId.toString();
    } catch {
      // Ignore logs from other ABIs.
    }
  }

  return outcome;
}

async function togglePause() {
  const vault = activeVault();
  const willPause = !vault.paused;

  if (isOnchainVault(vault)) {
    await ensureWallet();
    requestWalletConfirmation(willPause ? "Pause all agent payments" : "Resume agent payments");
    const tx = vault.paused
      ? await getVaultContract(vault.address, signer).unpause()
      : await getVaultContract(vault.address, signer).pause();
    addActivity({
      title: willPause ? "Pause submitted" : "Unpause submitted",
      detail: `Waiting for ${shortHash(tx.hash)}`,
      hash: tx.hash,
      state: "warn",
    });
    await confirmTransaction(tx, willPause ? "Vault paused" : "Vault unpaused");
    await refreshOnchainVaults();
  } else {
    vault.paused = !vault.paused;
  }

  addActivity({
    title: willPause ? "Vault paused" : "Vault unpaused",
    detail: willPause ? "Agent payments are blocked" : "Agent payments are enabled",
    hash: "local",
    state: willPause ? "risk" : "ok",
  });
}

function clearTrail() {
  requestConfirm({
    action: "clearTrail",
    eyebrow: "Clear activity",
    title: "Clear this vault's activity log?",
    text: "This clears the local interface trail. It does not remove onchain transactions.",
    acceptLabel: "Clear log",
  });
}

function clearTrailConfirmed() {
  activeVault().activity = [];
  syncActiveMetadata();
  saveState();
  render();
}

function setFullLog(open) {
  state.fullLogOpen = open;
  if (open) state.logPage = 1;
  saveState();
  render();
}

function changeLogPage(delta) {
  state.logPage += delta;
  saveState();
  render();
}

function removeRecipient(event) {
  const button = event.target.closest("[data-recipient]");
  if (!button) return;

  requestConfirm({
    action: "removeRecipient",
    recipient: button.dataset.recipient,
    eyebrow: "Remove vendor",
    title: `Remove ${shortHash(button.dataset.recipient)}?`,
    text: "The agent will no longer be able to pay this vendor automatically.",
    acceptLabel: "Remove",
  });
}

function handleVendorAction(event) {
  const button = event.target.closest("[data-vendor-action]");
  if (!button) return;

  const vendor = findCatalogVendor(button.dataset.vendorAddress);
  if (!vendor) return;

  if (button.dataset.vendorAction === "fill") {
    setValue("recipientNameInput", vendor.name);
    setValue("recipientInput", vendor.address);
    setValue("paymentAmount", vendor.price);
    setValue("paymentReason", `Use ${vendor.name} for the current agent task`);
    document.querySelector("#policy")?.scrollIntoView({ behavior: "smooth", block: "start" });
    renderPaymentPreview();
    return;
  }

  setPaymentJob(vendor);
  document.querySelector("#payments")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setPaymentJob(vendor) {
  const select = $("paymentRecipient");
  if (select) select.value = vendor.address;
  setValue("paymentAmount", vendor.price);
  setValue("paymentReason", `Agent job: ${vendor.description}`);
  setText("decisionTitle", "Job prepared");
  setText("decisionText", `${vendor.name} is ready for a policy check. Expected result: ${vendor.result}`);
  renderPaymentPreview();
}

async function removeRecipientConfirmed(recipientToRemove) {
  const vault = activeVault();
  if (isOnchainVault(vault) && ethers.isAddress(recipientToRemove)) {
    await ensureWallet();
    requestWalletConfirmation(`Remove ${shortHash(recipientToRemove)} from approved vendors`);
    const tx = await getVaultContract(vault.address, signer).setRecipientAllowed(recipientToRemove, false);
    addActivity({
      title: "Vendor removal submitted",
      detail: `${shortHash(recipientToRemove)} will be removed from the allowlist`,
      hash: tx.hash,
      state: "warn",
    });
    await confirmTransaction(tx, `Vendor ${shortHash(recipientToRemove)} removed`);
  }

  vault.recipients = vault.recipients.filter(
    (recipient) => normalizeRecipient(recipient).address.toLowerCase() !== recipientToRemove.toLowerCase(),
  );
  syncActiveMetadata();
  addActivity({
    title: "Vendor removed",
    detail: `${shortHash(recipientToRemove)} removed from the vendor allowlist`,
    hash: "local",
    state: "warn",
  });
}

async function refreshRequests() {
  if (isOnchainVault()) {
    await refreshOnchainVaults();
    addActivity({
      title: "Requests refreshed",
      detail: "Approval inbox synced from Arc Testnet",
      hash: "local",
      state: "ok",
    });
    return;
  }

  render();
}

async function handleRequestAction(event) {
  const button = event.target.closest("[data-request-action]");
  if (!button) return;

  const action = button.dataset.requestAction;
  const requestId = button.dataset.requestId;
  await runAction(() => executeRequestAction(action, requestId));
}

async function executeRequestAction(action, requestId) {
  const vault = activeVault();
  const request = (vault.pendingRequests || []).find((item) => String(item.id) === String(requestId));
  if (!request) throw new Error(`Request #${requestId} was not found`);

  if (isOnchainVault(vault)) {
    await ensureWallet();
    const contract = getVaultContract(vault.address, signer);
    let tx;

    requestWalletConfirmation(`${capitalize(action)} approval request #${requestId}`);
    if (action === "approve") tx = await contract.approveRequest(requestId);
    if (action === "reject") tx = await contract.rejectRequest(requestId);
    if (action === "cancel") tx = await contract.cancelRequest(requestId);
    if (!tx) throw new Error("Unknown request action");

    addActivity({
      title: `${capitalize(action)} submitted`,
      detail: `Request #${requestId} is waiting for Arc Testnet finality`,
      hash: tx.hash,
      state: "warn",
    });

    await confirmTransaction(tx, `${capitalize(action)} request #${requestId}`);
    await refreshOnchainVaults();

    addActivity({
      title: requestActionTitle(action),
      detail: `Request #${requestId}: ${request.vendorName || vendorForAddress(vault, request.recipient).name} for ${formatUsdc(request.amount)} USDC`,
      hash: tx.hash,
      state: action === "reject" || action === "cancel" ? "risk" : "ok",
    });
    return;
  }

  if (action === "approve") {
    request.status = 4;
    vault.balance = Math.max(vault.balance - request.amount, 0);
    vault.spentToday += request.amount;
  }
  if (action === "reject") request.status = 3;
  if (action === "cancel") request.status = 5;
  request.decidedAt = Math.floor(Date.now() / 1000);

  addActivity({
    title: requestActionTitle(action),
    detail:
      action === "approve"
        ? `Request #${requestId}: ${request.vendorName || vendorForAddress(vault, request.recipient).name} paid ${formatUsdc(request.amount)} USDC after owner approval`
        : `Request #${requestId}: ${request.vendorName || vendorForAddress(vault, request.recipient).name} was ${action}ed`,
    hash: "local",
    state: action === "reject" || action === "cancel" ? "risk" : "ok",
  });
}

function requestActionTitle(action) {
  if (action === "approve") return "Request approved";
  if (action === "reject") return "Request rejected";
  if (action === "cancel") return "Request cancelled";
  return "Request updated";
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function applyDepositPreset(event) {
  const button = event.target.closest("[data-deposit-preset]");
  if (!button) return;

  const input = $("depositAmount");
  if (input) input.value = button.dataset.depositPreset;
}

function closeConfirmOnBackdrop(event) {
  if (event.target.id === "confirmOverlay") closeConfirm();
}

async function createVault() {
  if (!localPreviewAllowed() && !state.connectedAccount) {
    await ensureWallet();
  }

  if (state.connectedAccount && hasFactory()) {
    await ensureWallet();
    const agentInput = $("agentSigner")?.value.trim();
    const agent = ethers.isAddress(agentInput) ? ethers.getAddress(agentInput) : state.connectedAccount;
    const maxSpend = Number($("maxSpend")?.value || 1);
    const dailyLimit = Number($("dailyLimit")?.value || 5);
    const factory = getFactory(signer);
    requestWalletConfirmation(`Create a vault for agent ${shortHash(agent)}`);
    const tx = await factory.createVault(agent, toUnits(maxSpend), toUnits(dailyLimit));
    addActivity({
      title: "Vault creation submitted",
      detail: `Agent signer ${shortHash(agent)}`,
      hash: tx.hash,
      state: "warn",
    });
    await confirmTransaction(tx, `New vault for ${shortHash(agent)}`);
    await refreshOnchainVaults();
    const created = state.vaults[state.vaults.length - 1];
    if (created) {
      state.activeVaultId = created.id;
      created.agentName = $("agentName")?.value.trim() || created.agentName;
      syncActiveMetadata();
    }
    addActivity({
      title: "Vault created",
      detail: `Onchain vault created for ${shortHash(agent)}`,
      hash: tx.hash,
      state: "ok",
    });
    return;
  }

  if (!localPreviewAllowed()) {
    throw new Error("Connect the owner wallet and configure the AgentVaultFactory before creating a vault");
  }

  const index = state.vaults.length + 1;
  const vault = normalizeVault({
    id: createVaultId(),
    source: "simulation",
    agentName: `Agent Vault ${index}`,
    agentSigner: "unassigned",
    balance: 0,
    maxSpend: 1,
    dailyLimit: 5,
    spentToday: 0,
    recipients: [],
    paused: false,
    activity: [
      {
        title: "Vault created",
        detail: `Agent Vault ${index} initialized in preview mode`,
        hash: "local",
        state: "ok",
        time: nowLabel(),
      },
    ],
  });

  state.vaults.push(vault);
  state.activeVaultId = vault.id;
  saveState();
  render();
}

function selectVault(event) {
  const button = event.target.closest("[data-vault-id]");
  if (!button) return;

  state.activeVaultId = button.dataset.vaultId;
  state.fullLogOpen = false;
  state.logPage = 1;
  saveState();
  setText("decisionTitle", "Ready");
  setText("decisionText", isOnchainVault() ? "Onchain policy is active." : "Preview policy is active.");
  render();
}

function bind(id, eventName, handler) {
  const element = $(id);
  if (element) element.addEventListener(eventName, handler);
}

bind("connectWallet", "click", () => runAction(connectWallet));
bind("switchNetwork", "click", () => runAction(() => switchNetwork(true)));
bind("saveFactory", "click", () => runAction(saveFactoryAddress));
bind("copyAgentEnv", "click", () => runAction(() => copyAgentIntegration("env")));
bind("copyMcpConfig", "click", () => runAction(() => copyAgentIntegration("mcp")));
bind("agentWizardAction", "click", () => runAction(runAgentWizardAction));
bind("agentWizardPrev", "click", () => changeAgentWizardStep(-1));
bind("agentWizardNext", "click", () => changeAgentWizardStep(1));
bind("agentWizardSteps", "click", selectAgentWizardStep);
bind("launchChecklist", "click", handleChecklistNavigation);
bind("dismissTransaction", "click", clearTransactionProgress);
bind("vaultForm", "submit", (event) => runAction(() => updateVault(event)));
bind("policyForm", "submit", (event) => runAction(() => updatePolicy(event)));
bind("taskForm", "submit", (event) => runAction(() => startAgentTask(event)));
bind("applyTaskTemplate", "click", applyTaskTemplate);
bind("resetAgentTask", "click", resetAgentTask);
bind("runTaskStep", "click", () => runAction(runTaskStep));
bind("runTaskAutopilot", "click", () => runAction(runTaskAutopilot));
bind("submitPreparedPayment", "click", focusPreparedPayment);
bind("paymentForm", "submit", (event) => runAction(() => initiatePayment(event)));
bind("runRiskyDemo", "click", () => runAction(runRiskyDemo));
bind("depositFunds", "click", () => runAction(depositFunds));
bind("withdrawFunds", "click", () => runAction(() => withdrawFunds()));
bind("withdrawAllFunds", "click", withdrawAllFunds);
bind("deleteVault", "click", deleteActiveVault);
bind("pauseVault", "click", () => runAction(togglePause));
bind("clearTrail", "click", clearTrail);
bind("refreshRequests", "click", () => runAction(refreshRequests));
bind("toggleFullLog", "click", () => setFullLog(!state.fullLogOpen));
bind("prevLogPage", "click", () => changeLogPage(-1));
bind("nextLogPage", "click", () => changeLogPage(1));
bind("createVault", "click", () => runAction(createVault));
bind("vaultList", "click", selectVault);
bind("recipientList", "click", removeRecipient);
bind("vendorGrid", "click", handleVendorAction);
bind("suggestedVendorGrid", "click", handleVendorAction);
bind("approvalQueue", "click", handleRequestAction);
bind("cancelConfirm", "click", closeConfirm);
bind("acceptConfirm", "click", acceptConfirm);
bind("confirmOverlay", "click", closeConfirmOnBackdrop);
bind("openTour", "click", () => openTour(0));
bind("prevTour", "click", () => changeTourStep(-1));
bind("nextTour", "click", () => changeTourStep(1));
bind("skipTour", "click", () => closeTour(true));

document.addEventListener("click", applyDepositPreset);
["paymentRecipient", "paymentAmount"].forEach((id) => {
  const element = $(id);
  if (element) element.addEventListener("input", renderPaymentPreview);
});
window.addEventListener("resize", () => updateTourPosition(false));
window.addEventListener("scroll", () => updateTourPosition(false), true);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.confirm) closeConfirm();
  if (event.key === "Escape" && state.tourOpen) closeTour(true);
});

window.ethereum?.on?.("accountsChanged", (accounts) => {
  state.connectedAccount = accounts[0] ? ethers.getAddress(accounts[0]) : null;
  if (state.connectedAccount && hasFactory()) {
    runAction(refreshOnchainVaults);
  } else {
    saveState();
    render();
  }
});

render();
if (!state.tourSeen && $("tourOverlay")) {
  window.setTimeout(() => openTour(0), 450);
}
