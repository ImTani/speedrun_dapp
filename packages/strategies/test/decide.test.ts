import type { Hex } from "viem";
import { describe, expect, it } from "vitest";
import {
	type AgentConfig,
	DEFAULT_KNOBS,
	type DecisionContext,
	decide,
	decodeConfig,
	encodeConfig,
	InvalidConfigError,
	type Knobs,
	Move,
	Opening,
	RollPurpose,
	roll,
	StrategyId,
	scoreTurn,
	type Turn,
} from "../src/index.ts";

const SEED: Hex = `0x${"ab".repeat(32)}`;
const C = Move.Cooperate;
const D = Move.Defect;

function cfg(strategy: StrategyId, knobs: Partial<Knobs> = {}): AgentConfig {
	return { strategy, knobs: { ...DEFAULT_KNOBS, ...knobs } };
}

/** Play `config` against a fixed sequence of opponent moves; returns this agent's moves. */
function playAgainst(
	config: AgentConfig,
	opponent: Move[],
	seed: Hex = SEED,
): Move[] {
	const history: Turn[] = [];
	const mine: Move[] = [];
	opponent.forEach((theirs, i) => {
		const ctx: DecisionContext = {
			boutId: 1n,
			matchIndex: 0n,
			moveIndex: BigInt(i),
		};
		const move = decide({ config, history, seed, ctx });
		mine.push(move);
		history.push({ mine: move, theirs });
	});
	return mine;
}

/** Play two configs against each other for k moves. */
function match(
	a: AgentConfig,
	b: AgentConfig,
	k: number,
	seedA = SEED,
	seedB = SEED,
) {
	const ha: Turn[] = [];
	const hb: Turn[] = [];
	for (let i = 0; i < k; i++) {
		const ctx = { boutId: 1n, matchIndex: 0n, moveIndex: BigInt(i) };
		const ma = decide({ config: a, history: ha, seed: seedA, ctx });
		const mb = decide({ config: b, history: hb, seed: seedB, ctx });
		ha.push({ mine: ma, theirs: mb });
		hb.push({ mine: mb, theirs: ma });
	}
	return { a: ha.map((t) => t.mine), b: hb.map((t) => t.mine) };
}

describe("fixed strategies", () => {
	it("AlwaysCooperate / AlwaysDefect ignore the opponent", () => {
		expect(playAgainst(cfg(StrategyId.AlwaysCooperate), [D, D, D])).toEqual([
			C,
			C,
			C,
		]);
		expect(playAgainst(cfg(StrategyId.AlwaysDefect), [C, C, C])).toEqual([
			D,
			D,
			D,
		]);
	});
});

describe("TitForTat", () => {
	it("opens with the opening knob, then copies the last move", () => {
		expect(playAgainst(cfg(StrategyId.TitForTat), [C, D, C, D, D])).toEqual([
			C,
			C,
			D,
			C,
			D,
		]);
		expect(
			playAgainst(cfg(StrategyId.TitForTat, { opening: Opening.Defect }), [C]),
		).toEqual([D]);
	});

	it("retaliation=3 punishes for three moves after one betrayal", () => {
		const moves = playAgainst(cfg(StrategyId.TitForTat, { retaliation: 3 }), [
			D,
			C,
			C,
			C,
			C,
		]);
		expect(moves).toEqual([C, D, D, D, C]);
	});

	it("forgiveness=100 never retaliates", () => {
		expect(
			playAgainst(cfg(StrategyId.TitForTat, { forgiveness: 100 }), [D, D, D]),
		).toEqual([C, C, C]);
	});
});

describe("Grudger", () => {
	it("defects for as long as a betrayal is inside the memory window", () => {
		expect(playAgainst(cfg(StrategyId.Grudger), [C, D, C, C, C])).toEqual([
			C,
			C,
			D,
			D,
			D,
		]);
		// memory=1: only the last move counts, so the grudge fades after one clean move.
		expect(
			playAgainst(cfg(StrategyId.Grudger, { memory: 1 }), [C, D, C, C]),
		).toEqual([C, C, D, C]);
	});
});

describe("Pavlov", () => {
	it("stays after matching moves, shifts after mismatched ones", () => {
		// C/C -> C; C/D -> D; D/D -> C; C/C -> C
		expect(playAgainst(cfg(StrategyId.Pavlov), [C, D, D, C])).toEqual([
			C,
			C,
			D,
			C,
		]);
	});
});

describe("Detective", () => {
	it("probes C,D,C,C then exploits a pushover", () => {
		expect(playAgainst(cfg(StrategyId.Detective), [C, C, C, C, C, C])).toEqual([
			C,
			D,
			C,
			C,
			D,
			D,
		]);
	});

	it("plays tit-for-tat against an opponent who fought back", () => {
		expect(
			playAgainst(cfg(StrategyId.Detective), [C, C, D, C, C, D, C]),
		).toEqual([C, D, C, C, C, C, D]);
	});
});

describe("determinism and randomness", () => {
	it("same inputs give the same moves; a different seed changes Random's play", () => {
		const random = cfg(StrategyId.Random);
		const opponent = Array.from({ length: 40 }, () => C);
		expect(playAgainst(random, opponent)).toEqual(
			playAgainst(random, opponent),
		);
		const other: Hex = `0x${"cd".repeat(32)}`;
		expect(playAgainst(random, opponent, other)).not.toEqual(
			playAgainst(random, opponent),
		);
	});

	it("Random plays a roughly even mix over many moves", () => {
		const moves = playAgainst(
			cfg(StrategyId.Random),
			Array.from({ length: 400 }, () => C),
		);
		const defects = moves.filter((m) => m === D).length;
		expect(defects).toBeGreaterThan(150);
		expect(defects).toBeLessThan(250);
	});

	it("noise flips roughly noise% of moves", () => {
		const moves = playAgainst(
			cfg(StrategyId.AlwaysCooperate, { noise: 20 }),
			Array.from({ length: 500 }, () => C),
		);
		const flips = moves.filter((m) => m === D).length;
		expect(flips).toBeGreaterThan(60);
		expect(flips).toBeLessThan(140);
	});

	it("roll matches an independent Solidity-ABI computation", () => {
		// Vector from Foundry: cast keccak $(cast abi-encode "f(bytes32,uint256,uint256,uint256,uint8)"
		//   0xabab…ab 7 2 3 2) = 0x69b3cf8e…bda7, and that value mod 100 = 19.
		const ctx = { boutId: 7n, matchIndex: 2n, moveIndex: 3n };
		expect(roll(SEED, ctx, RollPurpose.Noise)).toBe(19);
	});
});

describe("matches", () => {
	it("two Tit-for-Tats cooperate forever", () => {
		const r = match(cfg(StrategyId.TitForTat), cfg(StrategyId.TitForTat), 5);
		expect(r.a).toEqual([C, C, C, C, C]);
		expect(r.b).toEqual([C, C, C, C, C]);
	});

	it("payoffs follow the classic matrix", () => {
		expect(scoreTurn(C, C)).toEqual([3, 3]);
		expect(scoreTurn(D, D)).toEqual([1, 1]);
		expect(scoreTurn(D, C)).toEqual([5, 0]);
		expect(scoreTurn(C, D)).toEqual([0, 5]);
	});
});

describe("config encoding", () => {
	it("round-trips through the packed uint64", () => {
		const config = cfg(StrategyId.TitForTat, {
			forgiveness: 15,
			retaliation: 2,
			memory: 4,
			opening: Opening.Random,
			noise: 5,
		});
		const packed = encodeConfig(config);
		expect(packed).toBe(0x05_02_04_02_0f_02n);
		expect(decodeConfig(packed)).toEqual(config);
	});

	it("rejects out-of-range knobs and unknown strategies", () => {
		expect(() =>
			encodeConfig(cfg(StrategyId.TitForTat, { noise: 21 })),
		).toThrow(InvalidConfigError);
		expect(() =>
			encodeConfig(cfg(StrategyId.TitForTat, { retaliation: 0 })),
		).toThrow(InvalidConfigError);
		expect(() =>
			encodeConfig({ strategy: 99 as StrategyId, knobs: DEFAULT_KNOBS }),
		).toThrow(InvalidConfigError);
	});
});
