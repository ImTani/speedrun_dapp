import { Move } from "./types.ts";

/** Classic PD payoffs. Arena.sol uses the same numbers; keep them in sync. */
export const PAYOFF = {
	reward: 3,
	punishment: 1,
	sucker: 0,
	temptation: 5,
} as const;

/** Points for [a, b] given both moves. */
export function scoreTurn(a: Move, b: Move): [number, number] {
	if (a === Move.Cooperate && b === Move.Cooperate)
		return [PAYOFF.reward, PAYOFF.reward];
	if (a === Move.Defect && b === Move.Defect)
		return [PAYOFF.punishment, PAYOFF.punishment];
	return a === Move.Defect
		? [PAYOFF.temptation, PAYOFF.sucker]
		: [PAYOFF.sucker, PAYOFF.temptation];
}
