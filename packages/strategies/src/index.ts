export { type DecideInput, decide } from "./decide.ts";
export {
	DEFAULT_KNOBS,
	decodeConfig,
	encodeConfig,
	InvalidConfigError,
	KNOB_BOUNDS,
	STRATEGY_KNOBS,
	validateConfig,
} from "./knobs.ts";
export { pairings, permutation } from "./pairings.ts";
export { PAYOFF, scoreTurn } from "./payoff.ts";
export { RollPurpose, roll } from "./random.ts";
export * from "./types.ts";
