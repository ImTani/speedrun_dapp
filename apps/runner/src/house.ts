import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	type AgentConfig,
	DEFAULT_KNOBS,
	type Knobs,
	Opening,
	StrategyId,
} from "@arena/strategies";
import { encodeAbiParameters, type Hex, keccak256 } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { ROOT } from "./config.ts";

/**
 * A house agent: one signer for the agent's own smart account, one for the owner account that
 * confirms it (one agent per owner), and a secret seed. The seed drives every random roll and
 * every commit salt, so moves and salts can be recomputed after a crash and nothing else needs
 * saving.
 */
export interface HouseAgent {
	agentKey: Hex;
	ownerKey: Hex;
	seed: Hex;
	config: AgentConfig;
}

const knobs = (k: Partial<Knobs>): Knobs => ({ ...DEFAULT_KNOBS, ...k });

/** A spread of temperaments so bouts have real contrast. Agent i gets PRESETS[i % length]. */
const PRESETS: readonly AgentConfig[] = [
	{ strategy: StrategyId.TitForTat, knobs: knobs({}) },
	{ strategy: StrategyId.Grudger, knobs: knobs({}) },
	{ strategy: StrategyId.Pavlov, knobs: knobs({}) },
	{ strategy: StrategyId.Detective, knobs: knobs({ forgiveness: 10 }) },
	{ strategy: StrategyId.AlwaysCooperate, knobs: knobs({}) },
	{ strategy: StrategyId.AlwaysDefect, knobs: knobs({}) },
	{ strategy: StrategyId.Random, knobs: knobs({}) },
	{ strategy: StrategyId.TitForTat, knobs: knobs({ forgiveness: 30 }) },
	{
		strategy: StrategyId.TitForTat,
		knobs: knobs({ retaliation: 2, noise: 10 }),
	},
	{
		strategy: StrategyId.Grudger,
		knobs: knobs({ forgiveness: 15, memory: 3 }),
	},
	{ strategy: StrategyId.Pavlov, knobs: knobs({ opening: Opening.Defect }) },
	{ strategy: StrategyId.Detective, knobs: knobs({ forgiveness: 40 }) },
	{ strategy: StrategyId.AlwaysCooperate, knobs: knobs({ noise: 15 }) },
];

/** House roster in <repo>/.secrets/<network>-house.json (gitignored); grown to `n` on demand. */
export function loadHouse(network: string, n: number): HouseAgent[] {
	const file = resolve(ROOT, `.secrets/${network}-house.json`);
	const house: HouseAgent[] = existsSync(file)
		? JSON.parse(readFileSync(file, "utf8"))
		: [];
	if (house.length < n) {
		while (house.length < n) {
			house.push({
				agentKey: generatePrivateKey(),
				ownerKey: generatePrivateKey(),
				seed: generatePrivateKey(),
				config: PRESETS[house.length % PRESETS.length] as AgentConfig,
			});
		}
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(house, null, 2));
	}
	return house.slice(0, n);
}

/** Commit salt for one round, derived from the agent's secret seed (so it survives restarts). */
export function saltFor(seed: Hex, boutId: bigint, round: bigint): Hex {
	return keccak256(
		encodeAbiParameters(
			[
				{ type: "bytes32" },
				{ type: "string" },
				{ type: "uint256" },
				{ type: "uint256" },
			],
			[seed, "arena.salt", boutId, round],
		),
	);
}

/** Mirrors Arena.commitmentFor: keccak256(abi.encode(move, salt, agent, boutId, round)). */
export function commitmentFor(
	move: number,
	salt: Hex,
	agent: Hex,
	boutId: bigint,
	round: bigint,
): Hex {
	return keccak256(
		encodeAbiParameters(
			[
				{ type: "uint8" },
				{ type: "bytes32" },
				{ type: "address" },
				{ type: "uint256" },
				{ type: "uint256" },
			],
			[move, salt, agent, boutId, round],
		),
	);
}
