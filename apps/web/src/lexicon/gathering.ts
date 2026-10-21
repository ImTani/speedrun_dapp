// Every string the Gathering screen shows. World words only, plain and short.
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
	aspects: [
		"Mercy",
		"Hunger",
		"Echo",
		"Rancour",
		"Appetite",
		"Inquisitor",
		"Madness",
	],
	/** Tag on the player's own Fragment. */
	yours: "Yours",
	nameless: "Unnamed",
	pass: "Skip to the result",

	// ---- the bell and the phase banner
	toll: (n: number, of: number) => `Toll ${n} of ${of}`,
	/** The numeral struck between the two windows when the bell tolls. */
	tollMark: (n: number) => roman(n),
	tollsAria: (n: number, of: number) => `Toll ${n} of ${of}`,
	phase: {
		commit: "Choosing in secret",
		reveal: "Unveiling the choices",
		between: "Next toll soon",
		closed: "Between Gatherings",
	},
	/** One plain line under the banner: what is happening now, in words. */
	phaseHint: {
		commit: (sealed: number, of: number) =>
			of > 0 && sealed >= of
				? "All choices sealed. Unveiling soon."
				: "Each picks Kindle or Devour, sealed until both are in.",
		reveal: "Both choices are shown. Light is paid.",
		between: "Light paid. The bell tolls again soon.",
		closed: "Your Fragment will play on its own. Nothing to press.",
	},
	/** After the countdown: "1:24 left to choose". */
	clockLeft: {
		commit: "left to choose",
		reveal: "left to unveil",
	},
	vision: "Replay of the last Gathering",

	// ---- between Gatherings
	waiting: "Next Gathering soon",

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
	/** The line under the verdict: the Light it moved. */
	verdictSub: {
		each: (n: number) => `+${n} Light each`,
		one: (name: string, n: number) => `${name} +${n} Light`,
	},
	/** Rubric over the verdict. */
	verdictKicker: (n: number) => `Toll ${n}`,
	/** Spoken to screen readers with the verdict. */
	gained: (who: string, n: number) =>
		n > 0 ? `${who} gains ${n} Light.` : `${who} gains nothing.`,

	// ---- the feed
	feedTitle: "Latest",
	sealed: (n: string) => `${n} sealed`,
	sealedMany: (n: number) => `${n} Fragments sealed`,
	pairKindle: (a: string, b: string) => `${a} and ${b} kindled`,
	pairDevour: (dev: string, vic: string) => `${dev} devoured ${vic}`,
	pairRuin: (a: string, b: string) => `${a} and ${b} devoured each other`,
	opened: "Gathering begins",
	tolled: (n: number) => `Toll ${n}`,
	closed: "Gathering ended",
	quiet: "Nothing yet",

	// ---- the seals of this toll, pressed on the floor while the masked choose
	sealsTitle: (n: number) => `Seals · Toll ${n}`,
	sealsCount: (n: number, of: number) =>
		n === 0
			? "None sealed yet"
			: n >= of
				? "All sealed"
				: `${n} of ${of} sealed`,
	/** Spoken for one seal in the row. */
	sealOf: (name: string, aspect: string, sealed: boolean) =>
		`${name}, ${aspect}: ${sealed ? "sealed" : "not sealed"}`,

	// ---- the Ledger of Light (standings sheet)
	ledger: "Ledger of Light",
	ledgerTitle: "Ledger of Light",
	ledgerOpen: "Open the Ledger of Light",
	ledgerEmpty: "No Light won yet",
	/** Under the Ledger handle: where the player's Fragment stands. */
	standing: (place: number) => `Yours is ${nth(place)}`,
	leader: (name: string) => `${name} leads`,
	light: "Light",
	close: "Close",
} as const;
