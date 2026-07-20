import { ContractTransactionResponse, JsonRpcProvider, Wallet } from "ethers";
import type { AgentKitConfig } from "./config.js";
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
export declare class AgentVaultClient {
    readonly provider: JsonRpcProvider;
    readonly signer: Wallet;
    readonly vault: AgentVaultContract;
    readonly config: AgentKitConfig;
    constructor(config: AgentKitConfig);
    getStatus(): Promise<VaultStatus>;
    checkRecipient(recipient: string): Promise<{
        recipient: string;
        allowed: boolean;
    }>;
    getPaymentRequest(requestId: string | number | bigint): Promise<PaymentRequestView>;
    initiatePayment(input: InitiatePaymentInput): Promise<PaymentOutcome>;
    requestPayment(input: InitiatePaymentInput): Promise<PaymentOutcome>;
    cancelPaymentRequest(requestId: string | number | bigint): Promise<{
        txHash: string;
        explorerUrl: string;
    }>;
    private assertExpectedNetwork;
    private assertSignerAuthorized;
}
export declare function createMetadataHash(metadata: PaymentMetadata): string;
export {};
//# sourceMappingURL=client.d.ts.map