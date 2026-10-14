/** A single Prisoner's Dilemma move. Numeric values match the on-chain encoding in Arena.sol. */
export const Move = { Cooperate: 0, Defect: 1 } as const;
export type Move = (typeof Move)[keyof typeof Move];

/** Strategy ids. Values are the on-chain `strategyId` and must never be renumbered. */
export const StrategyId = {
	AlwaysCooperate: 0,
	AlwaysDefect: 1,
	TitForTat: 2,
	Grudger: 3,
	Pavlov: 4,
	Detective: 5,
	Random: 6,
} as const;
export type StrategyId = (typeof StrategyId)[keyof typeof StrategyId];

export const Opening = { Cooperate: 0, Defect: 1, Random: 2 } as const;
export type Opening = (typeof Opening)[keyof typeof Opening];

/**
 * Player-tunable knobs. All are small integers so they pack into a single uint64 on-chain
 * (see encodeConfig). Percentages are whole numbers 0–100.
 */
export interface Knobs {
	/** Chance (%) to cooperate instead of a retaliatory defection. */
	forgiveness: number;
	/** Moves to keep punishing after the opponent defects (Tit-for-Tat family). */
	retaliation: number;
	/** How many past moves of this match the strategy considers. */
	memory: number;
	/** First move of a match. */
	opening: Opening;
	/** Chance (%) the final move is flipped — a "trembling hand". */
	noise: number;
}

export interface AgentConfig {
	strategy: StrategyId;
	knobs: Knobs;
}

/** One completed move pair from this agent's perspective. */
export interface Turn {
	mine: Move;
	theirs: Move;
}

/**
 * Everything that seeds randomness for one decision. Together with the agent's secret seed these
 * make every move reproducible by anyone once the seed is revealed.
 */
export interface DecisionContext {
	boutId: bigint;
	matchIndex: bigint;
	moveIndex: bigint;
}
