// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice M0 spike target: records who called, so a sponsored UserOp can be shown to execute
/// from the agent's smart account (msg.sender = account, not its owner EOA).
contract Probe {
    mapping(address caller => uint256) public pings;

    event Pinged(address indexed caller, uint256 count);

    function ping() external {
        emit Pinged(msg.sender, ++pings[msg.sender]);
    }
}
