// How to play: the Codex sheet, the first-visit intro cards on each tab, and the Gathering's
// "what am I looking at" overlay. Plain and short: a sentence or two per beat, numbers shown.
// World words are paired with their plain meaning the first time they appear.
import { roman } from "./gathering.ts";

export type CodexSection =
	| "premise"
	| "fragment"
	| "gathering"
	| "between"
	| "words";

export type IntroTab =
	| "fragment"
	| "spire"
	| "gathering"
	| "reliquary"
	| "vestry";

export const codex = {
	/** The way in: under Enter on the title, in Settings, on every intro card. */
	open: "How to play",
	heading: "How to play",
	close: "Close",
	/** Accessible name of the row of section links. */
	jumpTo: "Sections",

	/** Short names for the row of section links. */
	nav: {
		premise: "Premise",
		fragment: "Fragment",
		gathering: "Gatherings",
		between: "Between",
		words: "Words",
	} satisfies Record<CodexSection, string>,

	head: {
		premise: "The premise",
		fragment: "Your Fragment",
		gathering: "Gatherings",
		between: "Between Gatherings",
		words: "Words",
	} satisfies Record<CodexSection, string>,

	premise: [
		"A god devoured itself. Its light lies shattered in stained glass.",
		"You claim one shard, a Fragment, and send it out to win Light (your score).",
	],

	fragment: {
		masks: "Its mask is its temperament: how it plays.",
		sigils: "Its Sigils fine-tune that temperament.",
		/** Plain readings of each Sigil, keyed like L.sigils. */
		sigil: {
			forgiveness: "Chance it forgives a Devour.",
			retaliation: "How many tolls it strikes back.",
			memory: "How many past tolls it remembers.",
			opening: "Its first choice against a new rival.",
			noise: "Chance its hand slips and it does the opposite.",
		},
		retune: "Change them between Gatherings: Retune, on the Fragment tab.",
	},

	gathering: {
		lead: "Gatherings are held on a schedule. Your Fragment plays on its own.",
		steps: [
			{
				head: "Paired",
				line: "Fragments are paired off. Yours meets the same rival for several tolls in a row.",
			},
			{
				head: "Sealed",
				line: "Each toll (one round), both choose in secret: Kindle (share) or Devour (steal).",
			},
			{
				head: "Unveiled",
				line: "Both choices are shown at once, and Light is paid.",
			},
		],
		table: "Light for each toll",
		lesson:
			"Two kindlers earn 3 each, every toll. A devourer grabs 5, but a wary rival stops kindling back.",
		auto: "You press nothing during a Gathering. Come back to see how it did; each toll also pays Ash and Resonance.",
	},

	between: {
		vigil: {
			name: "Vigil",
			line: (hours: number) =>
				`Ash and Resonance pile up while you're away, up to ${hours} hours. Tap Collect.`,
		},
		spire: {
			name: "Spire",
			line: (floors: number) =>
				`Climb ${floors} floors of Remnants (set rivals) for Ash and Resonance. Beat the top one to rise a Degree.`,
		},
		reliquary: {
			name: "Reliquary",
			line: (cost: number) =>
				`Spend ${cost} Ash to scry for a random finish, tint or title. Looks only.`,
		},
		vestry: {
			name: "Vestry",
			line: "Packs of looks for your Fragment. Looks only.",
		},
		marks: {
			name: "Marks",
			line: "Badges for milestones, shown on the Fragment tab.",
		},
	},

	/** The glossary: the world word, then what it means. */
	words: [
		["Fragment", "Your fighter"],
		["Light", "Your score in Gatherings"],
		["Kindle", "Share: cooperate"],
		["Devour", "Steal: betray"],
		["Toll", "One round"],
		["Ash", "Coins to spend"],
		["Resonance", "Experience: fills your level"],
		["Degree", `Your rank, from ${roman(7)} up to ${roman(1)}`],
		["Remnant", "A Spire rival"],
	] as const,

	/** The Light table (Codex and the Gathering overlay). Big number: yours. Small: the rival's. */
	table: {
		yours: "Yours",
		rival: "Rival",
		kindles: "Kindles",
		devours: "Devours",
		rivalGets: (n: number) => `rival +${n}`,
		/** Spoken for each cell. */
		cell: (mine: string, theirs: string, a: number, b: number) =>
			`Yours ${mine}, rival ${theirs}: yours gets ${a} Light, the rival ${b}.`,
		kindleWord: "kindles",
		devourWord: "devours",
	},

	/** First-visit cards, one per tab. */
	intro: {
		ok: "Got it",
		more: "More in How to play",
		fragment: {
			title: "Your Fragment",
			what: "This is your Fragment. Its mask decides how it plays: when it kindles, when it devours.",
			todo: "It fights on its own in Gatherings. Come back here to collect what it earns and tune it.",
		},
		gathering: {
			title: "The Gathering",
			what: "Where Fragments meet. Each toll, two rivals choose in secret: Kindle (share) or Devour (steal).",
			todo: "Nothing to press: yours plays on its own. Tap ? any time to see what is happening.",
		},
		spire: {
			title: "The Spire",
			what: "A tower of Remnants that test your Fragment's temperament.",
			todo: "Climb a floor to earn Ash (coins) and Resonance (experience). Beat the Remnant on top to rise a Degree (rank).",
		},
		reliquary: {
			title: "The Reliquary",
			what: "Spend Ash (coins) to scry: a random finish, tint or title for your Fragment.",
			todo: "Tap Scry, then Wear what you like. Looks only: it never changes how your Fragment plays.",
		},
		vestry: {
			title: "The Vestry",
			what: "Packs of vestments: finishes, tints and titles for your Fragment.",
			todo: "Buy a pack, then choose what to wear in the Wardrobe. Looks only.",
		},
	},

	/** The Gathering's "?" overlay: what is on screen right now. */
	explain: {
		open: "What is happening here?",
		heading: "What you're seeing",
		facing: (a: string, b: string) => `${a} faces ${b}.`,
		facingMine: (mine: string, rival: string) =>
			`Yours, ${mine}, faces ${rival}.`,
		others: "Every pair's duel plays here in turn, yours included.",
		empty: "Two Fragments will face each other here.",
		yours: "Yours",
		steps: ["Paired", "Choose in secret", "Unveiled"],
		now: {
			commit: "Now: both are choosing. Choices stay sealed until both are in.",
			reveal: "Now: the choices are shown and Light is paid.",
			between: "Now: Light is paid. The next toll starts soon.",
			closed: "No Gathering right now. You're seeing the last result.",
			vision: "This is a replay of the last Gathering.",
		},
		/** "6 tolls (rounds) in this Gathering. Rivals stay paired for 3 in a row, ..." */
		tolls: (rounds: number, perRival: number) =>
			perRival >= rounds
				? `${rounds} tolls (rounds) in this Gathering, all against the same rival, so trust and betrayal carry over.`
				: `${rounds} tolls (rounds) in this Gathering. Rivals stay paired for ${perRival} in a row, so trust and betrayal carry over.`,
		auto: "Your Fragment plays on its own. Nothing to press: come back later and check the Ledger of Light.",
		table: "Light for each toll",
		more: "More in How to play",
		close: "Close",
	},
} as const;
