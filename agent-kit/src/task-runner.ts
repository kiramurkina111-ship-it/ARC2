import { AgentVaultClient, type PaymentOutcome, type VaultStatus } from "./client.js";

export interface AgentTaskDefinition {
  taskId: string;
  title: string;
  brief: string;
  budgetUsdc: string;
  recipient: string;
  amountUsdc: string;
  service?: string | undefined;
}

export interface TaskPolicyCheck {
  key: "signer" | "vault" | "task_budget" | "recipient" | "action_limit" | "daily_limit" | "balance";
  label: string;
  passed: boolean;
  severity: "block" | "review";
  detail: string;
}

export interface TaskRunPlan {
  taskId: string;
  title: string;
  status: "ready" | "review" | "blocked";
  recipient: string;
  amountUsdc: string;
  budgetUsdc: string;
  checks: TaskPolicyCheck[];
  vault: VaultStatus;
}

export interface TaskRunReceipt {
  taskId: string;
  title: string;
  status: "completed" | "approval_required";
  plan: TaskRunPlan;
  payment: PaymentOutcome;
}

export class AgentTaskRunner {
  constructor(readonly vault: AgentVaultClient) {}

  async plan(task: AgentTaskDefinition): Promise<TaskRunPlan> {
    const [vault, recipient] = await Promise.all([
      this.vault.getStatus(),
      this.vault.checkRecipient(task.recipient)
    ]);
    const amount = parseAmount(task.amountUsdc, "amountUsdc");
    const budget = parseAmount(task.budgetUsdc, "budgetUsdc");
    const balance = Number(vault.balanceUsdc);
    const maxAction = Number(vault.maxSpendPerTxUsdc);
    const availableToday = vault.availableTodayUsdc === null ? Number.POSITIVE_INFINITY : Number(vault.availableTodayUsdc);

    const checks: TaskPolicyCheck[] = [
      {
        key: "signer",
        label: "Agent signer",
        passed: vault.signerAuthorized,
        severity: "block",
        detail: vault.signerAuthorized ? "Configured signer is authorized" : "Configured signer is not the vault owner or agent"
      },
      {
        key: "vault",
        label: "Vault state",
        passed: !vault.paused,
        severity: "block",
        detail: vault.paused ? "Vault is paused" : "Vault is active"
      },
      {
        key: "task_budget",
        label: "Task budget",
        passed: amount <= budget,
        severity: "block",
        detail: `${task.amountUsdc} USDC planned inside ${task.budgetUsdc} USDC task budget`
      },
      {
        key: "recipient",
        label: "Approved recipient",
        passed: recipient.allowed,
        severity: "review",
        detail: recipient.allowed ? "Recipient is approved" : "Recipient requires owner review"
      },
      {
        key: "action_limit",
        label: "Per-action limit",
        passed: maxAction === 0 || amount <= maxAction,
        severity: "review",
        detail: maxAction === 0 ? "No per-action ceiling" : `${task.amountUsdc} of ${vault.maxSpendPerTxUsdc} USDC`
      },
      {
        key: "daily_limit",
        label: "Daily budget",
        passed: amount <= availableToday,
        severity: "review",
        detail: vault.availableTodayUsdc === null ? "No daily ceiling" : `${vault.availableTodayUsdc} USDC available today`
      },
      {
        key: "balance",
        label: "Vault balance",
        passed: amount <= balance,
        severity: "block",
        detail: `${vault.balanceUsdc} USDC available in the vault`
      }
    ];

    const blocked = checks.some(check => !check.passed && check.severity === "block");
    const review = checks.some(check => !check.passed && check.severity === "review");
    return {
      taskId: requireText(task.taskId, "taskId"),
      title: requireText(task.title, "title"),
      status: blocked ? "blocked" : review ? "review" : "ready",
      recipient: recipient.recipient,
      amountUsdc: task.amountUsdc,
      budgetUsdc: task.budgetUsdc,
      checks,
      vault
    };
  }

  async settle(task: AgentTaskDefinition): Promise<TaskRunReceipt> {
    const plan = await this.plan(task);
    if (plan.status === "blocked") {
      const failed = plan.checks.filter(check => !check.passed).map(check => check.detail).join("; ");
      throw new Error(`Task run is blocked: ${failed}`);
    }

    const payment = await this.vault.initiatePayment({
      recipient: task.recipient,
      amountUsdc: task.amountUsdc,
      reason: task.brief,
      taskId: task.taskId,
      service: task.service
    });
    return {
      taskId: task.taskId,
      title: task.title,
      status: payment.executed ? "completed" : "approval_required",
      plan,
      payment
    };
  }
}

function parseAmount(value: string, name: string): number {
  const amount = Number(requireText(value, name));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${name} must be greater than zero`);
  return amount;
}

function requireText(value: string, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}
