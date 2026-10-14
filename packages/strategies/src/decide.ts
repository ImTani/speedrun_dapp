import type { Hex } from "viem";
import { validateConfig } from "./knobs.ts";
import { RollPurpose, roll } from "./random.ts";
import {
	type AgentConfig,
	type DecisionContext,
	Move,
	Opening,
	StrategyId,
	type Turn,
} from "./types.ts";

export interface DecideInput {
	config: AgentConfig;
	/** Moves already played in this match, oldest first. */
	history: readonly Turn[];
	/** The agent's secret seed (revealed at season end for verification). */
	seed: Hex;
	ctx: DecisionContext;
}

/** Detective's fixed probe sequence (Axelrod / "Evolution of Trust"). */
const DETECTIVE_PROBE: readonly Move[] = [
	Move.Cooperate,
	Move.Defect,
	Move.Cooperate,
	Move.Cooperate,
];

/**
 * Pure decision function: same input, same move, on any machine. The runner calls this to play;
 * verifiers call it to replay. Noise is applied last so every strategy shares one "trembling hand".
 */
export function decide(input: DecideInput): Move {
	const { config, history, seed, ctx } = input;
	validateConfig(config);
	const { knobs } = config;
	const chance = (purpose: RollPurpose, percent: number) =>
		roll(seed, ctx, purpose) < percent;

	const opening = (): Move => {
		if (knobs.opening === Opening.Random) {
			return chance(RollPurpose.Opening, 50) ? Move.Defect : Move.Cooperate;
		}
		return knobs.opening === Opening.Defect ? Move.Defect : Move.Cooperate;
	};
	// A defection chosen as punishment can be forgiven; a strategy's "natural" defections cannot.
	const retaliate = (): Move =>
		chance(RollPurpose.Forgiveness, knobs.forgiveness)
			? Move.Cooperate
			: Move.Defect;

	const window = history.slice(-knobs.memory);
	let move: Move;

	switch (config.strategy) {
		case StrategyId.AlwaysCooperate:
			move = Move.Cooperate;
			break;
		case StrategyId.AlwaysDefect:
			move = Move.Defect;
			break;
		case StrategyId.TitForTat: {
			if (history.length === 0) {
				move = opening();
				break;
			}
			// Punish for `retaliation` moves after the most recent defection inside the memory window.
			const lastBetrayal = window.findLastIndex(
				(t) => t.theirs === Move.Defect,
			);
			const movesSince =
				lastBetrayal === -1 ? Infinity : window.length - 1 - lastBetrayal;
			move = movesSince < knobs.retaliation ? retaliate() : Move.Cooperate;
			break;
		}
		case StrategyId.Grudger: {
			if (history.length === 0) {
				move = opening();
				break;
			}
			move = window.some((t) => t.theirs === Move.Defect)
				? retaliate()
				: Move.Cooperate;
			break;
		}
		case StrategyId.Pavlov: {
			const last = history.at(-1);
			// Win-stay, lose-shift: repeat after a good payoff (both moves equal), otherwise switch.
			move =
				last === undefined
					? opening()
					: last.mine === last.theirs
						? Move.Cooperate
						: Move.Defect;
			break;
		}
		case StrategyId.Detective: {
			const probe = DETECTIVE_PROBE[history.length];
			if (probe !== undefined) {
				move = probe;
				break;
			}
			const probed = history.slice(0, DETECTIVE_PROBE.length);
			const fightsBack = probed.some((t) => t.theirs === Move.Defect);
			if (!fightsBack) {
				move = Move.Defect; // never retaliated: exploit
				break;
			}
			move =
				history.at(-1)?.theirs === Move.Defect ? retaliate() : Move.Cooperate;
			break;
		}
		case StrategyId.Random:
			move = chance(RollPurpose.Random, 50) ? Move.Defect : Move.Cooperate;
			break;
	}

	if (knobs.noise > 0 && chance(RollPurpose.Noise, knobs.noise)) {
		move = move === Move.Cooperate ? Move.Defect : Move.Cooperate;
	}
	return move;
}
