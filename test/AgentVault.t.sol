// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentVault} from "../contracts/AgentVault.sol";
import {AgentVaultFactory} from "../contracts/AgentVaultFactory.sol";

contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract AgentActor {
    function initiate(AgentVault vault, address recipient, uint256 amount, bytes32 metadataHash)
        external
        returns (uint256 requestId, bool executed)
    {
        return vault.initiatePayment(recipient, amount, metadataHash);
    }

    function execute(AgentVault vault, address recipient, uint256 amount, bytes32 metadataHash) external {
        vault.executePayment(recipient, amount, metadataHash);
    }
}

contract AgentVaultTest {
    MockUSDC private usdc;
    AgentActor private agent;
    AgentVault private vault;
    address private recipient = address(0xB0B);
    bytes32 private metadataHash = keccak256("task");

    function setUp() public {
        usdc = new MockUSDC();
        agent = new AgentActor();
        vault = new AgentVault(address(usdc), address(this), address(agent), 2_000000, 10_000000);

        usdc.mint(address(this), 100_000000);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(25_000000);
    }

    function testDepositAndWithdraw() external {
        setUp();

        require(usdc.balanceOf(address(vault)) == 25_000000, "deposit failed");
        vault.withdraw(5_000000);
        require(usdc.balanceOf(address(vault)) == 20_000000, "withdraw failed");
    }

    function testAgentCanExecutePolicyApprovedPayment() external {
        setUp();

        vault.setRecipientAllowed(recipient, true);
        agent.execute(vault, recipient, 1_000000, metadataHash);

        require(usdc.balanceOf(recipient) == 1_000000, "recipient not paid");
        require(vault.spentToday() == 1_000000, "spend not recorded");
    }

    function testInitiateQueuesApprovalWhenAmountExceedsPolicy() external {
        setUp();

        vault.setRecipientAllowed(recipient, true);
        (uint256 requestId, bool executed) = agent.initiate(vault, recipient, 3_000000, metadataHash);

        require(!executed, "should not execute");
        require(requestId == 1, "wrong request id");

        (address queuedRecipient, uint256 amount,, AgentVault.RequestStatus status,,) = vault.paymentRequests(requestId);
        require(queuedRecipient == recipient, "wrong recipient");
        require(amount == 3_000000, "wrong amount");
        require(status == AgentVault.RequestStatus.Pending, "not pending");
    }

    function testOwnerApprovalExecutesQueuedPayment() external {
        setUp();

        vault.setRecipientAllowed(recipient, true);
        (uint256 requestId,) = agent.initiate(vault, recipient, 3_000000, metadataHash);
        vault.approveRequest(requestId);

        require(usdc.balanceOf(recipient) == 3_000000, "approval did not pay");
        (,,, AgentVault.RequestStatus status,,) = vault.paymentRequests(requestId);
        require(status == AgentVault.RequestStatus.Executed, "not executed");
    }

    function testPauseBlocksAgentPayment() external {
        setUp();

        vault.setRecipientAllowed(recipient, true);
        vault.pause();

        try agent.execute(vault, recipient, 1_000000, metadataHash) {
            revert("pause did not block");
        } catch {}
    }
}

contract AgentVaultFactoryTest {
    function testFactoryCreatesVaultForOwner() external {
        MockUSDC usdc = new MockUSDC();
        AgentVaultFactory factory = new AgentVaultFactory(address(usdc));

        address vaultAddress = factory.createVault(address(0xA6E17), 1_000000, 5_000000);
        address[] memory vaults = factory.vaultsOf(address(this));

        require(vaults.length == 1, "vault not tracked");
        require(vaults[0] == vaultAddress, "wrong vault");

        AgentVault vault = AgentVault(vaultAddress);
        require(vault.owner() == address(this), "wrong owner");
        require(address(vault.usdc()) == address(usdc), "wrong usdc");
    }
}
