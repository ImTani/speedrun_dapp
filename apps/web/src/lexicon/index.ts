// Every player-facing string lives here. No technical words.
export { gathering } from "./gathering.ts";

const NUM = [
	"no",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve",
	"thirteen",
	"fourteen",
	"fifteen",
	"sixteen",
	"seventeen",
	"eighteen",
	"nineteen",
	"twenty",
];
const BIG: Record<number, string> = {
	25: "twenty-five",
	50: "fifty",
	100: "a hundred",
};
const num = (n: number) => NUM[n] ?? BIG[n] ?? String(n);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** A chance in hundredths, said the old way: "one in five", "three in ten". */
function oneIn(pct: number): string {
	const n = 100 / pct;
	if (pct === 50) return "half the";
	if (Number.isInteger(n)) return `one in ${num(n)}`;
	if (pct % 10 === 0) return `${num(pct / 10)} in ten`;
	if (pct % 5 === 0) return `${num(pct / 5)} in twenty`;
	return `${num(pct)} in a hundred`;
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
		},
		{
			key: "hunger",
			name: "Hunger",
			mask: "Bauta",
			blurb: "Always devours.",
		},
		{
			key: "echo",
			name: "Echo",
			mask: "Colombina",
			blurb: "Does what its rival did last toll.",
		},
		{
			key: "rancour",
			name: "Rancour",
			mask: "Pantalone",
			blurb: "Kindles until devoured once, then always devours.",
		},
		{
			key: "appetite",
			name: "Appetite",
			mask: "Arlecchino",
			blurb: "Repeats a choice that paid off, changes one that didn't.",
		},
		{
			key: "inquisitor",
			name: "Inquisitor",
			mask: "Medico della Peste",
			blurb: "Tests a new rival, then preys on the meek or copies the rest.",
		},
		{
			key: "madness",
			name: "Madness",
			mask: "Jolly",
			blurb: "Chooses at random.",
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

	/** Live readings of a Sigil as it is set: what the Fragment will do. */
	reading: {
		forgiveness: (v: number) =>
			v <= 0
				? "Never forgives."
				: v >= 100
					? "Always forgives."
					: v === 50
						? "Forgives half the time."
						: `Forgives ${oneIn(v)} times.`,
		retaliation: (v: number) =>
			v <= 1
				? "Strikes back for one toll."
				: `Strikes back for ${num(v)} tolls.`,
		memory: (v: number) =>
			v <= 1
				? "Remembers only the last toll."
				: `Remembers the last ${num(v)} tolls.`,
		opening: (v: number) =>
			[
				"Kindles at the first toll.",
				"Devours at the first toll.",
				"Leaves the first toll to chance.",
			][v] ?? "",
		noise: (v: number) =>
			v <= 0 ? "Never slips." : `Slips ${oneIn(v)} tolls.`,
	},
	/** The same readings, short enough for an engraved tile. */
	short: {
		forgiveness: (v: number) =>
			v <= 0 ? "None" : v >= 100 ? "All" : v === 50 ? "Half" : cap(oneIn(v)),
		retaliation: (v: number) => (v <= 1 ? "One toll" : `${cap(num(v))} tolls`),
		memory: (v: number) => (v <= 1 ? "One toll" : `${cap(num(v))} tolls`),
		opening: (v: number) => ["Kindle", "Devour", "Fate"][v] ?? "",
		noise: (v: number) => (v <= 0 ? "Steady" : cap(oneIn(v))),
	},

	bind: {
		heading: "Bind a Fragment",
		steps: ["Mask", "Sigils", "Name"],
		stepMark: ["I", "II", "III"],
		chooseAspect: "Choose a mask",
		swipe: "Swipe for another mask",
		prevMask: "Previous mask",
		nextMask: "Next mask",
		wear: "Choose this mask",
		sigilsHeading: "Set its Sigils",
		noSigils: "Madness has no Sigils.",
		noSigilsHint: "It chooses at random.",
		carve: "Next",
		nameHeading: "Name it",
		nameHint: "Everyone sees it in the Gathering.",
		nameLabel: "Name",
		namePlaceholder: "Up to 24 letters",
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
