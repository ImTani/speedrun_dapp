import { type AgentConfig, type Knobs, Opening, StrategyId } from "./types.ts";

/** Inclusive bounds for each knob. Arena.sol enforces the same bounds; keep them in sync. */
export const KNOB_BOUNDS = {
	forgiveness: { min: 0, max: 100 },
	retaliation: { min: 1, max: 5 },
	memory: { min: 1, max: 10 },
	opening: { min: 0, max: 2 },
	noise: { min: 0, max: 20 },
} as const satisfies Record<keyof Knobs, { min: number; max: number }>;

export const DEFAULT_KNOBS: Knobs = {
	forgiveness: 0,
	retaliation: 1,
	memory: 10,
	opening: Opening.Cooperate,
	noise: 0,
};

/** Which knobs actually change behaviour for each strategy — the UI only shows these. */
export const STRATEGY_KNOBS: Record<StrategyId, readonly (keyof Knobs)[]> = {
	[StrategyId.AlwaysCooperate]: ["noise"],
	[StrategyId.AlwaysDefect]: ["noise"],
	[StrategyId.TitForTat]: [
		"opening",
		"retaliation",
		"forgiveness",
		"memory",
		"noise",
	],
	[StrategyId.Grudger]: ["opening", "forgiveness", "memory", "noise"],
	[StrategyId.Pavlov]: ["opening", "noise"],
	[StrategyId.Detective]: ["forgiveness", "noise"],
	[StrategyId.Random]: [],
};

const STRATEGY_IDS = new Set<number>(Object.values(StrategyId));

export class InvalidConfigError extends Error {
	override name = "InvalidConfigError";
}

export function validateConfig(config: AgentConfig): AgentConfig {
	if (!STRATEGY_IDS.has(config.strategy)) {
		throw new InvalidConfigError(`unknown strategy ${config.strategy}`);
	}
	for (const key of Object.keys(KNOB_BOUNDS) as (keyof Knobs)[]) {
		const value = config.knobs[key];
		const { min, max } = KNOB_BOUNDS[key];
		if (!Number.isInteger(value) || value < min || value > max) {
			throw new InvalidConfigError(
				`knob ${key}=${value} outside [${min}, ${max}]`,
			);
		}
	}
	return config;
}

// Packed layout (low byte first): strategy | forgiveness | retaliation | memory | opening | noise.
// Mirrors Arena.sol `_unpackConfig`; changing it is a contract-breaking change.
const FIELDS = [
	"forgiveness",
	"retaliation",
	"memory",
	"opening",
	"noise",
] as const;

export function encodeConfig(config: AgentConfig): bigint {
	validateConfig(config);
	let packed = BigInt(config.strategy);
	FIELDS.forEach((key, i) => {
		packed |= BigInt(config.knobs[key]) << BigInt(8 * (i + 1));
	});
	return packed;
}

export function decodeConfig(packed: bigint): AgentConfig {
	const byte = (i: number) => Number((packed >> BigInt(8 * i)) & 0xffn);
	const knobs = Object.fromEntries(
		FIELDS.map((key, i) => [key, byte(i + 1)]),
	) as unknown as Knobs;
	return validateConfig({ strategy: byte(0) as StrategyId, knobs });
}
