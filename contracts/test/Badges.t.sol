// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin-contracts/access/IAccessControl.sol";
import {Badges} from "../src/Badges.sol";

contract BadgesTest is Test {
    Badges badges;
    address admin = makeAddr("admin");
    address minter = makeAddr("minter");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        badges = new Badges(admin, minter, "https://example.invalid/badges/{id}.json");
    }

    function _ids(uint256 a) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](1);
        ids[0] = a;
    }

    function test_idEncodesKindAndTier() public view {
        assertEq(badges.badgeId(7, 2), (7 << 8) | 2);
    }

    function test_mintBatch_mintsEachIdOnce() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = badges.badgeId(1, 0);
        ids[1] = badges.badgeId(1, 1);
        vm.prank(minter);
        badges.mintBatch(alice, ids);
        assertEq(badges.balanceOf(alice, ids[0]), 1);
        assertEq(badges.balanceOf(alice, ids[1]), 1);

        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(Badges.AlreadyHeld.selector, alice, ids[0]));
        badges.mintBatch(alice, _ids(ids[0]));
    }

    function test_onlyMinterMints() public {
        uint256 id = badges.badgeId(1, 0);
        bytes32 role = badges.MINTER_ROLE(); // read before prank: prank binds to the next call
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, role
            )
        );
        badges.mintBatch(alice, _ids(id));
    }

    function test_soulbound_noTransfersNoApprovals() public {
        uint256 id = badges.badgeId(1, 0);
        vm.prank(minter);
        badges.mintBatch(alice, _ids(id));

        vm.prank(alice);
        vm.expectRevert(Badges.Soulbound.selector);
        badges.safeTransferFrom(alice, bob, id, 1, "");

        vm.prank(alice);
        vm.expectRevert(Badges.Soulbound.selector);
        badges.setApprovalForAll(bob, true);
    }

    function test_uniqueKind_isOneOfOne() public {
        vm.prank(admin);
        badges.setUnique(99);
        uint256 id = badges.badgeId(99, 0);

        vm.prank(minter);
        badges.mintBatch(alice, _ids(id));
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(Badges.UniqueTaken.selector, id));
        badges.mintBatch(bob, _ids(id));

        uint256 tierOne = badges.badgeId(99, 1);
        vm.prank(minter);
        vm.expectRevert(Badges.UniqueMustBeTierZero.selector);
        badges.mintBatch(bob, _ids(tierOne));
    }

    function test_onlyAdminConfigures() public {
        vm.prank(minter);
        vm.expectRevert();
        badges.setUnique(1);
    }
}
