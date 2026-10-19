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
	tagline: "The god devoured itself. Its light lies shattered in the glass.",
	enter: "Enter the nave",
	entering: "The doors groan…",
	leave: "Leave the nave",

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
			blurb: "Gives its light freely, whatever is done to it.",
		},
		{
			key: "hunger",
			name: "Hunger",
			mask: "Bauta",
			blurb: "Takes. Always takes. Never kneels.",
		},
		{
			key: "echo",
			name: "Echo",
			mask: "Colombina",
			blurb: "Returns to each what each gave last.",
		},
		{
			key: "rancour",
			name: "Rancour",
			mask: "Pantalone",
			blurb: "Kind until wronged. Then never again.",
		},
		{
			key: "appetite",
			name: "Appetite",
			mask: "Arlecchino",
			blurb: "Repeats what fed it; turns from what starved it.",
		},
		{
			key: "inquisitor",
			name: "Inquisitor",
			mask: "Medico della Peste",
			blurb: "Probes the stranger first, then judges.",
		},
		{
			key: "madness",
			name: "Madness",
			mask: "Jolly",
			blurb: "Heeds no voice but the dice of the void.",
		},
	],

	sigils: {
		forgiveness: {
			name: "Clemency",
			desc: "How often it spares one who wronged it.",
		},
		retaliation: {
			name: "Retribution",
			desc: "How many tolls its vengeance lasts.",
		},
		memory: {
			name: "Remembrance",
			desc: "How many tolls of the past it weighs.",
		},
		opening: {
			name: "First Gesture",
			desc: "What it offers a stranger at the first toll.",
		},
		noise: {
			name: "Tremor",
			desc: "How often its hand shakes and betrays its will.",
		},
	},
	firstGesture: ["Kindle", "Devour", "Fate"],

	/** Live readings of a Sigil as it is carved: what the Fragment will do. */
	reading: {
		forgiveness: (v: number) =>
			v <= 0
				? "It spares no one who wronged it."
				: v >= 100
					? "It spares every wrong done to it."
					: `It spares ${oneIn(v)} wrongs done to it.`,
		retaliation: (v: number) =>
			v <= 1
				? "Its vengeance lasts a single toll."
				: `Its vengeance lasts ${num(v)} tolls.`,
		memory: (v: number) =>
			v <= 1
				? "It weighs only the last toll."
				: `It weighs the last ${num(v)} tolls.`,
		opening: (v: number) =>
			[
				"It offers a stranger its light.",
				"It strikes a stranger first.",
				"It lets fate choose its first gesture.",
			][v] ?? "",
		noise: (v: number) =>
			v <= 0 ? "Its hand never shakes." : `Its hand shakes ${oneIn(v)} tolls.`,
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
		steps: ["The Mask", "The Sigils", "The Name"],
		stepMark: ["I", "II", "III"],
		chooseAspect: "Choose the mask it will wear",
		swipe: "Swipe the glass to try another mask",
		prevMask: "The mask before",
		nextMask: "The mask after",
		wear: "Wear this mask",
		sigilsHeading: "Carve its Sigils",
		sigilsHint: "Drag along the notches. The glass tells you what it will do.",
		noSigils: "Madness heeds no Sigil.",
		noSigilsHint:
			"Its will is the dice of the void. There is nothing to carve.",
		carve: "Carve them so",
		nameHeading: "Speak its name",
		nameHint: "The name is cut into its plate and spoken in every Gathering.",
		nameLabel: "Its name",
		namePlaceholder: "A name for the glass",
		divine: "Divine a name",
		submit: "Bind it",
		binding: "The wax is poured…",
		back: "Back",
		poured: "The wax is poured",
		pouredLine: "The glass begins to stir.",
		/** Names the glass may whisper when the Claimant asks it to divine one. */
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
		stirs: "The Fragment stirs",
		requested: "It stirs in the glass…",
		requestedHint: "It wakes slowly. Stay, or return later; it will wait.",
		registered: "It awaits your seal",
		registeredHint:
			"The wax is warm. Press your seal into it, and the Fragment is yours.",
		seal: "Press your seal",
		sealing: "The wax is pressed…",
		sealingHint: "The bells carry your seal across the nave.",
		confirmed: "Bound",
		boundLine: "It is yours. The glass remembers its name.",
		failed: "The binding broke",
		failedHint:
			"The glass would not hold. The keepers of the nave must mend it before it can be bound again.",
		sealFailed: "The seal did not take. Press it once more.",
	},

	hero: {
		lead: "wears",
		light: "Light",
		duels: "Gatherings faced",
		sigils: "Its Sigils",
		noSigils: "Madness heeds no Sigil.",
		retune: "Re-carve the Sigils",
		retuneHeading: "Re-carve the Sigils",
		retuneHint: "The new cut holds from the next Gathering.",
		retuneApply: "Carve anew",
		retuning: "The chisel bites…",
		retuneDone: "The Sigils are recut.",
		retuneFailed: "The stone refused the chisel.",
		retuneLockedHead: "The chisel is chained",
		retuneLocked:
			"A Gathering is under way. The glass cannot be touched until the bell falls silent.",
		cancel: "Leave it be",
		lightHint: "Touch the glass to move the light behind it.",
	},

	sealed: {
		spire: {
			name: "The Spire",
			text: "Its stair is bricked shut. Something waits at every Degree.",
		},
		reliquary: {
			name: "The Reliquary",
			text: "The reliquary is chained. Scrying is not yet permitted.",
		},
		vestry: {
			name: "The Vestry",
			text: "The vestments hang under dust sheets. The Vestry is sealed.",
		},
		footer: "Sealed",
	},

	errors: {
		generic: "The candles gutter. Something went wrong.",
		unavailable: "The cathedral is silent for now. Return soon.",
		noVoice: "The cathedral cannot hear you.",
	},
} as const;

export type AspectKey = (typeof L.aspects)[number]["key"];
