// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentVault} from "./AgentVault.sol";

contract AgentVaultFactory {
    address public immutable usdc;
    mapping(address => address[]) private ownerVaults;

    error ZeroAddress();

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address indexed agent,
        uint256 maxSpendPerTx,
        uint256 dailyLimit
    );

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
    }

    function createVault(address agent, uint256 maxSpendPerTx, uint256 dailyLimit)
        external
        returns (address vault)
    {
        AgentVault agentVault = new AgentVault(usdc, msg.sender, agent, maxSpendPerTx, dailyLimit);
        vault = address(agentVault);
        ownerVaults[msg.sender].push(vault);

        emit VaultCreated(msg.sender, vault, agent, maxSpendPerTx, dailyLimit);
    }

    function vaultsOf(address owner) external view returns (address[] memory) {
        return ownerVaults[owner];
    }
}
