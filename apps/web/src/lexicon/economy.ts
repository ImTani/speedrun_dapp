// Economy labels. Short and plain: what the player needs to read.
import { roman } from "./gathering.ts";

export const economy = {
	degree: "Degree",
	/** "Degree VI" */
	degreeOf: (d: number) => `Degree ${roman(d)}`,
	level: "Level",
	/** "Level 12 of 15" */
	levelOf: (level: number, cap: number) => `Level ${level} of ${cap}`,
	resonance: "Resonance",
	ash: "Ash",
	/** "180 to next level" */
	toNext: (n: number) => `${n} to next level`,
	capped: "Level cap reached. Climb a Degree to grow further.",

	vigil: {
		name: "Vigil",
		/** "7h of 12h" */
		hours: (h: number, cap: number) => `${Math.floor(h)}h of ${cap}h`,
		full: "Full",
		claim: "Collect",
		claiming: "Collecting…",
		empty: "Nothing to collect yet",
		/** "+56 Ash · +105 Resonance" */
		gained: (ash: number, resonance: number) =>
			`+${ash} Ash · +${resonance} Resonance`,
	},

	errors: {
		notEnoughAsh: "Not enough Ash.",
		claimFailed: "Could not collect. Try again.",
	},
} as const;
