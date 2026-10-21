// Every player-facing string lives here. No technical words.
export { gathering } from "./gathering.ts";

/** A chance in hundredths, as a plain fraction in digits: (30, "Devour", "Devours") -> "3 Devours in 10". */
function inN(pct: number, one: string, many: string): string {
	const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
	const g = gcd(pct, 100);
	const n = pct / g;
	return `${n} ${n === 1 ? one : many} in ${100 / g}`;
}

export const L = {
	title: "Apostasy",
	subtitle: "Sede Vacante",
	enter: "Enter",
	entering: "Opening…",

	tabs: {
		fragment: "Fragment",
		spire: "Spire",
		gathering: "Gathering",
		reliquary: "Reliquary",
		vestry: "Vestry",
	},

	aspects: [
		{
			key: "mercy",
			name: "Mercy",
			mask: "Volto",
			blurb: "Always kindles.",
			plays: "Kind to everyone, so easy prey for anyone who devours.",
		},
		{
			key: "hunger",
			name: "Hunger",
			mask: "Bauta",
			blurb: "Always devours.",
			plays: "Takes 5 from the trusting, but only 1 from its own kind.",
		},
		{
			key: "echo",
			name: "Echo",
			mask: "Colombina",
			blurb: "Copies what its rival did last toll.",
			plays: "Kind to the kind, cruel to the cruel.",
		},
		{
			key: "rancour",
			name: "Rancour",
			mask: "Pantalone",
			blurb: "Kindles until devoured once, then devours for good.",
			plays: "A loyal friend who never forgives.",
		},
		{
			key: "appetite",
			name: "Appetite",
			mask: "Arlecchino",
			blurb: "Keeps a choice that paid off, switches after one that didn't.",
			plays: "If it worked, again. If it hurt, change.",
		},
		{
			key: "inquisitor",
			name: "Inquisitor",
			mask: "Medico della Peste",
			blurb: "Tests a new rival for 4 tolls, then acts on what it learned.",
			plays: "Preys on rivals who never strike back. Copies the rest.",
		},
		{
			key: "madness",
			name: "Madness",
			mask: "Jolly",
			blurb: "Chooses at random.",
			plays: "Half Kindle, half Devour. No one can read it.",
		},
	],

	sigils: {
		forgiveness: {
			name: "Clemency",
			desc: "How often it forgives a Devour.",
		},
		retaliation: {
			name: "Retribution",
			desc: "How long it strikes back.",
		},
		memory: {
			name: "Remembrance",
			desc: "How many past tolls it remembers.",
		},
		opening: {
			name: "First Gesture",
			desc: "Its choice at the first toll against a new rival.",
		},
		noise: {
			name: "Tremor",
			desc: "How often it does the opposite by mistake.",
		},
	},
	firstGesture: ["Kindle", "Devour", "Fate"],

	/** Live readings of a Sigil as it is set: what the Fragment will do, in numbers. */
	reading: {
		forgiveness: (v: number) =>
			v <= 0
				? "Never forgives a Devour."
				: v >= 100
					? "Forgives every Devour."
					: `Forgives ${inN(v, "Devour", "Devours")}.`,
		retaliation: (v: number) =>
			v <= 1
				? "After a Devour, strikes back for 1 toll."
				: `After a Devour, strikes back for ${v} tolls.`,
		memory: (v: number) =>
			v <= 1
				? "Remembers only its rival's last toll."
				: `Remembers its rival's last ${v} tolls.`,
		opening: (v: number) =>
			[
				"Kindles at the first toll with a new rival.",
				"Devours at the first toll with a new rival.",
				"Leaves the first toll with a new rival to chance.",
			][v] ?? "",
		noise: (v: number) =>
			v <= 0
				? "Never slips. Always does what it means to."
				: `Does the opposite by mistake ${inN(v, "toll", "tolls")}.`,
	},
	/** The same readings, short enough for an engraved tile. */
	short: {
		forgiveness: (v: number) => `${v}%`,
		retaliation: (v: number) => (v <= 1 ? "1 toll" : `${v} tolls`),
		memory: (v: number) => (v <= 1 ? "1 toll" : `${v} tolls`),
		opening: (v: number) => ["Kindle", "Devour", "Fate"][v] ?? "",
		noise: (v: number) => (v <= 0 ? "Steady" : `${v}%`),
	},

	bind: {
		heading: "Bind a Fragment",
		steps: ["Mask", "Sigils", "Name"],
		stepMark: ["I", "II", "III"],
		chooseAspect: "Choose a mask",
		/** Under the heading: what the choice means. */
		chooseAspectHint: "The mask decides how your Fragment plays.",
		/** Before the "plays like" line under each mask. */
		playsLike: "Plays like",
		swipe: "Swipe for another mask",
		prevMask: "Previous mask",
		nextMask: "Next mask",
		wear: "Choose this mask",
		sigilsHeading: "Set its Sigils",
		/** Under the heading, with the Aspect's name. */
		sigilsHint: (aspect: string) =>
			`Fine-tune how ${aspect} plays. The defaults work fine.`,
		noSigils: "Madness has no Sigils.",
		noSigilsHint: "It chooses at random.",
		carve: "Next",
		nameHeading: "Name it",
		nameHint: "Everyone sees it in the Gathering.",
		nameLabel: "Name",
		namePlaceholder: "Up to 24 letters",
		/** Shown under the field as the name nears the limit. */
		nameCount: (n: number, max: number) => `${n} / ${max}`,
		nameCountLabel: (left: number) =>
			left === 1 ? "1 letter left" : `${left} letters left`,
		divine: "Suggest a name",
		submit: "Bind",
		binding: "Binding…",
		back: "Back",
		poured: "Bound",
		/** Names offered when the player asks for a suggestion. */
		names: [
			"Vesper",
			"Old Marrow",
			"Sister Ash",
			"Brother Tallow",
			"Compline",
			"Matins",
			"The Pale Choir",
			"Saint Gnaw",
			"Mother Wick",
			"Lauds",
			"Thurible",
			"Ossuary",
			"The Cinder Abbess",
			"The Hollow Bell",
			"Gloam",
			"Penitent Hush",
			"Candlemas",
			"Lady Soot",
			"The Ninth Pew",
			"Saltwound",
			"Rook of the Nave",
			"Dregs",
			"Miserere",
			"Lantern Jack",
			"The Last Novice",
			"Tenebrae",
			"Widow Censer",
			"Quiet Marrowbone",
			"The Gilded Tooth",
			"Nocturne",
			"Sexton Grieve",
			"Ember Prior",
		],
	},

	status: {
		stirs: "Waking…",
		requestedHint: "Takes about a minute. You can leave and come back.",
		registered: "Ready to seal",
		seal: "Seal",
		sealing: "Sealing…",
		confirmed: "Bound",
		boundLine: "It fights from the next Gathering.",
		failed: "Binding failed",
		failedHint: "This one can't be bound. Try again later.",
		sealFailed: "Sealing failed. Try again.",
	},

	hero: {
		/** The engraved line under a Fragment's name: its Aspect. */
		aspectLine: (aspect: string, _mask?: string) => aspect,
		light: "Light",
		duels: "Gatherings",
		sigils: "Sigils",
		noSigils: "Madness has no Sigils.",
		retune: "Retune",
		retuneHeading: "Retune Sigils",
		retuneHint: "Applies from the next Gathering.",
		retuneApply: "Save",
		retuning: "Saving…",
		retuneDone: "Sigils saved.",
		retuneFailed: "Couldn't save. Try again.",
		retuneLockedHead: "Gathering underway",
		retuneLocked: "Retune after it ends.",
		cancel: "Cancel",
	},

	errors: {
		generic: "Something went wrong.",
		unavailable: "Not available right now. Try again soon.",
		noVoice: "Can't connect. Try again.",
	},
} as const;

export type AspectKey = (typeof L.aspects)[number]["key"];
