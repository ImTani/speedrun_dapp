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
/// @dev Gas layout. Every move is a sponsored UserOp billed by gas, so storage is laid out to be
/// rewritten rather than freshly allocated (a fresh slot costs ~22k, a rewrite ~5k):
/// - only one bout runs at a time, and its header, round, seats and pairing live in fixed slots
///   that the next bout overwrites; past bouts are read from events;
/// - each agent has one commitment slot and one play slot, tagged with (boutId, round) so stale
///   values from earlier rounds are recognised and ignored;
/// - the pairing is computed once per match and stored packed, one byte per seat.
/// On Avalanche C-Chain `block.prevrandao` is always 1 (coreth README), so the seed is
/// `blockhash(block.number - 1)` captured at round start: manipulable by a block producer, which is
/// acceptable because nothing of value is at stake.
contract Arena is Ownable2Step, EIP712 {
    // ───────────────────────────── types ─────────────────────────────

    struct Agent {
        address owner; // player's smart account (set at registration, confirmed by the owner)
        uint64 config; // packed strategy + knobs, layout mirrored in @arena/strategies
        bool confirmed;
        bool suspended;
    }

    /// @dev The running (or most recent) bout. One slot.
    struct BoutState {
        bool active;
        uint8 movesPerMatch; // k
        uint8 matches; // M
        uint16 size; // participants
        uint32 roundsPlayed; // rounds finalized so far
        uint32 seedMatch; // match index `currentSeed` and the stored pairing belong to
    }

    /// @dev The current round of the current bout. One slot, tagged with its (boutId, round).
    struct Round {
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint32 commits;
        uint32 boutId;
        uint32 round;
        bool started;
        bool finalized;
    }

    /// @dev An agent's latest commitment. One slot; a 192-bit commitment is ample for a game
    /// with nothing of value at stake.
    struct Seat {
        bytes24 commitment;
        uint32 boutId;
        uint32 round;
    }

    /// @dev An agent's latest move and running totals. One slot, so scoring is a single write.
    /// (boutId, round) tag the move fields; `points` and the history bits are per bout and per
    /// match and are reset when the tag moves to a new bout or match.
    struct Play {
        uint32 boutId;
        uint32 round;
        uint8 move;
        bool revealed;
        bool scored;
        uint32 points; // this bout
        uint16 histMoves; // bit j: move j of the current match was DEFECT
        uint16 histMask; // bit j: move j of the current match was revealed
        uint8 strikes; // consecutive missed reveals
        uint64 lifetimePoints;
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
    /// @notice Per-match history is kept in 16-bit fields.
    uint8 public constant MAX_MOVES_PER_MATCH = 16;
    /// @notice Pairing entries are one byte each, with 0xFF meaning "sits out".
    uint16 public constant MAX_PARTICIPANTS = 255;
    uint8 internal constant SITS_OUT = 0xFF;

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

    mapping(address agent => Agent) internal _agents;
    mapping(address owner => address agent) public agentOf;

    uint256 public boutCount;
    BoutState internal _bout;
    Round internal _round;
    /// @notice Pairing seed of the current match (see `matchSeed`).
    bytes32 public currentSeed;
    mapping(uint256 idx => address agent) internal _seat;
    /// @dev Partner index per seat, 32 seats per word, SITS_OUT for the odd agent out.
    mapping(uint256 word => uint256 packed) internal _pairing;
    mapping(address agent => Seat) internal _seats;
    mapping(address agent => Play) internal _plays;

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
    error NotCurrentMatch();

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
        if (_agents[msg.sender].owner != address(0)) revert AlreadyRegistered();
        _validateConfig(config);

        _agents[msg.sender] =
            Agent({owner: owner, config: config, confirmed: false, suspended: false});
        emit AgentRegistered(msg.sender, owner, config);
    }

    /// @notice The owner accepts the agent. One agent per owner.
    function confirmAgent(address agent) external {
        Agent storage a = _agents[agent];
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
        if (_bout.active) revert BoutInProgress();
        address agent = agentOf[msg.sender];
        if (agent == address(0)) revert NotAgentOwner();
        _validateConfig(config);
        _agents[agent].config = config;
        emit AgentRetuned(agent, config);
    }

    function setSuspended(address agent, bool suspended) external onlyOperator {
        Agent storage a = _agents[agent];
        if (a.owner == address(0)) revert NotRegistered();
        a.suspended = suspended;
        if (!suspended) _plays[agent].strikes = 0;
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
        if (_bout.active) revert BoutInProgress();
        uint256 n = participants.length;
        if (
            n < 2 || n > MAX_PARTICIPANTS || movesPerMatch == 0
                || movesPerMatch > MAX_MOVES_PER_MATCH || matches == 0
        ) revert BadBoutShape();

        boutId = ++boutCount;
        for (uint256 i; i < n; ++i) {
            address agent = participants[i];
            Agent storage a = _agents[agent];
            if (!a.confirmed || a.suspended) revert NotEligible(agent);
            // O(n²) duplicate check is fine at arena sizes and avoids extra storage.
            for (uint256 j; j < i; ++j) {
                if (participants[j] == agent) revert DuplicateAgent(agent);
            }
            _seat[i] = agent;
        }
        _bout = BoutState({
            active: true,
            movesPerMatch: movesPerMatch,
            matches: matches,
            size: uint16(n),
            roundsPlayed: 0,
            seedMatch: type(uint32).max
        });
        emit BoutOpened(boutId, participants, movesPerMatch, matches);
    }

    /// @notice Starts the next round. The first move of each match fixes that match's pairing.
    function startRound(uint256 boutId) external onlyOperator {
        BoutState memory b = _currentBout(boutId);
        uint256 round = b.roundsPlayed;
        if (round >= uint256(b.movesPerMatch) * b.matches) revert AllRoundsPlayed();
        Round memory r = _round;
        if (r.boutId == boutId && r.round == round && r.started) revert RoundOutOfOrder();

        uint256 matchIndex = round / b.movesPerMatch;
        bytes32 seed = currentSeed;
        if (b.seedMatch != matchIndex) {
            seed = keccak256(abi.encode(blockhash(block.number - 1), boutId, matchIndex));
            currentSeed = seed;
            _bout.seedMatch = uint32(matchIndex);
            _storePairing(seed, b.size);
        }

        uint64 commitDeadline = uint64(block.timestamp + commitWindow);
        uint64 revealDeadline = uint64(block.timestamp + commitWindow + revealWindow);
        _round = Round({
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            commits: 0,
            boutId: uint32(boutId),
            round: uint32(round),
            started: true,
            finalized: false
        });
        emit RoundStarted(boutId, round, seed, commitDeadline, revealDeadline);
    }

    /// @notice Agent commits `keccak256(abi.encode(move, salt, agent, boutId, round))`. The first
    /// 24 bytes are stored.
    /// @param idx The caller's index in the bout's participant list (calldata hint, verified).
    function commit(uint256 boutId, uint256 round, uint256 idx, bytes32 commitment) external {
        BoutState memory b = _currentBout(boutId);
        _checkSeat(b, idx);
        Round memory r = _openRound(boutId, round);
        if (block.timestamp > r.commitDeadline) revert CommitPhaseClosed();
        if (_partner(idx) == SITS_OUT) revert SitsOut();

        Seat memory s = _seats[msg.sender];
        if (s.boutId == boutId && s.round == round) revert AlreadyCommitted();
        _seats[msg.sender] =
            Seat({commitment: bytes24(commitment), boutId: uint32(boutId), round: uint32(round)});
        unchecked {
            ++_round.commits;
        }
        emit Committed(boutId, round, msg.sender);
    }

    function reveal(uint256 boutId, uint256 round, uint256 idx, uint8 move, bytes32 salt) external {
        BoutState memory b = _currentBout(boutId);
        _checkSeat(b, idx);
        Round memory r = _openRound(boutId, round);
        if (!_revealOpen(b, r)) revert RevealPhaseNotOpen();
        if (block.timestamp > r.revealDeadline) revert RevealPhaseClosed();

        Seat memory s = _seats[msg.sender];
        if (s.boutId != boutId || s.round != round) revert NotCommitted();
        Play memory p = _playFor(msg.sender, boutId, round, b.movesPerMatch);
        if (p.revealed) revert AlreadyRevealed();
        if (move > DEFECT) revert BadReveal();
        if (bytes24(keccak256(abi.encode(move, salt, msg.sender, boutId, round))) != s.commitment)
        {
            revert BadReveal();
        }
        p.move = move;
        p.revealed = true;
        uint16 bit = uint16(1) << (round % b.movesPerMatch);
        p.histMask |= bit;
        if (move == DEFECT) p.histMoves |= bit;
        emit Revealed(boutId, round, msg.sender, move);

        address partner = _seat[_partner(idx)];
        Play memory q = _plays[partner];
        if (q.boutId == boutId && q.round == round && q.revealed) {
            (uint8 pp, uint8 pq) = _payoff(move, q.move);
            p.scored = true;
            q.scored = true;
            _credit(msg.sender, p, pp, true);
            _credit(partner, q, pq, true);
            _plays[partner] = q;
            emit PairScored(boutId, round, msg.sender, partner, move, q.move, pp, pq, false);
        }
        _plays[msg.sender] = p;
    }

    /// @notice Scores any pairs that couldn't be scored by reveals (missed reveals) and closes the
    /// round. Callable once the reveal deadline passes, or early once every pair is scored.
    function finalize(uint256 boutId, uint256 round) external onlyOperator {
        BoutState memory b = _currentBout(boutId);
        if (round != b.roundsPlayed) revert RoundOutOfOrder();
        Round memory r = _round;
        if (r.boutId != boutId || r.round != round || !r.started) revert RoundNotStarted();
        if (r.finalized) revert RoundAlreadyFinalized();

        bool deadlinePassed = block.timestamp > r.revealDeadline;
        for (uint256 ia; ia < b.size; ++ia) {
            uint256 ib = _partner(ia);
            if (ib == SITS_OUT || ib < ia) continue; // visit each pair once
            address a = _seat[ia];
            address bAgent = _seat[ib];
            Play memory pa = _playFor(a, boutId, round, b.movesPerMatch);
            if (pa.scored) continue;
            if (!deadlinePassed) revert RoundStillOpen();
            Play memory pb = _playFor(bAgent, boutId, round, b.movesPerMatch);
            // Missed-reveal rule: a revealer gets FORFEIT_WIN, a non-revealer 0 and a strike.
            uint8 ptsA = pa.revealed ? FORFEIT_WIN : 0;
            uint8 ptsB = pb.revealed ? FORFEIT_WIN : 0;
            pa.scored = true;
            pb.scored = true;
            _credit(a, pa, ptsA, pa.revealed);
            _credit(bAgent, pb, ptsB, pb.revealed);
            _plays[a] = pa;
            _plays[bAgent] = pb;
            emit PairScored(boutId, round, a, bAgent, pa.move, pb.move, ptsA, ptsB, true);
        }

        _round.finalized = true;
        unchecked {
            ++_bout.roundsPlayed;
        }
        emit RoundFinalized(boutId, round);
    }

    function closeBout(uint256 boutId) external onlyOperator {
        BoutState memory b = _currentBout(boutId);
        if (b.roundsPlayed != uint256(b.movesPerMatch) * b.matches) revert BoutUnfinished();
        _bout.active = false;
        emit BoutClosed(boutId);
    }

    // ───────────────────────────── views ─────────────────────────────
    // Views describe the current (or most recent) bout only; earlier bouts are in the events.

    function boutActive() external view returns (bool) {
        return _bout.active;
    }

    function agents(address agent)
        external
        view
        returns (
            address owner,
            uint64 config,
            bool confirmed,
            bool suspended,
            uint8 strikes,
            uint64 lifetimePoints
        )
    {
        Agent memory a = _agents[agent];
        Play memory p = _plays[agent];
        return (a.owner, a.config, a.confirmed, a.suspended, p.strikes, p.lifetimePoints);
    }

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
        if (boutId == 0 || boutId != boutCount) return (participants, 0, 0, 0, false);
        BoutState memory b = _bout;
        participants = new address[](b.size);
        for (uint256 i; i < b.size; ++i) {
            participants[i] = _seat[i];
        }
        return (participants, b.movesPerMatch, b.matches, b.roundsPlayed, b.active);
    }

    function rounds(uint256 boutId, uint256 round)
        external
        view
        returns (
            uint64 commitDeadline,
            uint64 revealDeadline,
            uint32 commits,
            bool started,
            bool finalized
        )
    {
        Round memory r = _round;
        if (r.boutId != boutId || r.round != round) return (0, 0, 0, false, false);
        return (r.commitDeadline, r.revealDeadline, r.commits, r.started, r.finalized);
    }

    /// @notice Seed of match `matchIndex`, or zero if it isn't the current match.
    function matchSeed(uint256 boutId, uint256 matchIndex) external view returns (bytes32) {
        if (boutId != boutCount || matchIndex != _bout.seedMatch) return bytes32(0);
        return currentSeed;
    }

    /// @notice Entry for `idx` in the current round. `commitment` is the stored 24-byte prefix.
    function entries(uint256 boutId, uint256 round, uint256 idx)
        external
        view
        returns (bytes32 commitment, uint8 move, bool revealed, bool scored)
    {
        if (boutId != boutCount || idx >= _bout.size) return (0, 0, false, false);
        address agent = _seat[idx];
        Seat memory s = _seats[agent];
        if (s.boutId == boutId && s.round == round) commitment = bytes32(s.commitment);
        Play memory p = _plays[agent];
        if (p.boutId == boutId && p.round == round) return (commitment, p.move, p.revealed, p.scored);
        return (commitment, 0, false, false);
    }

    /// @notice Moves `idx` revealed so far in the match containing `round`: bit j of `moves` is set
    /// if move j was DEFECT, bit j of `mask` if move j was revealed at all.
    function matchHistory(uint256 boutId, uint256 round, uint256 idx)
        external
        view
        returns (uint16 moves, uint16 mask)
    {
        BoutState memory b = _bout;
        if (boutId != boutCount || idx >= b.size || b.movesPerMatch == 0) return (0, 0);
        Play memory p = _plays[_seat[idx]];
        if (p.boutId != boutId || p.round / b.movesPerMatch != round / b.movesPerMatch) {
            return (0, 0);
        }
        return (p.histMoves, p.histMask);
    }

    function boutPoints(uint256 boutId, uint256 idx) external view returns (uint256) {
        if (boutId != boutCount || idx >= _bout.size) return 0;
        Play memory p = _plays[_seat[idx]];
        return p.boutId == boutId ? p.points : 0;
    }

    /// @notice Opponent index for `idx` in `round` of the current match; `paired` is false for the
    /// odd agent out.
    function partnerOf(uint256 boutId, uint256 round, uint256 idx)
        external
        view
        returns (uint256 partner, bool paired)
    {
        BoutState memory b = _bout;
        if (
            boutId != boutCount || b.movesPerMatch == 0
                || round / b.movesPerMatch != b.seedMatch
        ) revert NotCurrentMatch();
        if (idx >= b.size) revert WrongAgentIndex();
        uint256 p = _partner(idx);
        return p == SITS_OUT ? (0, false) : (p, true);
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

    function _currentBout(uint256 boutId) internal view returns (BoutState memory b) {
        b = _bout;
        if (!b.active || boutId != boutCount) revert NoActiveBout();
    }

    function _checkSeat(BoutState memory b, uint256 idx) internal view {
        if (idx >= b.size || _seat[idx] != msg.sender) revert WrongAgentIndex();
    }

    function _openRound(uint256 boutId, uint256 round) internal view returns (Round memory r) {
        r = _round;
        if (r.boutId != boutId || r.round != round || !r.started) revert RoundNotStarted();
        if (r.finalized) revert RoundAlreadyFinalized();
    }

    /// @dev Reveals open at the commit deadline, or as soon as every paired agent has committed.
    function _revealOpen(BoutState memory b, Round memory r) internal view returns (bool) {
        uint256 pairedCount = b.size - (b.size % 2);
        return block.timestamp > r.commitDeadline || r.commits == pairedCount;
    }

    /// @dev The agent's play slot as of (boutId, round): untouched if it already belongs to this
    /// round, otherwise with the move fields cleared and the bout/match accumulators reset when the
    /// bout or match changed. Running totals (strikes, lifetimePoints) carry over.
    function _playFor(address agent, uint256 boutId, uint256 round, uint8 k)
        internal
        view
        returns (Play memory p)
    {
        p = _plays[agent];
        if (p.boutId == boutId && p.round == round) return p;
        if (p.boutId != boutId) {
            p.points = 0;
            p.histMoves = 0;
            p.histMask = 0;
        } else if (p.round / k != round / k) {
            p.histMoves = 0;
            p.histMask = 0;
        }
        p.boutId = uint32(boutId);
        p.round = uint32(round);
        p.move = 0;
        p.revealed = false;
        p.scored = false;
    }

    function _partner(uint256 idx) internal view returns (uint256) {
        return (_pairing[idx / 32] >> ((idx % 32) * 8)) & 0xFF;
    }

    /// @dev Packs the match pairing: seats at permutation positions (0,1), (2,3), … face each
    /// other; with an odd count the last position sits out.
    function _storePairing(bytes32 seed, uint256 n) internal {
        uint256[] memory perm = _permutation(seed, n);
        uint256[] memory partner = new uint256[](n);
        for (uint256 pos; pos + 1 < n; pos += 2) {
            partner[perm[pos]] = perm[pos + 1];
            partner[perm[pos + 1]] = perm[pos];
        }
        if (n % 2 == 1) partner[perm[n - 1]] = SITS_OUT;
        for (uint256 w; w * 32 < n; ++w) {
            uint256 word;
            for (uint256 i = w * 32; i < n && i < w * 32 + 32; ++i) {
                word |= partner[i] << ((i % 32) * 8);
            }
            _pairing[w] = word;
        }
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

    /// @dev Adds points and updates strikes in the (memory) play; the caller writes it back.
    function _credit(address agent, Play memory p, uint8 points, bool showedUp) internal {
        if (points != 0) {
            p.points += points;
            p.lifetimePoints += points;
        }
        if (showedUp) {
            p.strikes = 0;
        } else if (++p.strikes >= MAX_STRIKES && !_agents[agent].suspended) {
            _agents[agent].suspended = true;
            emit AgentSuspended(agent, true);
        }
    }

    function _payoff(uint8 a, uint8 b) internal pure returns (uint8, uint8) {
        if (a == COOPERATE && b == COOPERATE) return (REWARD, REWARD);
        if (a == DEFECT && b == DEFECT) return (PUNISHMENT, PUNISHMENT);
        return a == DEFECT ? (TEMPTATION, SUCKER) : (SUCKER, TEMPTATION);
    }
}
