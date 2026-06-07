// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentVault {
    enum RequestStatus {
        None,
        Pending,
        Approved,
        Rejected,
        Executed,
        Cancelled
    }

    struct PaymentRequest {
        address recipient;
        uint256 amount;
        bytes32 metadataHash;
        RequestStatus status;
        uint64 createdAt;
        uint64 decidedAt;
    }

    IERC20 public immutable usdc;
    address public owner;
    address public agent;
    uint256 public maxSpendPerTx;
    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public currentDay;
    bool public paused;
    uint256 public nextRequestId = 1;

    mapping(address => bool) public allowedRecipients;
    mapping(uint256 => PaymentRequest) public paymentRequests;

    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event AgentChanged(address indexed previousAgent, address indexed newAgent);
    event PolicyChanged(uint256 maxSpendPerTx, uint256 dailyLimit);
    event RecipientPolicyChanged(address indexed recipient, bool allowed);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event PaymentExecuted(address indexed recipient, uint256 amount, bytes32 metadataHash);
    event PaymentRequested(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bytes32 metadataHash
    );
    event PaymentApproved(uint256 indexed requestId, address indexed owner);
    event PaymentRejected(uint256 indexed requestId, address indexed owner);
    event PaymentCancelled(uint256 indexed requestId, address indexed caller);
    event Paused(address indexed caller);
    event Unpaused(address indexed caller);

    error NotOwner();
    error NotAgentOrOwner();
    error ZeroAddress();
    error PausedVault();
    error InvalidAmount();
    error RecipientNotAllowed();
    error MaxSpendExceeded();
    error DailyLimitExceeded();
    error RequestNotPending();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgentOrOwner() {
        if (msg.sender != agent && msg.sender != owner) revert NotAgentOrOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedVault();
        _;
    }

    constructor(address usdc_, address owner_, address agent_, uint256 maxSpendPerTx_, uint256 dailyLimit_) {
        if (usdc_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        owner = owner_;
        agent = agent_;
        maxSpendPerTx = maxSpendPerTx_;
        dailyLimit = dailyLimit_;
        currentDay = block.timestamp / 1 days;

        emit OwnerChanged(address(0), owner_);
        emit AgentChanged(address(0), agent_);
        emit PolicyChanged(maxSpendPerTx_, dailyLimit_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnerChanged(previousOwner, newOwner);
    }

    function setAgent(address newAgent) external onlyOwner {
        address previousAgent = agent;
        agent = newAgent;
        emit AgentChanged(previousAgent, newAgent);
    }

    function setPolicy(uint256 maxSpendPerTx_, uint256 dailyLimit_) external onlyOwner {
        maxSpendPerTx = maxSpendPerTx_;
        dailyLimit = dailyLimit_;
        emit PolicyChanged(maxSpendPerTx_, dailyLimit_);
    }

    function setRecipientAllowed(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        allowedRecipients[recipient] = allowed;
        emit RecipientPolicyChanged(recipient, allowed);
    }

    function deposit(uint256 amount) external whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (!usdc.transfer(owner, amount)) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    function executePayment(address recipient, uint256 amount, bytes32 metadataHash)
        external
        onlyAgentOrOwner
        whenNotPaused
    {
        _executePolicyPayment(recipient, amount, metadataHash);
    }

    function initiatePayment(address recipient, uint256 amount, bytes32 metadataHash)
        external
        onlyAgentOrOwner
        whenNotPaused
        returns (uint256 requestId, bool executed)
    {
        if (_canExecutePayment(recipient, amount)) {
            _executePolicyPayment(recipient, amount, metadataHash);
            return (0, true);
        }

        requestId = _createPaymentRequest(recipient, amount, metadataHash);
        return (requestId, false);
    }

    function requestPayment(address recipient, uint256 amount, bytes32 metadataHash)
        external
        onlyAgentOrOwner
        whenNotPaused
        returns (uint256 requestId)
    {
        requestId = _createPaymentRequest(recipient, amount, metadataHash);
    }

    function approveRequest(uint256 requestId) external onlyOwner whenNotPaused {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.status != RequestStatus.Pending) revert RequestNotPending();

        request.status = RequestStatus.Approved;
        request.decidedAt = uint64(block.timestamp);
        emit PaymentApproved(requestId, msg.sender);

        _recordDailySpend(request.amount, false);
        _spend(request.recipient, request.amount, request.metadataHash);
        request.status = RequestStatus.Executed;
    }

    function rejectRequest(uint256 requestId) external onlyOwner {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.status != RequestStatus.Pending) revert RequestNotPending();

        request.status = RequestStatus.Rejected;
        request.decidedAt = uint64(block.timestamp);
        emit PaymentRejected(requestId, msg.sender);
    }

    function cancelRequest(uint256 requestId) external onlyAgentOrOwner {
        PaymentRequest storage request = paymentRequests[requestId];
        if (request.status != RequestStatus.Pending) revert RequestNotPending();

        request.status = RequestStatus.Cancelled;
        request.decidedAt = uint64(block.timestamp);
        emit PaymentCancelled(requestId, msg.sender);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function availableToday() external view returns (uint256) {
        if (dailyLimit == 0) return type(uint256).max;
        uint256 day = block.timestamp / 1 days;
        if (day != currentDay) return dailyLimit;
        if (spentToday >= dailyLimit) return 0;
        return dailyLimit - spentToday;
    }

    function _executePolicyPayment(address recipient, uint256 amount, bytes32 metadataHash) internal {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (!allowedRecipients[recipient]) revert RecipientNotAllowed();
        if (maxSpendPerTx != 0 && amount > maxSpendPerTx) revert MaxSpendExceeded();

        _recordDailySpend(amount, true);

        _spend(recipient, amount, metadataHash);
    }

    function _canExecutePayment(address recipient, uint256 amount) internal view returns (bool) {
        if (recipient == address(0) || amount == 0) return false;
        if (!allowedRecipients[recipient]) return false;
        if (maxSpendPerTx != 0 && amount > maxSpendPerTx) return false;

        uint256 day = block.timestamp / 1 days;
        uint256 spent = day == currentDay ? spentToday : 0;
        if (dailyLimit != 0 && spent + amount > dailyLimit) return false;

        return true;
    }

    function _createPaymentRequest(address recipient, uint256 amount, bytes32 metadataHash)
        internal
        returns (uint256 requestId)
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        requestId = nextRequestId++;
        paymentRequests[requestId] = PaymentRequest({
            recipient: recipient,
            amount: amount,
            metadataHash: metadataHash,
            status: RequestStatus.Pending,
            createdAt: uint64(block.timestamp),
            decidedAt: 0
        });

        emit PaymentRequested(requestId, recipient, amount, metadataHash);
    }

    function _spend(address recipient, uint256 amount, bytes32 metadataHash) internal {
        if (!usdc.transfer(recipient, amount)) revert TransferFailed();
        emit PaymentExecuted(recipient, amount, metadataHash);
    }

    function _recordDailySpend(uint256 amount, bool enforceLimit) internal {
        _refreshDailySpend();
        if (enforceLimit && dailyLimit != 0 && spentToday + amount > dailyLimit) {
            revert DailyLimitExceeded();
        }
        spentToday += amount;
    }

    function _refreshDailySpend() internal {
        uint256 day = block.timestamp / 1 days;
        if (day != currentDay) {
            currentDay = day;
            spentToday = 0;
        }
    }
}
