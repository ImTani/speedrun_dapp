// Onboarding: the premise, the rule, coach marks, the practice duel and first-action pointers.
// Short and plain: world names come with their plain meaning the first time.
// Unlock names and requirement lines live in ./unlocks.ts.

/** The four outcomes of a toll, in the order the rule teaches them. */
export type Outcome =
	| "both-kindle"
	| "i-devour"
	| "they-devour"
	| "both-devour";

export const onboarding = {
	/** Skip the coach marks. */
	skip: "Skip",

	/** Three beats before the first mask: what this world is and what you do in it. */
	premise: {
		label: "How it begins",
		beats: [
			{
				head: "A god devoured itself.",
				body: "Its light lies shattered in the glass.",
			},
			{
				head: "Bind a Fragment of it.",
				body: "Give it a mask. The mask decides how it plays.",
			},
			{
				head: "You build it. It plays.",
				body: "It fights other Fragments for Light (your score), even while you're away.",
			},
		],
		next: "Next",
		start: "Choose a mask",
		/** Under the button: the beat can also be swiped or tapped. */
		swipe: "Tap or swipe",
		/** Screen reader: which beat. */
		beat: (n: number, of: number) => `${n} of ${of}`,
		/** Beat 3's little duel: the two sides. */
		you: "Yours",
		rival: "Rival",
	},

	/** The one rule, taught on a card before the practice duel. */
	rule: {
		label: "The rule",
		heading: "The rule",
		/** First line: what happens each toll. */
		intro: "Each toll (a round), both Fragments choose in secret:",
		kindle: "Kindle",
		kindleMeans: "share",
		devour: "Devour",
		devourMeans: "steal",
		you: "You",
		rival: "Rival",
		/** Short title on each cell. */
		cell: {
			"both-kindle": "Both Kindle",
			"i-devour": "You Devour",
			"they-devour": "They Devour",
			"both-devour": "Both Devour",
		} satisfies Record<Outcome, string>,
		/** The line under the card once a cell is unveiled. */
		says: {
			"both-kindle": "Both Kindle: 3 Light each.",
			"i-devour": "You Devour, they Kindle: you take 5, they get 0.",
			"they-devour": "You Kindle, they Devour: you get 0, they take 5.",
			"both-devour": "Both Devour: 1 Light each.",
		} satisfies Record<Outcome, string>,
		/** Before the first cell: how to use the card. */
		tapHint: "Tap each square to see what happens.",
		/** Once all four are seen. */
		moral:
			"Kindling together pays best over time. Devouring wins one toll, but rivals remember.",
		unveil: "Show me",
		go: "Watch a practice duel",
		/** Screen reader: one cell, unveiled or not. */
		cellLabel: (title: string, a: number, b: number, shown: boolean) =>
			shown ? `${title}: you ${a}, rival ${b}` : `${title}: tap to see`,
	},

	/** One line beside the thing to touch, per onboarding step. */
	coach: {
		mask: "Swipe to choose a mask",
		sigil: "Drag to tune it, or keep the defaults",
		name: "Name it",
		bind: "Bind it",
		seal: "Press to seal",
		gathering: "Your Fragment fights here",
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
		/** Before the first unveil: who chooses. */
		intro: "Your Fragment chooses by its mask. You watch.",
		unveil: "Unveil",
		kindle: "Kindle",
		devour: "Devour",
		light: "Light",
		/** Under each unveiled toll: the rule it just showed. */
		outcome: {
			"both-kindle": "Both Kindled: +3 each",
			"i-devour": "You Devoured: +5 to you, 0 to them",
			"they-devour": "They Devoured: +5 to them, 0 to you",
			"both-devour": "Both Devoured: +1 each",
		} satisfies Record<Outcome, string>,
		/** Accessible line per toll. */
		said: (mine: boolean, theirs: boolean, a: number, b: number) =>
			`Yours ${mine ? "devours" : "kindles"}, the Remnant ${theirs ? "devours" : "kindles"}. ${a} Light to ${b}.`,
		end: "Your Fragment now waits for the next Gathering. Come back to see how it fared.",
		go: "Continue",
	},
} as const;
