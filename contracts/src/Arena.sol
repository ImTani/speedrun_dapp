// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable2Step, Ownable} from "@openzeppelin-contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin-contracts/utils/cryptography/ECDSA.sol";

/// @title Arena — iterated Prisoner's Dilemma between autonomous agents.
/// @notice Agents are ERC-4337 smart accounts driven by an off-chain runner. Each bout is M matches
/// of k moves; every move is a commit then a reveal. A bout runs as a sequence of rounds, where
/// round r is move (r % k) of match (r / k). Pairings are fixed per match from a blockhash seed
/// captured in `startRound`.
/// @dev On Avalanche C-Chain `block.prevrandao` is always 1 (coreth README), so the seed is
/// `blockhash(block.number - 1)` captured at round start — manipulable by a block producer, which is
/// acceptable because nothing of value is at stake.
contract Arena is Ownable2Step, EIP712 {
    // ───────────────────────────── types ─────────────────────────────

    struct Agent {
        address owner; // player's smart account (set at registration, confirmed by the owner)
        uint64 config; // packed strategy + knobs, layout mirrored in @arena/strategies
        bool confirmed;
        bool suspended;
        uint8 strikes; // consecutive missed reveals
        uint64 lifetimePoints;
    }

    struct Bout {
        uint8 movesPerMatch; // k
        uint8 matches; // M
        uint32 roundsPlayed; // rounds finalized so far
        bool active;
        address[] agents; // participants, snapshotted at openBout
    }

    struct Round {
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint32 commits;
        bool started;
        bool finalized;
    }

    struct Entry {
        bytes32 commitment;
        uint8 move;
        bool revealed;
        bool scored;
    }

    // ───────────────────────────── constants ─────────────────────────────

    uint8 public constant COOPERATE = 0;
    uint8 public constant DEFECT = 1;

    uint8 public constant REWARD = 3;
    uint8 public constant PUNISHMENT = 1;
    uint8 public constant SUCKER = 0;
    uint8 public constant TEMPTATION = 5;
    /// @notice Points for revealing when the opponent did not. Equal to the best possible payoff so
    /// withholding a reveal can never lower the opponent's score (see PLAN audit item 3).
    uint8 public constant FORFEIT_WIN = TEMPTATION;

    uint8 public constant MAX_STRIKES = 3;

    bytes32 public constant REGISTER_TYPEHASH =
        keccak256("Register(address agent,address owner,uint256 deadline)");

    // Knob bounds — must match KNOB_BOUNDS in @arena/strategies.
    uint8 internal constant MAX_STRATEGY = 6;
    uint8 internal constant MAX_FORGIVENESS = 100;
    uint8 internal constant MIN_RETALIATION = 1;
    uint8 internal constant MAX_RETALIATION = 5;
    uint8 internal constant MIN_MEMORY = 1;
    uint8 internal constant MAX_MEMORY = 10;
    uint8 internal constant MAX_OPENING = 2;
    uint8 internal constant MAX_NOISE = 20;

    // ───────────────────────────── storage ─────────────────────────────

    /// @notice Account allowed to drive bouts (the runner's smart account).
    address public operator;
    /// @notice Key whose EIP-712 signature attests that an agent account belongs to our runner.
    /// v1 only accepts runner-hosted agents; clearing this check is how the arena would be opened.
    address public registrar;

    uint32 public commitWindow;
    uint32 public revealWindow;

    mapping(address agent => Agent) public agents;
    mapping(address owner => address agent) public agentOf;

    uint256 public boutCount;
    /// @notice True while any bout is running; retunes are locked so configs can't change mid-bout.
    bool public boutActive;

    mapping(uint256 boutId => Bout) internal _bouts;
    mapping(uint256 boutId => mapping(uint256 round => Round)) public rounds;
    mapping(uint256 boutId => mapping(uint256 matchIndex => bytes32)) public matchSeed;
    mapping(uint256 boutId => mapping(uint256 round => mapping(uint256 idx => Entry))) public
        entries;
    mapping(uint256 boutId => mapping(uint256 idx => uint256)) public boutPoints;

    // ───────────────────────────── events ─────────────────────────────

    event OperatorSet(address operator);
    event RegistrarSet(address registrar);
    event WindowsSet(uint32 commitWindow, uint32 revealWindow);
    event AgentRegistered(address indexed agent, address indexed owner, uint64 config);
    event AgentConfirmed(address indexed agent, address indexed owner);
    event AgentRetuned(address indexed agent, uint64 config);
    event AgentSuspended(address indexed agent, bool suspended);
    event BoutOpened(uint256 indexed boutId, address[] agents, uint8 movesPerMatch, uint8 matches);
    event RoundStarted(
        uint256 indexed boutId,
        uint256 indexed round,
        bytes32 matchSeed,
        uint64 commitDeadline,
        uint64 revealDeadline
    );
    event Committed(uint256 indexed boutId, uint256 indexed round, address indexed agent);
    event Revealed(
        uint256 indexed boutId, uint256 indexed round, address indexed agent, uint8 move
    );
    event PairScored(
        uint256 indexed boutId,
        uint256 indexed round,
        address agentA,
        address agentB,
        uint8 moveA,
        uint8 moveB,
        uint8 pointsA,
        uint8 pointsB,
        bool forfeit
    );
    event RoundFinalized(uint256 indexed boutId, uint256 indexed round);
    event BoutClosed(uint256 indexed boutId);

    // ───────────────────────────── errors ─────────────────────────────

    error NotOperator();
    error NotAgentOwner();
    error InvalidConfig();
    error BadAttestation();
    error AttestationExpired();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyConfirmed();
    error OwnerHasAgent();
    error BoutInProgress();
    error NoActiveBout();
    error BadBoutShape();
    error NotEligible(address agent);
    error DuplicateAgent(address agent);
    error RoundOutOfOrder();
    error RoundNotStarted();
    error RoundAlreadyFinalized();
    error CommitPhaseClosed();
    error RevealPhaseNotOpen();
    error RevealPhaseClosed();
    error AlreadyCommitted();
    error NotCommitted();
    error AlreadyRevealed();
    error BadReveal();
    error WrongAgentIndex();
    error SitsOut();
    error RoundStillOpen();
    error BoutUnfinished();
    error AllRoundsPlayed();
    error BadWindows();

    // ───────────────────────────── setup ─────────────────────────────

    constructor(
        address initialOwner,
        address operator_,
        address registrar_,
        uint32 commitWindow_,
        uint32 revealWindow_
    ) Ownable(initialOwner) EIP712("Arena", "1") {
        operator = operator_;
        registrar = registrar_;
        _setWindows(commitWindow_, revealWindow_);
        emit OperatorSet(operator_);
        emit RegistrarSet(registrar_);
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    function setOperator(address operator_) external onlyOwner {
        operator = operator_;
        emit OperatorSet(operator_);
    }

    function setRegistrar(address registrar_) external onlyOwner {
        registrar = registrar_;
        emit RegistrarSet(registrar_);
    }

    function setWindows(uint32 commitWindow_, uint32 revealWindow_) external onlyOwner {
        _setWindows(commitWindow_, revealWindow_);
    }

    function _setWindows(uint32 commitWindow_, uint32 revealWindow_) internal {
        if (commitWindow_ == 0 || revealWindow_ == 0) revert BadWindows();
        commitWindow = commitWindow_;
        revealWindow = revealWindow_;
        emit WindowsSet(commitWindow_, revealWindow_);
    }

    // ───────────────────────────── agents ─────────────────────────────

    /// @notice Called by the agent's own smart account, so an address can't be registered without
    /// its consent. `attestation` is the registrar's EIP-712 signature over (agent, owner, deadline).
    function registerAgent(
        address owner,
        uint64 config,
        uint256 deadline,
        bytes calldata attestation
    ) external {
        if (block.timestamp > deadline) revert AttestationExpired();
        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(REGISTER_TYPEHASH, msg.sender, owner, deadline)));
        if (ECDSA.recover(digest, attestation) != registrar) revert BadAttestation();
        if (agents[msg.sender].owner != address(0)) revert AlreadyRegistered();
        _validateConfig(config);

        agents[msg.sender] = Agent({
            owner: owner,
            config: config,
            confirmed: false,
            suspended: false,
            strikes: 0,
            lifetimePoints: 0
        });
        emit AgentRegistered(msg.sender, owner, config);
    }

    /// @notice The owner accepts the agent. One agent per owner.
    function confirmAgent(address agent) external {
        Agent storage a = agents[agent];
        if (a.owner == address(0)) revert NotRegistered();
        if (a.owner != msg.sender) revert NotAgentOwner();
        if (a.confirmed) revert AlreadyConfirmed();
        if (agentOf[msg.sender] != address(0)) revert OwnerHasAgent();
        a.confirmed = true;
        agentOf[msg.sender] = agent;
        emit AgentConfirmed(agent, msg.sender);
    }

    /// @notice Owner changes their agent's strategy/knobs. Locked while a bout is running.
    function retune(uint64 config) external {
        if (boutActive) revert BoutInProgress();
        address agent = agentOf[msg.sender];
        if (agent == address(0)) revert NotAgentOwner();
        _validateConfig(config);
        agents[agent].config = config;
        emit AgentRetuned(agent, config);
    }

    function setSuspended(address agent, bool suspended) external onlyOperator {
        Agent storage a = agents[agent];
        if (a.owner == address(0)) revert NotRegistered();
        a.suspended = suspended;
        if (!suspended) a.strikes = 0;
        emit AgentSuspended(agent, suspended);
    }

    function _validateConfig(uint64 config) internal pure {
        uint8 strategy = uint8(config);
        uint8 forgiveness = uint8(config >> 8);
        uint8 retaliation = uint8(config >> 16);
        uint8 memory_ = uint8(config >> 24);
        uint8 opening = uint8(config >> 32);
        uint8 noise = uint8(config >> 40);
        if (
            config >> 48 != 0 || strategy > MAX_STRATEGY || forgiveness > MAX_FORGIVENESS
                || retaliation < MIN_RETALIATION || retaliation > MAX_RETALIATION
                || memory_ < MIN_MEMORY || memory_ > MAX_MEMORY || opening > MAX_OPENING
                || noise > MAX_NOISE
        ) revert InvalidConfig();
    }

    // ───────────────────────────── bouts ─────────────────────────────

    function openBout(address[] calldata participants, uint8 movesPerMatch, uint8 matches)
        external
        onlyOperator
        returns (uint256 boutId)
    {
        if (boutActive) revert BoutInProgress();
        if (participants.length < 2 || movesPerMatch == 0 || matches == 0) revert BadBoutShape();

        boutId = ++boutCount;
        Bout storage b = _bouts[boutId];
        for (uint256 i; i < participants.length; ++i) {
            address agent = participants[i];
            Agent storage a = agents[agent];
            if (!a.confirmed || a.suspended) revert NotEligible(agent);
            // O(n²) duplicate check is fine at arena sizes (tens of agents) and avoids extra storage.
            for (uint256 j; j < i; ++j) {
                if (participants[j] == agent) revert DuplicateAgent(agent);
            }
            b.agents.push(agent);
        }
        b.movesPerMatch = movesPerMatch;
        b.matches = matches;
        b.active = true;
        boutActive = true;
        emit BoutOpened(boutId, participants, movesPerMatch, matches);
    }

    /// @notice Starts the next round. The first move of each match fixes that match's pairing seed.
    function startRound(uint256 boutId) external onlyOperator {
        Bout storage b = _bouts[boutId];
        if (!b.active) revert NoActiveBout();
        uint256 round = b.roundsPlayed;
        if (round >= uint256(b.movesPerMatch) * b.matches) revert AllRoundsPlayed();
        Round storage r = rounds[boutId][round];
        if (r.started) revert RoundOutOfOrder();

        uint256 matchIndex = round / b.movesPerMatch;
        bytes32 seed = matchSeed[boutId][matchIndex];
        if (round % b.movesPerMatch == 0) {
            seed = keccak256(abi.encode(blockhash(block.number - 1), boutId, matchIndex));
            matchSeed[boutId][matchIndex] = seed;
        }

        r.started = true;
        r.commitDeadline = uint64(block.timestamp + commitWindow);
        r.revealDeadline = uint64(block.timestamp + commitWindow + revealWindow);
        emit RoundStarted(boutId, round, seed, r.commitDeadline, r.revealDeadline);
    }

    /// @notice Agent commits `keccak256(abi.encode(move, salt, agent, boutId, round))`.
    /// @param idx The caller's index in the bout's participant list (calldata hint, verified).
    function commit(uint256 boutId, uint256 round, uint256 idx, bytes32 commitment) external {
        Bout storage b = _bouts[boutId];
        _checkIndex(b, idx);
        Round storage r = _openRound(boutId, round);
        if (block.timestamp > r.commitDeadline) revert CommitPhaseClosed();
        (, bool paired) = _partnerOf(b, boutId, round, idx);
        if (!paired) revert SitsOut();

        Entry storage e = entries[boutId][round][idx];
        if (e.commitment != bytes32(0)) revert AlreadyCommitted();
        e.commitment = commitment;
        unchecked {
            ++r.commits;
        }
        emit Committed(boutId, round, msg.sender);
    }

    function reveal(uint256 boutId, uint256 round, uint256 idx, uint8 move, bytes32 salt) external {
        Bout storage b = _bouts[boutId];
        _checkIndex(b, idx);
        Round storage r = _openRound(boutId, round);
        if (!_revealOpen(b, r)) revert RevealPhaseNotOpen();
        if (block.timestamp > r.revealDeadline) revert RevealPhaseClosed();

        Entry storage e = entries[boutId][round][idx];
        if (e.commitment == bytes32(0)) revert NotCommitted();
        if (e.revealed) revert AlreadyRevealed();
        if (move > DEFECT) revert BadReveal();
        if (keccak256(abi.encode(move, salt, msg.sender, boutId, round)) != e.commitment) {
            revert BadReveal();
        }
        e.move = move;
        e.revealed = true;
        emit Revealed(boutId, round, msg.sender, move);

        (uint256 partner,) = _partnerOf(b, boutId, round, idx);
        Entry storage p = entries[boutId][round][partner];
        if (p.revealed) _score(b, boutId, round, idx, partner, e, p);
    }

    /// @notice Scores any pairs that couldn't be scored by reveals (missed reveals) and closes the
    /// round. Callable once the reveal deadline passes, or early once every pair is scored.
    function finalize(uint256 boutId, uint256 round) external onlyOperator {
        Bout storage b = _bouts[boutId];
        if (!b.active) revert NoActiveBout();
        if (round != b.roundsPlayed) revert RoundOutOfOrder();
        Round storage r = rounds[boutId][round];
        if (!r.started) revert RoundNotStarted();
        if (r.finalized) revert RoundAlreadyFinalized();

        uint256[] memory perm =
            _permutation(matchSeed[boutId][round / b.movesPerMatch], b.agents.length);
        bool deadlinePassed = block.timestamp > r.revealDeadline;
        for (uint256 pos; pos + 1 < perm.length; pos += 2) {
            uint256 ia = perm[pos];
            uint256 ib = perm[pos + 1];
            Entry storage ea = entries[boutId][round][ia];
            Entry storage eb = entries[boutId][round][ib];
            if (ea.scored) continue;
            if (!deadlinePassed) revert RoundStillOpen();
            _scoreForfeit(b, boutId, round, ia, ib, ea, eb);
        }

        r.finalized = true;
        unchecked {
            ++b.roundsPlayed;
        }
        emit RoundFinalized(boutId, round);
    }

    function closeBout(uint256 boutId) external onlyOperator {
        Bout storage b = _bouts[boutId];
        if (!b.active) revert NoActiveBout();
        if (b.roundsPlayed != uint256(b.movesPerMatch) * b.matches) revert BoutUnfinished();
        b.active = false;
        boutActive = false;
        emit BoutClosed(boutId);
    }

    // ───────────────────────────── views ─────────────────────────────

    function boutInfo(uint256 boutId)
        external
        view
        returns (
            address[] memory participants,
            uint8 movesPerMatch,
            uint8 matches,
            uint32 roundsPlayed,
            bool active
        )
    {
        Bout storage b = _bouts[boutId];
        return (b.agents, b.movesPerMatch, b.matches, b.roundsPlayed, b.active);
    }

    /// @notice Opponent index for `idx` in `round`; `paired` is false for the odd agent out.
    function partnerOf(uint256 boutId, uint256 round, uint256 idx)
        external
        view
        returns (uint256 partner, bool paired)
    {
        return _partnerOf(_bouts[boutId], boutId, round, idx);
    }

    function commitmentFor(uint8 move, bytes32 salt, address agent, uint256 boutId, uint256 round)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(move, salt, agent, boutId, round));
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ───────────────────────────── internals ─────────────────────────────

    function _checkIndex(Bout storage b, uint256 idx) internal view {
        if (!b.active) revert NoActiveBout();
        if (idx >= b.agents.length || b.agents[idx] != msg.sender) revert WrongAgentIndex();
    }

    function _openRound(uint256 boutId, uint256 round) internal view returns (Round storage r) {
        r = rounds[boutId][round];
        if (!r.started) revert RoundNotStarted();
        if (r.finalized) revert RoundAlreadyFinalized();
    }

    /// @dev Reveals open at the commit deadline, or as soon as every paired agent has committed.
    function _revealOpen(Bout storage b, Round storage r) internal view returns (bool) {
        uint256 pairedCount = b.agents.length - (b.agents.length % 2);
        return block.timestamp > r.commitDeadline || r.commits == pairedCount;
    }

    function _partnerOf(Bout storage b, uint256 boutId, uint256 round, uint256 idx)
        internal
        view
        returns (uint256 partner, bool paired)
    {
        uint256 n = b.agents.length;
        uint256[] memory perm = _permutation(matchSeed[boutId][round / b.movesPerMatch], n);
        for (uint256 pos; pos < n; ++pos) {
            if (perm[pos] != idx) continue;
            if (pos == n - 1 && n % 2 == 1) return (0, false);
            return (perm[pos ^ 1], true);
        }
        revert WrongAgentIndex();
    }

    /// @dev Fisher–Yates over [0, n). Mirrored by `pairings` in @arena/strategies — any change here
    /// is a breaking change for the runner and for replay verification.
    function _permutation(bytes32 seed, uint256 n) internal pure returns (uint256[] memory perm) {
        perm = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            perm[i] = i;
        }
        for (uint256 i = n - 1; i > 0; --i) {
            uint256 j = uint256(keccak256(abi.encode(seed, i))) % (i + 1);
            (perm[i], perm[j]) = (perm[j], perm[i]);
        }
    }

    function _score(
        Bout storage b,
        uint256 boutId,
        uint256 round,
        uint256 ia,
        uint256 ib,
        Entry storage ea,
        Entry storage eb
    ) internal {
        (uint8 pa, uint8 pb) = _payoff(ea.move, eb.move);
        ea.scored = true;
        eb.scored = true;
        _credit(b, boutId, ia, pa, true);
        _credit(b, boutId, ib, pb, true);
        emit PairScored(boutId, round, b.agents[ia], b.agents[ib], ea.move, eb.move, pa, pb, false);
    }

    /// @dev Missed-reveal rule: a revealer gets FORFEIT_WIN, a non-revealer 0 and a strike.
    function _scoreForfeit(
        Bout storage b,
        uint256 boutId,
        uint256 round,
        uint256 ia,
        uint256 ib,
        Entry storage ea,
        Entry storage eb
    ) internal {
        uint8 pa = ea.revealed ? FORFEIT_WIN : 0;
        uint8 pb = eb.revealed ? FORFEIT_WIN : 0;
        ea.scored = true;
        eb.scored = true;
        _credit(b, boutId, ia, pa, ea.revealed);
        _credit(b, boutId, ib, pb, eb.revealed);
        emit PairScored(boutId, round, b.agents[ia], b.agents[ib], ea.move, eb.move, pa, pb, true);
    }

    function _credit(Bout storage b, uint256 boutId, uint256 idx, uint8 points, bool showedUp)
        internal
    {
        address agent = b.agents[idx];
        Agent storage a = agents[agent];
        if (points != 0) {
            boutPoints[boutId][idx] += points;
            a.lifetimePoints += points;
        }
        if (showedUp) {
            a.strikes = 0;
        } else if (++a.strikes >= MAX_STRIKES && !a.suspended) {
            a.suspended = true;
            emit AgentSuspended(agent, true);
        }
    }

    function _payoff(uint8 a, uint8 b) internal pure returns (uint8, uint8) {
        if (a == COOPERATE && b == COOPERATE) return (REWARD, REWARD);
        if (a == DEFECT && b == DEFECT) return (PUNISHMENT, PUNISHMENT);
        return a == DEFECT ? (TEMPTATION, SUCKER) : (SUCKER, TEMPTATION);
    }
}
