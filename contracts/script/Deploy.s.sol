// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Arena} from "../src/Arena.sol";
import {Badges} from "../src/Badges.sol";

/// @notice Deploys Arena and Badges. Roles come from the environment (see apps/runner/scripts/roles.ts):
///   OPERATOR   the runner's smart account: Arena operator and Badges minter
///   REGISTRAR  the off-chain attestation signer
///   COMMIT_WINDOW / REVEAL_WINDOW  seconds (owner can change later)
///   BADGE_URI  ERC-1155 metadata URI (admin can change later)
/// The broadcaster becomes Arena's owner and Badges' admin. Addresses are written to deployments/<chainid>.json.
contract Deploy is Script {
    function run() external returns (Arena arena, Badges badges) {
        address operator = vm.envAddress("OPERATOR");
        address registrar = vm.envAddress("REGISTRAR");
        uint32 commitWindow = uint32(vm.envOr("COMMIT_WINDOW", uint256(600)));
        uint32 revealWindow = uint32(vm.envOr("REVEAL_WINDOW", uint256(600)));
        string memory badgeUri = vm.envOr("BADGE_URI", string(""));

        vm.startBroadcast();
        address owner = msg.sender;
        arena = new Arena(owner, operator, registrar, commitWindow, revealWindow);
        badges = new Badges(owner, operator, badgeUri);
        vm.stopBroadcast();

        string memory k = "deployment";
        vm.serializeAddress(k, "owner", owner);
        vm.serializeAddress(k, "operator", operator);
        vm.serializeAddress(k, "registrar", registrar);
        vm.serializeAddress(k, "arena", address(arena));
        vm.serializeUint(k, "block", block.number);
        string memory json = vm.serializeAddress(k, "badges", address(badges));
        vm.writeJson(json, string.concat("deployments/", vm.toString(block.chainid), ".json"));
        console.log("Arena ", address(arena));
        console.log("Badges", address(badges));
    }
}
