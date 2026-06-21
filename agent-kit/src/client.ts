import {
  Contract,
  ContractTransactionResponse,
  Interface,
  JsonRpcProvider,
  TransactionReceipt,
  Wallet,
  formatUnits,
  getAddress,
  isAddress,
  keccak256,
  parseUnits,
  toUtf8Bytes
} from "ethers";
import { agentVaultAbi, requestStatusNames } from "./abi.js";
import type { AgentKitConfig } from "./config.js";

const USDC_DECIMALS = 6;

export interface PaymentMetadata {
  reason: string;
  taskId?: string | undefined;
  service?: string | undefined;
  createdAt?: string | undefined;
}

export interface InitiatePaymentInput {
  recipient: string;
  amountUsdc: string;
  reason: string;
  taskId?: string | undefined;
  service?: string | undefined;
}

export interface PaymentOutcome {
  txHash: string;
  explorerUrl: string;
  metadataHash: string;
  executed: boolean;
  requestId: string | null;
}

export interface VaultStatus {
  vaultAddress: string;
  owner: string;
  agent: string;
  connectedSigner: string;
  signerAuthorized: boolean;
  paused: boolean;
  balanceUsdc: string;
  maxSpendPerTxUsdc: string;
  dailyLimitUsdc: string;
  spentTodayUsdc: string;
  availableTodayUsdc: string | null;
  nextRequestId: string;
  chainId: number;
}

export interface PaymentRequestView {
  requestId: string;
  recipient: string;
  amountUsdc: string;
  metadataHash: string;
  status: string;
  createdAt: string | null;
  decidedAt: string | null;
}

interface AgentVaultContract {
  owner(): Promise<string>;
  agent(): Promise<string>;
  paused(): Promise<boolean>;
  balance(): Promise<bigint>;
  maxSpendPerTx(): Promise<bigint>;
  dailyLimit(): Promise<bigint>;
  spentToday(): Promise<bigint>;
  currentDay(): Promise<bigint>;
  availableToday(): Promise<bigint>;
  allowedRecipients(recipient: string): Promise<boolean>;
  nextRequestId(): Promise<bigint>;
  paymentRequests(requestId: bigint): Promise<any>;
  initiatePayment(recipient: string, amount: bigint, metadataHash: string): Promise<ContractTransactionResponse>;
  requestPayment(recipient: string, amount: bigint, metadataHash: string): Promise<ContractTransactionResponse>;
  cancelRequest(requestId: bigint): Promise<ContractTransactionResponse>;
}

export class AgentVaultClient {
  readonly provider: JsonRpcProvider;
  readonly signer: Wallet;
  readonly vault: AgentVaultContract;
  readonly config: AgentKitConfig;

  constructor(config: AgentKitConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
    this.signer = new Wallet(config.agentPrivateKey, this.provider);
    this.vault = new Contract(config.vaultAddress, agentVaultAbi, this.signer) as unknown as AgentVaultContract;
  }

  async getStatus(): Promise<VaultStatus> {
    await this.assertExpectedNetwork();
    const [owner, agent, paused, balance, maxSpend, dailyLimit, storedSpentToday, currentDay, availableToday, nextRequestId] =
      await Promise.all([
        this.vault.owner(),
        this.vault.agent(),
        this.vault.paused(),
        this.vault.balance(),
        this.vault.maxSpendPerTx(),
        this.vault.dailyLimit(),
        this.vault.spentToday(),
        this.vault.currentDay(),
        this.vault.availableToday(),
        this.vault.nextRequestId()
      ]);

    const signerAddress = await this.signer.getAddress();
    const unlimitedDailyBudget = availableToday > 10n ** 30n;
    const chainDay = BigInt(Math.floor(Date.now() / 86_400_000));
    const effectiveSpentToday = currentDay === chainDay ? storedSpentToday : 0n;

    return {
      vaultAddress: this.config.vaultAddress,
      owner: getAddress(owner),
      agent: getAddress(agent),
      connectedSigner: signerAddress,
      signerAuthorized:
        signerAddress.toLowerCase() === String(owner).toLowerCase() ||
        signerAddress.toLowerCase() === String(agent).toLowerCase(),
      paused,
      balanceUsdc: formatUsdc(balance),
      maxSpendPerTxUsdc: formatUsdc(maxSpend),
      dailyLimitUsdc: formatUsdc(dailyLimit),
      spentTodayUsdc: formatUsdc(effectiveSpentToday),
      availableTodayUsdc: unlimitedDailyBudget ? null : formatUsdc(availableToday),
      nextRequestId: nextRequestId.toString(),
      chainId: this.config.chainId
    };
  }

  async checkRecipient(recipient: string): Promise<{ recipient: string; allowed: boolean }> {
    assertAddress(recipient, "recipient");
    return {
      recipient: getAddress(recipient),
      allowed: await this.vault.allowedRecipients(recipient)
    };
  }

  async getPaymentRequest(requestId: string | number | bigint): Promise<PaymentRequestView> {
    const normalizedId = normalizeRequestId(requestId);
    const request = await this.vault.paymentRequests(normalizedId);
    const statusIndex = Number(request.status ?? request[3]);

    return {
      requestId: normalizedId.toString(),
      recipient: getAddress(request.recipient ?? request[0]),
      amountUsdc: formatUsdc(request.amount ?? request[1]),
      metadataHash: request.metadataHash ?? request[2],
      status: requestStatusNames[statusIndex] ?? "Unknown",
      createdAt: timestampToIso(request.createdAt ?? request[4]),
      decidedAt: timestampToIso(request.decidedAt ?? request[5])
    };
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentOutcome> {
    assertAddress(input.recipient, "recipient");
    await this.assertSignerAuthorized();

    const amount = parseUsdc(input.amountUsdc);
    const metadataHash = createMetadataHash({
      reason: requireText(input.reason, "reason"),
      taskId: input.taskId,
      service: input.service,
      createdAt: new Date().toISOString()
    });

    const tx = await this.vault.initiatePayment(getAddress(input.recipient), amount, metadataHash);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Payment transaction was not mined");

    const outcome = parsePaymentOutcome(receipt, this.config.vaultAddress);
    return {
      txHash: receipt.hash,
      explorerUrl: `${this.config.explorerUrl}/tx/${receipt.hash}`,
      metadataHash,
      ...outcome
    };
  }

  async requestPayment(input: InitiatePaymentInput): Promise<PaymentOutcome> {
    assertAddress(input.recipient, "recipient");
    await this.assertSignerAuthorized();

    const metadataHash = createMetadataHash({
      reason: requireText(input.reason, "reason"),
      taskId: input.taskId,
      service: input.service,
      createdAt: new Date().toISOString()
    });
    const tx = await this.vault.requestPayment(
      getAddress(input.recipient),
      parseUsdc(input.amountUsdc),
      metadataHash
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Payment request transaction was not mined");

    const outcome = parsePaymentOutcome(receipt, this.config.vaultAddress);
    return {
      txHash: receipt.hash,
      explorerUrl: `${this.config.explorerUrl}/tx/${receipt.hash}`,
      metadataHash,
      ...outcome
    };
  }

  async cancelPaymentRequest(requestId: string | number | bigint): Promise<{ txHash: string; explorerUrl: string }> {
    await this.assertSignerAuthorized();
    const normalizedId = normalizeRequestId(requestId);
    const request = await this.getPaymentRequest(normalizedId);
    if (request.status !== "Pending") {
      throw new Error(`Request #${normalizedId} is ${request.status}, not Pending`);
    }

    const tx = await this.vault.cancelRequest(normalizedId);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Cancellation transaction was not mined");

    return {
      txHash: receipt.hash,
      explorerUrl: `${this.config.explorerUrl}/tx/${receipt.hash}`
    };
  }

  private async assertExpectedNetwork(): Promise<void> {
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) {
      throw new Error(`RPC is connected to chain ${network.chainId}, expected ${this.config.chainId}`);
    }
  }

  private async assertSignerAuthorized(): Promise<void> {
    const status = await this.getStatus();
    if (!status.signerAuthorized) {
      throw new Error(
        `Configured signer ${status.connectedSigner} is neither owner ${status.owner} nor agent ${status.agent}`
      );
    }
    if (status.paused) throw new Error("Vault is paused");
  }
}

export function createMetadataHash(metadata: PaymentMetadata): string {
  const normalized = {
    reason: requireText(metadata.reason, "reason"),
    taskId: metadata.taskId?.trim() || null,
    service: metadata.service?.trim() || null,
    createdAt: metadata.createdAt || new Date().toISOString()
  };
  return keccak256(toUtf8Bytes(JSON.stringify(normalized)));
}

function parsePaymentOutcome(
  receipt: TransactionReceipt,
  vaultAddress: string
): { executed: boolean; requestId: string | null } {
  const iface = new Interface(agentVaultAbi);
  let executed = false;
  let requestId: string | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== vaultAddress.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PaymentExecuted") executed = true;
      if (parsed?.name === "PaymentRequested") requestId = parsed.args.requestId.toString();
    } catch {
      // Ignore logs that do not belong to AgentVault ABI.
    }
  }

  return { executed, requestId };
}

function parseUsdc(value: string): bigint {
  const normalized = requireText(value, "amountUsdc");
  const amount = parseUnits(normalized, USDC_DECIMALS);
  if (amount <= 0n) throw new Error("amountUsdc must be greater than zero");
  return amount;
}

function formatUsdc(value: bigint): string {
  return formatUnits(value, USDC_DECIMALS);
}

function normalizeRequestId(value: string | number | bigint): bigint {
  const requestId = BigInt(value);
  if (requestId <= 0n) throw new Error("requestId must be greater than zero");
  return requestId;
}

function timestampToIso(value: bigint): string | null {
  if (value === 0n) return null;
  return new Date(Number(value) * 1000).toISOString();
}

function assertAddress(value: string, name: string): void {
  if (!isAddress(value)) throw new Error(`${name} must be a valid 0x address`);
}

function requireText(value: string, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}
