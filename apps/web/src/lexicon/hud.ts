// Fragment tab HUD: standing, Vigil, Marks shelf, notifications. Plain and short.
// Economy and Marks words come from ./economy.ts and ./marks.ts; only what they lack is here.

export const hud = {
	/** Accessible name of the standing card. */
	standing: "Standing",
	/** Shown when the standing can't be read. */
	standingDown: "Couldn't load your standing.",
	/** "+56 Ash" ghosts that float up after collecting. */
	plusAsh: (n: number) => `+${n} Ash`,
	plusResonance: (n: number) => `+${n} Resonance`,
	/** Briefly shown when collecting lifts the level. */
	levelUp: (level: number) => `Level ${level}`,
	/** Waiting in the Vigil: "56 Ash · 105 Resonance". */
	waiting: (ash: number, resonance: number) =>
		`${ash} Ash · ${resonance} Resonance`,
	/** Under the Vigil when full. */
	fullHint: "It stops filling until you collect.",

	marksCount: (have: number, all: number) => `${have} of ${all}`,
	/** Caption for a tapped Mark that is sealed. */
	sealedLink: "View seal",
	marksNone: "No Marks yet.",
} as const;
