// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Arena} from "../src/Arena.sol";

/// Exposes the internal shuffle so its output can be pinned and mirrored in TypeScript.
contract ArenaHarness is Arena {
    constructor(address o, address op, address reg) Arena(o, op, reg, 60, 60) {}

    function permutation(bytes32 seed, uint256 n) external pure returns (uint256[] memory) {
        return _permutation(seed, n);
    }
}

contract ArenaTest is Test {
    ArenaHarness arena;

    address owner = makeAddr("owner");
    address operator = makeAddr("operator");
    uint256 registrarKey = 0xA11CE;
    address registrar;

    // TitForTat, forgiveness 15, retaliation 2, memory 4, opening random, noise 5 — the same
    // vector as packages/strategies/test (encodeConfig → 0x050204020f02).
    uint64 constant TFT = 0x050204020f02;
    uint64 constant ALWAYS_C = 0x0000_0a01_0000; // strategy 0, retaliation 1, memory 10

    uint8 constant C = 0;
    uint8 constant D = 1;

    function setUp() public {
        registrar = vm.addr(registrarKey);
        arena = new ArenaHarness(owner, operator, registrar);
        vm.roll(100); // so blockhash(block.number - 1) is defined
    }

    // ───────────── helpers ─────────────

    function _attest(address agent, address agentOwner, uint256 deadline, uint256 key)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash =
            keccak256(abi.encode(arena.REGISTER_TYPEHASH(), agent, agentOwner, deadline));
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", arena.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _newAgent(string memory name) internal returns (address agent) {
        agent = makeAddr(string.concat("agent-", name));
        address agentOwner = makeAddr(string.concat("owner-", name));
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _attest(agent, agentOwner, deadline, registrarKey);
        vm.prank(agent);
        arena.registerAgent(agentOwner, TFT, deadline, sig);
        vm.prank(agentOwner);
        arena.confirmAgent(agent);
    }

    function _agents(uint256 n) internal returns (address[] memory list) {
        list = new address[](n);
        for (uint256 i; i < n; ++i) {
            list[i] = _newAgent(vm.toString(i));
        }
    }

    function _open(address[] memory list, uint8 k, uint8 m) internal returns (uint256 boutId) {
        vm.prank(operator);
        boutId = arena.openBout(list, k, m);
    }

    function _salt(address agent, uint256 round) internal pure returns (bytes32) {
        return keccak256(abi.encode("salt", agent, round));
    }

    function _commit(uint256 boutId, uint256 round, address[] memory list, uint256 idx, uint8 move)
        internal
    {
        bytes32 c = arena.commitmentFor(move, _salt(list[idx], round), list[idx], boutId, round);
        vm.prank(list[idx]);
        arena.commit(boutId, round, idx, c);
    }

    function _reveal(uint256 boutId, uint256 round, address[] memory list, uint256 idx, uint8 move)
        internal
    {
        vm.prank(list[idx]);
        arena.reveal(boutId, round, idx, move, _salt(list[idx], round));
    }

    function _points(uint256 boutId, uint256 idx) internal view returns (uint256) {
        return arena.boutPoints(boutId, idx);
    }

    // ───────────── registration ─────────────

    function test_register_requiresRegistrarAttestation() public {
        address agent = makeAddr("a");
        address agentOwner = makeAddr("o");
        uint256 deadline = block.timestamp + 1;
        bytes memory forged = _attest(agent, agentOwner, deadline, 0xBAD);
        vm.prank(agent);
        vm.expectRevert(Arena.BadAttestation.selector);
        arena.registerAgent(agentOwner, TFT, deadline, forged);
    }

    function test_register_attestationBindsTheCallingAccount() public {
        // A griefer can't reuse an attestation issued for someone else's agent address.
        address agent = makeAddr("a");
        address agentOwner = makeAddr("o");
        uint256 deadline = block.timestamp + 1;
        bytes memory sig = _attest(agent, agentOwner, deadline, registrarKey);
        vm.prank(makeAddr("griefer"));
        vm.expectRevert(Arena.BadAttestation.selector);
        arena.registerAgent(agentOwner, TFT, deadline, sig);
    }

    function test_register_expiredAttestationReverts() public {
        address agent = makeAddr("a");
        uint256 deadline = block.timestamp + 1;
        bytes memory sig = _attest(agent, makeAddr("o"), deadline, registrarKey);
        vm.warp(deadline + 1);
        vm.prank(agent);
        vm.expectRevert(Arena.AttestationExpired.selector);
        arena.registerAgent(makeAddr("o"), TFT, deadline, sig);
    }

    function test_register_twiceReverts() public {
        address agent = _newAgent("x");
        (address agentOwner,,,,,) = arena.agents(agent);
        uint256 deadline = block.timestamp + 1;
        bytes memory sig = _attest(agent, agentOwner, deadline, registrarKey);
        vm.prank(agent);
        vm.expectRevert(Arena.AlreadyRegistered.selector);
        arena.registerAgent(agentOwner, TFT, deadline, sig);
    }

    function test_confirm_onlyOwnerAndOneAgentPerOwner() public {
        address agentOwner = makeAddr("o");
        address a1 = makeAddr("a1");
        address a2 = makeAddr("a2");
        uint256 deadline = block.timestamp + 1;
        // Build signatures before vm.prank: prank applies to the next call, which would otherwise be
        // the REGISTER_TYPEHASH() read inside _attest.
        bytes memory sig1 = _attest(a1, agentOwner, deadline, registrarKey);
        bytes memory sig2 = _attest(a2, agentOwner, deadline, registrarKey);
        vm.prank(a1);
        arena.registerAgent(agentOwner, TFT, deadline, sig1);
        vm.prank(a2);
        arena.registerAgent(agentOwner, TFT, deadline, sig2);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Arena.NotAgentOwner.selector);
        arena.confirmAgent(a1);

        vm.prank(agentOwner);
        arena.confirmAgent(a1);
        vm.prank(agentOwner);
        vm.expectRevert(Arena.OwnerHasAgent.selector);
        arena.confirmAgent(a2);
        assertEq(arena.agentOf(agentOwner), a1);
    }

    function test_config_boundsEnforced() public {
        address agent = makeAddr("a");
        address agentOwner = makeAddr("o");
        uint256 deadline = block.timestamp + 1;
        bytes memory sig = _attest(agent, agentOwner, deadline, registrarKey);
        uint64[5] memory bad = [
            uint64(0x07), // strategy 7 doesn't exist
            uint64(0x0000_0a00_0000), // retaliation 0
            uint64(0x1500_0a01_0002), // noise 21
            uint64(0x0000_0b01_0002), // memory 11
            uint64(0x01_0000_0a01_0002) // stray high bits
        ];
        for (uint256 i; i < bad.length; ++i) {
            vm.prank(agent);
            vm.expectRevert(Arena.InvalidConfig.selector);
            arena.registerAgent(agentOwner, bad[i], deadline, sig);
        }
    }

    function test_retune_ownerOnly_andLockedDuringBout() public {
        address[] memory list = _agents(2);
        (address agentOwner,,,,,) = arena.agents(list[0]);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Arena.NotAgentOwner.selector);
        arena.retune(ALWAYS_C);

        vm.prank(agentOwner);
        arena.retune(ALWAYS_C);
        (, uint64 config,,,,) = arena.agents(list[0]);
        assertEq(config, ALWAYS_C);

        _open(list, 1, 1);
        vm.prank(agentOwner);
        vm.expectRevert(Arena.BoutInProgress.selector);
        arena.retune(TFT);
    }

    // ───────────── bout lifecycle ─────────────

    function test_fullBout_scoresAndCloses() public {
        address[] memory list = _agents(4);
        uint256 boutId = _open(list, 2, 1);

        for (uint256 round; round < 2; ++round) {
            vm.prank(operator);
            arena.startRound(boutId);
            // Everyone defects in round 0, cooperates in round 1.
            uint8 move = round == 0 ? D : C;
            for (uint256 i; i < 4; ++i) {
                _commit(boutId, round, list, i, move);
            }
            // All paired agents committed, so reveals open before the commit deadline.
            for (uint256 i; i < 4; ++i) {
                _reveal(boutId, round, list, i, move);
            }
            vm.prank(operator);
            arena.finalize(boutId, round); // early finalize: every pair already scored
        }

        for (uint256 i; i < 4; ++i) {
            assertEq(_points(boutId, i), 1 + 3, "punishment then reward");
        }
        vm.prank(operator);
        arena.closeBout(boutId);
        assertFalse(arena.boutActive());
    }

    function test_payoffMatrix() public {
        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 1, 1);
        vm.prank(operator);
        arena.startRound(boutId);
        _commit(boutId, 0, list, 0, D);
        _commit(boutId, 0, list, 1, C);
        _reveal(boutId, 0, list, 0, D);
        _reveal(boutId, 0, list, 1, C);
        assertEq(_points(boutId, 0), 5);
        assertEq(_points(boutId, 1), 0);
    }

    function test_missedReveal_revealerGetsForfeitWin_nonRevealerStrike() public {
        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 1, 1);
        vm.prank(operator);
        arena.startRound(boutId);
        _commit(boutId, 0, list, 0, C);
        _commit(boutId, 0, list, 1, D);
        _reveal(boutId, 0, list, 0, C); // agent 1 withholds

        vm.prank(operator);
        vm.expectRevert(Arena.RoundStillOpen.selector);
        arena.finalize(boutId, 0);

        vm.warp(block.timestamp + 121);
        vm.prank(operator);
        arena.finalize(boutId, 0);
        assertEq(_points(boutId, 0), 5, "revealer gets FORFEIT_WIN");
        assertEq(_points(boutId, 1), 0);
        (,,,, uint8 strikes,) = arena.agents(list[1]);
        assertEq(strikes, 1);
    }

    /// The audit's griefing case: the last revealer sees the opponent defected and withholds.
    /// Withholding must never leave the opponent worse off than an honest reveal would.
    function testFuzz_withholdingNeverHurtsTheRevealer(uint8 rawA, uint8 rawB) public {
        uint8 a = rawA % 2;
        uint8 b = rawB % 2;
        // Honest outcome for the revealer (agent 0).
        uint256 honest = a == C ? (b == C ? 3 : 0) : (b == C ? 5 : 1);

        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 1, 1);
        vm.prank(operator);
        arena.startRound(boutId);
        _commit(boutId, 0, list, 0, a);
        _commit(boutId, 0, list, 1, b);
        _reveal(boutId, 0, list, 0, a);
        vm.warp(block.timestamp + 121);
        vm.prank(operator);
        arena.finalize(boutId, 0);
        assertGe(_points(boutId, 0), honest);
    }

    function test_threeMissedRevealsSuspend() public {
        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 3, 1);
        for (uint256 round; round < 3; ++round) {
            vm.prank(operator);
            arena.startRound(boutId);
            vm.warp(block.timestamp + 121); // nobody commits
            vm.prank(operator);
            arena.finalize(boutId, round);
        }
        (,,, bool suspended, uint8 strikes,) = arena.agents(list[0]);
        assertTrue(suspended);
        assertEq(strikes, 3);

        vm.prank(operator);
        arena.closeBout(boutId);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(Arena.NotEligible.selector, list[0]));
        arena.openBout(list, 1, 1);
    }

    function test_oddAgentSitsOut() public {
        address[] memory list = _agents(3);
        uint256 boutId = _open(list, 1, 1);
        vm.prank(operator);
        arena.startRound(boutId);
        uint256 sitter = type(uint256).max;
        for (uint256 i; i < 3; ++i) {
            (, bool paired) = arena.partnerOf(boutId, 0, i);
            if (!paired) sitter = i;
        }
        assertLt(sitter, 3, "exactly one agent sits out");
        bytes32 c = arena.commitmentFor(C, bytes32(0), list[sitter], boutId, 0);
        vm.prank(list[sitter]);
        vm.expectRevert(Arena.SitsOut.selector);
        arena.commit(boutId, 0, sitter, c);
    }

    function test_commitRevealGuards() public {
        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 1, 1);
        vm.prank(operator);
        arena.startRound(boutId);

        // Wrong index hint.
        vm.prank(list[0]);
        vm.expectRevert(Arena.WrongAgentIndex.selector);
        arena.commit(boutId, 0, 1, bytes32(uint256(1)));

        _commit(boutId, 0, list, 0, C);
        // Duplicate commit (restart-safety: a re-sent op must revert, not overwrite).
        vm.prank(list[0]);
        vm.expectRevert(Arena.AlreadyCommitted.selector);
        arena.commit(boutId, 0, 0, bytes32(uint256(1)));

        // Reveal not open: only one of two paired agents committed, deadline not reached.
        vm.prank(list[0]);
        vm.expectRevert(Arena.RevealPhaseNotOpen.selector);
        arena.reveal(boutId, 0, 0, C, _salt(list[0], 0));

        _commit(boutId, 0, list, 1, C);
        // Revealing a different move than committed.
        vm.prank(list[0]);
        vm.expectRevert(Arena.BadReveal.selector);
        arena.reveal(boutId, 0, 0, D, _salt(list[0], 0));

        _reveal(boutId, 0, list, 0, C);
        vm.prank(list[0]);
        vm.expectRevert(Arena.AlreadyRevealed.selector);
        arena.reveal(boutId, 0, 0, C, _salt(list[0], 0));

        // Commits close at the deadline (checked before anything else about the entry).
        vm.warp(block.timestamp + 61);
        vm.prank(list[1]);
        vm.expectRevert(Arena.CommitPhaseClosed.selector);
        arena.commit(boutId, 0, 1, bytes32(uint256(2)));
    }

    function test_lifecycleOrdering() public {
        address[] memory list = _agents(2);
        uint256 boutId = _open(list, 2, 1);

        vm.prank(operator);
        vm.expectRevert(Arena.BoutInProgress.selector);
        arena.openBout(list, 1, 1);

        vm.prank(operator);
        arena.startRound(boutId);
        vm.prank(operator);
        vm.expectRevert(Arena.RoundOutOfOrder.selector);
        arena.startRound(boutId); // previous round not finalized

        vm.prank(operator);
        vm.expectRevert(Arena.BoutUnfinished.selector);
        arena.closeBout(boutId);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Arena.NotOperator.selector);
        arena.startRound(boutId);
    }

    function test_pairingFixedWithinMatch_reseededPerMatch() public {
        address[] memory list = _agents(6);
        uint256 boutId = _open(list, 2, 2);
        vm.prank(operator);
        arena.startRound(boutId); // round 0 = match 0, move 0
        bytes32 seed0 = arena.matchSeed(boutId, 0);
        vm.warp(block.timestamp + 121);
        vm.prank(operator);
        arena.finalize(boutId, 0);
        vm.roll(block.number + 5);
        vm.prank(operator);
        arena.startRound(boutId); // round 1 = match 0, move 1: same seed
        assertEq(arena.matchSeed(boutId, 0), seed0);
        (uint256 p0,) = arena.partnerOf(boutId, 0, 0);
        (uint256 p1,) = arena.partnerOf(boutId, 1, 0);
        assertEq(p0, p1, "same opponent for every move of a match");
    }

    // ───────────── cross-language vectors ─────────────

    /// Pinned output mirrored in packages/strategies/test/pairings.test.ts.
    function test_permutationVector() public view {
        uint256[] memory perm = arena.permutation(keccak256("arena"), 7);
        uint256[7] memory expected = [uint256(6), 3, 1, 0, 2, 4, 5];
        for (uint256 i; i < 7; ++i) {
            assertEq(perm[i], expected[i]);
        }
    }

    function testFuzz_permutationIsAPermutation(bytes32 seed, uint8 rawN) public view {
        uint256 n = bound(rawN, 1, 64);
        uint256[] memory perm = arena.permutation(seed, n);
        bool[] memory seen = new bool[](n);
        for (uint256 i; i < n; ++i) {
            assertFalse(seen[perm[i]]);
            seen[perm[i]] = true;
        }
    }
}
