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
    recipients: [
      { name: "Verified Data API", address: "Verified Data API" },
      { name: "Compliance Verifier", address: "Compliance Verifier" },
    ],
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

const TOUR_STEPS = [
  {
    target: '[data-tour="vault-switcher"]',
    title: "Create a vault",
    text: "Create one or more onchain vaults. Each vault has its own agent signer, budget, policy, and activity trail.",
  },
  {
    target: '[data-tour="wallet"]',
    title: "Connect the owner wallet",
    text: "The owner wallet funds vaults, changes policy, withdraws unused USDC, and approves risky agent actions.",
  },
  {
    target: '[data-tour="summary"]',
    title: "Check the active vault",
    text: "Use the summary strip to confirm which vault is selected, whether policy is live, and whether the app is connected to Arc.",
  },
  {
    target: '[data-tour="policy"]',
    title: "Assign the agent",
    text: "Set the agent signer, then define max spend, daily limits, and the approved recipient address.",
  },
  {
    target: '[data-tour="treasury"]',
    title: "Fund the vault",
    text: "Deposit USDC before the agent can spend. The app submits approve and deposit transactions for the active vault.",
  },
  {
    target: '[data-tour="payments"]',
    title: "Run a payment",
    text: "Use the test harness to initiate the same onchain payment flow that an agent signer or backend wallet would call.",
  },
  {
    target: '[data-tour="approvals"]',
    title: "Review risky spend",
    text: "Payments outside policy become onchain approval requests. The owner can approve or reject them without leaving the app.",
  },
  {
    target: '[data-tour="trail"]',
    title: "Audit the result",
    text: "Read the compact log or expand the full trail to inspect deposits, policy decisions, and transaction hashes.",
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
    confirm: null,
    busy: false,
    vaultMetadata: stored.vaultMetadata || {},
    vaults: Array.isArray(stored.vaults) && stored.vaults.length > 0 ? stored.vaults : clone(DEFAULT_SIM_VAULTS),
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
    return {
      name: ethers.isAddress(recipient) ? shortHash(recipient) : recipient,
      address: recipient,
    };
  }

  const address = recipient?.address || recipient?.value || "";
  return {
    name: recipient?.name || (ethers.isAddress(address) ? shortHash(address) : address || "Unnamed recipient"),
    address,
  };
}

function normalizeRequest(request) {
  return {
    id: String(request.id || request.requestId || ""),
    recipient: request.recipient || "",
    amount: Number(request.amount || 0),
    metadataHash: request.metadataHash || "",
    status: Number(request.status || 0),
    createdAt: Number(request.createdAt || 0),
    decidedAt: Number(request.decidedAt || 0),
  };
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
      empty.textContent = "No approved recipients yet.";
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

function renderActivity() {
  const log = $("activityLog");
  if (!log) return;

  log.classList.toggle("compact-hidden", state.fullLogOpen);
  log.innerHTML = "";

  if (activeVault().activity.length === 0) {
    const empty = document.createElement("article");
    empty.className = "activity-item";
    empty.innerHTML = '<span class="empty-state">No activity yet.</span>';
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
    empty.innerHTML = '<span class="empty-state">No activity yet.</span>';
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
    empty.textContent = state.connectedAccount ? "No onchain vaults yet." : "Connect a wallet to load vaults.";
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
    empty.innerHTML = '<span class="empty-state">No approval requests yet. Run a payment above the policy limit to create one.</span>';
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
    title.textContent = requestStatusLabel(request.status);
    const recipient = document.createElement("span");
    recipient.textContent = ethers.isAddress(request.recipient) ? `Recipient ${shortHash(request.recipient)}` : "Unknown recipient";
    main.append(title, recipient);

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
  setText("recipientRole", vault.recipients[0] ? recipientDisplay(vault.recipients[0]) : "No recipient");

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
    setText("modeBadge", "Local preview");
  }

  document.querySelectorAll("button, input, select").forEach((element) => {
    if (element.id === "cancelConfirm" || element.id === "acceptConfirm") return;
    if (element.id === "connectWallet" || element.id === "openTour") return;
    if ("disabled" in element && state.busy) element.disabled = true;
  });

  if (!state.busy) {
    document.querySelectorAll("button, input, select").forEach((element) => {
      if ("disabled" in element) element.disabled = false;
    });
    if (deleteButton) deleteButton.disabled = onchain || vault.balance > 0;
  }

  ["vaultForm", "policyForm", "paymentForm"].forEach((formId) => {
    const form = $(formId);
    if (!form) return;
    form.querySelectorAll("button, input, select").forEach((element) => {
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

  ["depositFunds", "withdrawFunds", "withdrawAllFunds", "pauseVault", "deleteVault", "refreshRequests"].forEach((id) => {
    const element = $(id);
    if (element && !hasVault) element.disabled = true;
  });

  renderVaultList();
  renderRecipients();
  renderApprovalQueue();
  renderActivity();
  renderFullActivity();
  renderTour();
  renderConfirm();
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
  render();

  try {
    await action();
  } catch (error) {
    addActivity({
      title: "Transaction failed",
      detail: describeError(error),
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
  return (
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "The wallet or RPC rejected the request"
  );
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
    const [agent, maxSpend, dailyLimit, spentToday, availableToday, balance, paused, requests] = await Promise.all([
      vault.agent(),
      vault.maxSpendPerTx(),
      vault.dailyLimit(),
      vault.spentToday(),
      vault.availableToday(),
      vault.balance(),
      vault.paused(),
      readVaultRequests(vault),
    ]);

    const key = address.toLowerCase();
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
    const tx = await getVaultContract(vault.address, signer).setAgent(nextAgent);
    addActivity({
      title: "Agent update submitted",
      detail: `Waiting for ${shortHash(tx.hash)}`,
      hash: tx.hash,
      state: "warn",
    });
    await tx.wait();
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

    const approveTx = await usdc.approve(vault.address, amountUnits);
    addActivity({
      title: "USDC approval submitted",
      detail: `${formatUsdc(amount)} USDC allowance for ${shortHash(vault.address)}`,
      hash: approveTx.hash,
      state: "warn",
    });
    await approveTx.wait();

    const depositTx = await onchainVault.deposit(amountUnits);
    addActivity({
      title: "Deposit submitted",
      detail: `${formatUsdc(amount)} USDC moving into ${vault.agentName}`,
      hash: depositTx.hash,
      state: "warn",
    });
    await depositTx.wait();
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
    const tx = await getVaultContract(vault.address, signer).withdraw(toUnits(amount));
    addActivity({
      title: "Withdrawal submitted",
      detail: `${formatUsdc(amount)} USDC returning to owner`,
      hash: tx.hash,
      state: "warn",
    });
    await tx.wait();
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
    if (recipient && !ethers.isAddress(recipient)) throw new Error("Approved recipient must be a full 0x address");
    await ensureWallet();
    const contract = getVaultContract(vault.address, signer);
    const policyTx = await contract.setPolicy(toUnits(maxSpend), toUnits(dailyLimit));
    addActivity({
      title: "Policy update submitted",
      detail: `${formatUsdc(maxSpend)} USDC max action, ${formatUsdc(dailyLimit)} USDC daily limit`,
      hash: policyTx.hash,
      state: "warn",
    });
    await policyTx.wait();

    if (
      recipient &&
      !vault.recipients.some((item) => normalizeRecipient(item).address.toLowerCase() === recipient.toLowerCase())
    ) {
      const allowTx = await contract.setRecipientAllowed(recipient, true);
      addActivity({
        title: "Recipient approval submitted",
        detail: `${shortHash(recipient)} added to allowlist`,
        hash: allowTx.hash,
        state: "warn",
      });
      await allowTx.wait();
      vault.recipients.push({
        name: recipientName || shortHash(recipient),
        address: ethers.getAddress(recipient),
      });
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
      vault.recipients.push({
        name: recipientName || (ethers.isAddress(recipient) ? shortHash(recipient) : recipient),
        address: recipient,
      });
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
  const hash = await metadataHash({ recipient, amount, reason, createdAt: new Date().toISOString() });

  if (!recipient) throw new Error("Add an approved recipient before testing agent spend");
  if (amount <= 0) throw new Error("Payment amount must be greater than zero");

  if (isOnchainVault(vault)) {
    if (!ethers.isAddress(recipient)) throw new Error("Payment recipient must be a full 0x address");
    await ensureWallet();
    const tx = await getVaultContract(vault.address, signer).initiatePayment(recipient, toUnits(amount), hash);
    setText("decisionTitle", "Submitted");
    setText("decisionText", "Waiting for Arc Testnet finality.");
    addActivity({
      title: "Payment submitted",
      detail: `${formatUsdc(amount)} USDC to ${shortHash(recipient)}`,
      hash: tx.hash,
      state: "warn",
    });

    const receipt = await tx.wait();
    const outcome = parsePaymentOutcome(receipt, vault.address);
    await refreshOnchainVaults();

    if (outcome.executed) {
      setText("decisionTitle", "Executed");
      setText("decisionText", "Recipient, amount, and daily budget passed onchain policy checks.");
      addActivity({
        title: "Payment executed",
        detail: `${formatUsdc(amount)} USDC paid to ${shortHash(recipient)}`,
        hash: tx.hash,
        state: "ok",
      });
      return;
    }

    setText("decisionTitle", "Approval required");
    setText("decisionText", outcome.requestId ? `Request #${outcome.requestId} was queued onchain.` : "Payment was queued for approval.");
    addActivity({
      title: "Approval requested",
      detail: `${formatUsdc(amount)} USDC to ${shortHash(recipient)} requires owner approval`,
      hash: tx.hash,
      state: "warn",
    });
    return;
  }

  const available = vault.dailyLimit - vault.spentToday;
  if (vault.paused || !recipientAllowed(vault, recipient) || amount > vault.maxSpend || amount > available) {
    const requestId = String((vault.pendingRequests || []).length + 1);
    vault.pendingRequests ||= [];
    vault.pendingRequests.push(
      normalizeRequest({
        id: requestId,
        recipient,
        amount,
        metadataHash: hash,
        status: 1,
        createdAt: Math.floor(Date.now() / 1000),
        decidedAt: 0,
      }),
    );

    setText("decisionTitle", "Approval required");
    setText("decisionText", `Request #${requestId} was queued for owner review.`);
    addActivity({
      title: "Approval requested",
      detail: `Request #${requestId}: ${formatUsdc(amount)} USDC to ${recipient}`,
      hash,
      state: "warn",
    });
    return;
  }

  vault.balance = Math.max(vault.balance - amount, 0);
  vault.spentToday += amount;
  setText("decisionTitle", "Executed");
  setText("decisionText", "Recipient, amount, and daily budget passed policy checks.");
  addActivity({
    title: "Payment executed",
    detail: `${formatUsdc(amount)} USDC paid to ${recipient}`,
    hash,
    state: "ok",
  });
}

async function runRiskyDemo() {
  const vault = activeVault();
  if (!hasActiveVault()) throw new Error("Create or select a vault before running the demo");
  if (!vault.recipients.length) throw new Error("Add an approved recipient before running the demo");

  const recipient = normalizeRecipient(vault.recipients[0]);
  const riskyAmount = vault.maxSpend > 0 ? vault.maxSpend + 1 : Math.max(vault.dailyLimit + 1, 1);

  const select = $("paymentRecipient");
  if (select) select.value = recipient.address;
  setValue("paymentAmount", riskyAmount);
  setValue("paymentReason", "Demo: request premium data above policy limit");

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
    const tx = vault.paused
      ? await getVaultContract(vault.address, signer).unpause()
      : await getVaultContract(vault.address, signer).pause();
    addActivity({
      title: willPause ? "Pause submitted" : "Unpause submitted",
      detail: `Waiting for ${shortHash(tx.hash)}`,
      hash: tx.hash,
      state: "warn",
    });
    await tx.wait();
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
    eyebrow: "Remove recipient",
    title: `Remove ${shortHash(button.dataset.recipient)}?`,
    text: "The agent will no longer be able to pay this recipient automatically.",
    acceptLabel: "Remove",
  });
}

async function removeRecipientConfirmed(recipientToRemove) {
  const vault = activeVault();
  if (isOnchainVault(vault) && ethers.isAddress(recipientToRemove)) {
    await ensureWallet();
    const tx = await getVaultContract(vault.address, signer).setRecipientAllowed(recipientToRemove, false);
    addActivity({
      title: "Recipient removal submitted",
      detail: `${shortHash(recipientToRemove)} will be removed from allowlist`,
      hash: tx.hash,
      state: "warn",
    });
    await tx.wait();
  }

  vault.recipients = vault.recipients.filter(
    (recipient) => normalizeRecipient(recipient).address.toLowerCase() !== recipientToRemove.toLowerCase(),
  );
  syncActiveMetadata();
  addActivity({
    title: "Recipient removed",
    detail: `${shortHash(recipientToRemove)} removed from allowlist`,
    hash: "local",
    state: "warn",
  });
}

async function refreshRequests() {
  if (isOnchainVault()) {
    await refreshOnchainVaults();
    addActivity({
      title: "Requests refreshed",
      detail: "Approval queue synced from Arc Testnet",
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

    await tx.wait();
    await refreshOnchainVaults();

    addActivity({
      title: requestActionTitle(action),
      detail: `Request #${requestId} for ${formatUsdc(request.amount)} USDC`,
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
    detail: `Request #${requestId} for ${formatUsdc(request.amount)} USDC`,
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
  if (state.connectedAccount && hasFactory()) {
    await ensureWallet();
    const agentInput = $("agentSigner")?.value.trim();
    const agent = ethers.isAddress(agentInput) ? ethers.getAddress(agentInput) : state.connectedAccount;
    const maxSpend = Number($("maxSpend")?.value || 1);
    const dailyLimit = Number($("dailyLimit")?.value || 5);
    const factory = getFactory(signer);
    const tx = await factory.createVault(agent, toUnits(maxSpend), toUnits(dailyLimit));
    addActivity({
      title: "Vault creation submitted",
      detail: `Agent signer ${shortHash(agent)}`,
      hash: tx.hash,
      state: "warn",
    });
    await tx.wait();
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
bind("vaultForm", "submit", (event) => runAction(() => updateVault(event)));
bind("policyForm", "submit", (event) => runAction(() => updatePolicy(event)));
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
bind("approvalQueue", "click", handleRequestAction);
bind("cancelConfirm", "click", closeConfirm);
bind("acceptConfirm", "click", acceptConfirm);
bind("confirmOverlay", "click", closeConfirmOnBackdrop);
bind("openTour", "click", () => openTour(0));
bind("prevTour", "click", () => changeTourStep(-1));
bind("nextTour", "click", () => changeTourStep(1));
bind("skipTour", "click", () => closeTour(true));

document.addEventListener("click", applyDepositPreset);
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
