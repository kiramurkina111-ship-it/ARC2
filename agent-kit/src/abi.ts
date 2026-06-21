export const agentVaultAbi = [
  "function owner() view returns (address)",
  "function agent() view returns (address)",
  "function paused() view returns (bool)",
  "function balance() view returns (uint256)",
  "function maxSpendPerTx() view returns (uint256)",
  "function dailyLimit() view returns (uint256)",
  "function spentToday() view returns (uint256)",
  "function currentDay() view returns (uint256)",
  "function availableToday() view returns (uint256)",
  "function allowedRecipients(address recipient) view returns (bool)",
  "function nextRequestId() view returns (uint256)",
  "function paymentRequests(uint256 requestId) view returns (address recipient,uint256 amount,bytes32 metadataHash,uint8 status,uint64 createdAt,uint64 decidedAt)",
  "function initiatePayment(address recipient,uint256 amount,bytes32 metadataHash) returns (uint256 requestId,bool executed)",
  "function requestPayment(address recipient,uint256 amount,bytes32 metadataHash) returns (uint256 requestId)",
  "function cancelRequest(uint256 requestId)",
  "event PaymentExecuted(address indexed recipient,uint256 amount,bytes32 metadataHash)",
  "event PaymentRequested(uint256 indexed requestId,address indexed recipient,uint256 amount,bytes32 metadataHash)",
  "event PaymentCancelled(uint256 indexed requestId,address indexed caller)"
] as const;

export const requestStatusNames = [
  "None",
  "Pending",
  "Approved",
  "Rejected",
  "Executed",
  "Cancelled"
] as const;
