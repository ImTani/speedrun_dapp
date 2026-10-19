// Onboarding: coach marks, the practice duel and first-action pointers. One short line each.
// Unlock names and requirement lines live in ./unlocks.ts.

export const onboarding = {
	/** Skip the coach marks. */
	skip: "Skip",

	/** One line beside the thing to touch, per onboarding step. */
	coach: {
		mask: "Swipe to choose a mask",
		sigil: "Set a Sigil",
		name: "Name it",
		bind: "Bind it",
		seal: "Press to seal",
		gathering: "Watch your Fragment",
	},

	/** The first thing to do once a mechanic opens. */
	first: {
		vigil: "Collect your Vigil",
		spire: "Climb the first floor",
		reliquary: "Scry for a Relic",
		vestry: "Pick a pack",
	},

	practice: {
		label: "Practice duel",
		heading: "Practice",
		toll: (n: number, of: number) => `Toll ${n} of ${of}`,
		unveil: "Unveil",
		/** Shown once, under the first unveiled toll. */
		explain: "Kindle shares Light. Devour steals it.",
		kindle: "Kindle",
		devour: "Devour",
		light: "Light",
		/** Accessible line per toll. */
		said: (mine: boolean, theirs: boolean, a: number, b: number) =>
			`Yours ${mine ? "devours" : "kindles"}, the Remnant ${theirs ? "devours" : "kindles"}. ${a} Light to ${b}.`,
		end: "Your Fragment fights on its own from here",
		go: "Continue",
	},
} as const;
