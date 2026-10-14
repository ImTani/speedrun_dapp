import { encodeAbiParameters, type Hex, keccak256 } from "viem";
import type { DecisionContext } from "./types.ts";

/**
 * Deterministic roll in [0, 100) for one named purpose within one decision.
 *
 * Defined as `uint256(keccak256(abi.encode(seed, boutId, matchIndex, moveIndex, purpose))) % 100`
 * so a verifier can recompute it in Solidity or any language after the agent's seed is revealed.
 * A JS PRNG would make "replay and check" depend on this exact library.
 */
export function roll(
	seed: Hex,
	ctx: DecisionContext,
	purpose: RollPurpose,
): number {
	const encoded = encodeAbiParameters(
		[
			{ type: "bytes32" },
			{ type: "uint256" },
			{ type: "uint256" },
			{ type: "uint256" },
			{ type: "uint8" },
		],
		[seed, ctx.boutId, ctx.matchIndex, ctx.moveIndex, purpose],
	);
	return Number(BigInt(keccak256(encoded)) % 100n);
}

/** Separate purposes so the opening, forgiveness and noise rolls are independent. */
export const RollPurpose = {
	Opening: 0,
	Forgiveness: 1,
	Noise: 2,
	Random: 3,
} as const;
export type RollPurpose = (typeof RollPurpose)[keyof typeof RollPurpose];
