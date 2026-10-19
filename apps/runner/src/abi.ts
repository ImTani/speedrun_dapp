import { parseAbi } from "viem";

/** The parts of Arena.sol the runner uses. Keep in step with contracts/src/Arena.sol. */
export const arenaAbi = parseAbi([
	"function operator() view returns (address)",
	"function boutCount() view returns (uint256)",
	"function boutActive() view returns (bool)",
	"function agents(address) view returns (address owner, uint64 config, bool confirmed, bool suspended, uint8 strikes, uint64 lifetimePoints)",
	"function boutInfo(uint256 boutId) view returns (address[] participants, uint8 movesPerMatch, uint8 matches, uint32 roundsPlayed, bool active)",
	"function rounds(uint256 boutId, uint256 round) view returns (uint64 commitDeadline, uint64 revealDeadline, uint32 commits, bool started, bool finalized)",
	"function matchSeed(uint256 boutId, uint256 matchIndex) view returns (bytes32)",
	"function entries(uint256 boutId, uint256 round, uint256 idx) view returns (bytes32 commitment, uint8 move, bool revealed, bool scored)",
	"function boutPoints(uint256 boutId, uint256 idx) view returns (uint256)",
	"function commitmentFor(uint8 move, bytes32 salt, address agent, uint256 boutId, uint256 round) pure returns (bytes32)",
	"function registerAgent(address owner, uint64 config, uint256 deadline, bytes attestation)",
	"function confirmAgent(address agent)",
	"function openBout(address[] participants, uint8 movesPerMatch, uint8 matches) returns (uint256)",
	"function startRound(uint256 boutId)",
	"function commit(uint256 boutId, uint256 round, uint256 idx, bytes32 commitment)",
	"function reveal(uint256 boutId, uint256 round, uint256 idx, uint8 move, bytes32 salt)",
	"function finalize(uint256 boutId, uint256 round)",
	"function closeBout(uint256 boutId)",
	"event BoutOpened(uint256 indexed boutId, address[] agents, uint8 movesPerMatch, uint8 matches)",
	"event BoutClosed(uint256 indexed boutId)",
]);
