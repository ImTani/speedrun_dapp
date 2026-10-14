// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin-contracts/access/AccessControl.sol";
import {ERC1155} from "@openzeppelin-contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin-contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/// @title Badges — soulbound achievement tokens.
/// @notice Token id = (kind << 8) | tier. A player holds each (kind, tier) at most once. Kinds marked
/// unique are 1-of-1: only one account can ever hold them. Transfers and approvals are disabled.
/// @dev Which kinds exist and what earns them is decided off-chain by the runner's badge engine;
/// this contract only enforces soulbinding, uniqueness, and single ownership per id.
contract Badges is ERC1155Supply, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(uint248 kind => bool) public isUnique;

    event UniqueKindSet(uint248 indexed kind);

    error Soulbound();
    error AlreadyHeld(address account, uint256 id);
    error UniqueTaken(uint256 id);
    error UniqueMustBeTierZero();

    constructor(address admin, address minter, string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
    }

    function badgeId(uint248 kind, uint8 tier) public pure returns (uint256) {
        return (uint256(kind) << 8) | tier;
    }

    /// @notice Irreversibly marks a kind as 1-of-1. Must be set before any of it is minted.
    function setUnique(uint248 kind) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isUnique[kind] = true;
        emit UniqueKindSet(kind);
    }

    function setURI(string calldata uri_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(uri_);
    }

    /// @notice Mints several badges to one player in a single call (one UserOp after a bout).
    function mintBatch(address to, uint256[] calldata ids) external onlyRole(MINTER_ROLE) {
        uint256[] memory amounts = new uint256[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            if (balanceOf(to, id) != 0) revert AlreadyHeld(to, id);
            uint248 kind = uint248(id >> 8);
            if (isUnique[kind]) {
                if (uint8(id) != 0) revert UniqueMustBeTierZero();
                if (totalSupply(id) != 0) revert UniqueTaken(id);
            }
            amounts[i] = 1;
        }
        _mintBatch(to, ids, amounts, "");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert Soulbound();
    }

    /// @dev Only mints (from == 0) pass; transfers and burns revert.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (from != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
