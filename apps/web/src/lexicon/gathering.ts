// Every string the Gathering screen shows. World words only.
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
];
const num = (n: number) => NUM[n] ?? String(n);
const ROMAN: [number, string][] = [
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];
/** Tolls are counted the old way: I, II, III... */
export function roman(n: number): string {
	let v = Math.max(0, Math.floor(n));
	if (v === 0 || v > 39) return String(v);
	let out = "";
	for (const [k, s] of ROMAN)
		while (v >= k) {
			out += s;
			v -= k;
		}
	return out;
}
/** "1st", "2nd", "23rd": a place in the Ledger. */
function nth(n: number): string {
	const t = n % 100;
	if (t >= 11 && t <= 13) return `${n}th`;
	return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export const gathering = {
	label: "The Gathering",
	aspects: [
		"Mercy",
		"Hunger",
		"Echo",
		"Rancour",
		"Appetite",
		"Inquisitor",
		"Madness",
	],
	/** Lead word on a name plate, before the Aspect: "wears MERCY". */
	wearsLead: "wears",
	/** Tag on the Claimant's own Fragment. */
	yours: "Yours",
	nameless: "A nameless Fragment",
	pass: "Pass to the outcome",

	// ---- the bell and the phase banner
	toll: (n: number, of: number) => `Toll ${roman(n)} of ${roman(of)}`,
	/** The numeral struck between the two windows when the bell tolls. */
	tollMark: (n: number) => roman(n),
	tollsAria: (n: number, of: number) => `Toll ${n} of ${of}`,
	phase: {
		commit: "The masked seal their choices",
		reveal: "The masks are lifting",
		between: "The bell gathers breath",
		closed: "Between Gatherings",
	},
	until: {
		commit: "until the unveiling",
		reveal: "until the masks fall",
		between: "until the next toll",
	},
	vision: "A vision of a past Gathering",

	// ---- between Gatherings
	waiting: "The next Gathering",
	waitingHint: "The nave is quiet. The bell will call the masked again soon.",
	lastResult: "The last Gathering has ended.",

	// ---- the unveiling: what each Fragment chose, stamped under its mask
	stamp: {
		kindle: "Kindles",
		devour: "Devours",
		silent: "Silent",
	},

	// ---- the verdict, slammed over the floor
	verdict: {
		devours: (dev: string, vic: string) => `${dev} devours ${vic}`,
		bothKindle: "Both kindle",
		bothDevour: "Both devour",
		silence: "A mask stayed silent",
	},
	/** One short line under the verdict. */
	verdictSub: {
		devour: (vic: string) => `${vic}'s light is torn away.`,
		kindle: "Two lights rise as one.",
		ruin: "Each feeds on the other. The glass darkens.",
		silence: "The silent one is shamed before the glass.",
	},
	/** Rubric over the verdict. */
	verdictKicker: (n: number) => `Toll ${roman(n)}`,
	/** Spoken to screen readers with the verdict. */
	gained: (who: string, n: number) =>
		n > 0 ? `${who} takes ${num(n)} Light.` : `${who} takes nothing.`,

	// ---- the feed of rites
	feedTitle: "Recent rites",
	sealed: (n: string) => `${n} seals its choice.`,
	sealedMany: (n: number) =>
		`${num(n).charAt(0).toUpperCase()}${num(n).slice(1)} masks seal their choices.`,
	pairKindle: (a: string, b: string) => `${a} and ${b} kindled together.`,
	pairDevour: (dev: string, vic: string) => `${dev} devoured ${vic}.`,
	pairRuin: (a: string, b: string) => `${a} and ${b} devoured each other.`,
	opened: "The bell calls a Gathering.",
	tolled: (n: number) => `The bell tolls ${num(n)}.`,
	closed: "The Gathering is ended.",
	quiet: "No rites yet.",

	// ---- the Ledger of Light (standings sheet)
	ledger: "Ledger of Light",
	ledgerTitle: "The Ledger of Light",
	ledgerOpen: "Open the Ledger of Light",
	ledgerEmpty: "No Fragment has yet won Light.",
	/** Under the Ledger handle: where the Claimant's Fragment stands. */
	standing: (place: number) => `Your Fragment stands ${nth(place)}`,
	leader: (name: string) => `${name} leads`,
	light: "Light",
	close: "Close",
} as const;
