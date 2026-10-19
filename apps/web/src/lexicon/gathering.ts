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
	wears: (aspect: string) => `wears ${aspect}`,
	nameless: "A nameless Fragment",
	pass: "Pass to the outcome",

	toll: (n: number, of: number) => `Toll ${n} of ${of}`,
	phase: {
		commit: "The masked seal their choices",
		reveal: "The masks are lifting",
		between: "The bell gathers breath",
		closed: "Between Gatherings",
	},
	until: (s: string) => `${s} remain`,
	waiting: "The next Gathering",
	waitingHint: "The nave is quiet. The bell will call the masked again soon.",
	vision: "A vision of a past Gathering",
	lastResult: "The last Gathering has ended.",

	// the slammed outcome
	devours: (dev: string) => `${dev} devours`,
	drained: (vic: string) => `${vic}'s light is drawn across the floor.`,
	takes: (who: string, n: number) => `${who} takes ${num(n)}.`,
	bothKindle: "Both kindle",
	risesTogether: "Two lights rise together.",
	eachTakes: (n: number) => `Each takes ${num(n)}.`,
	bothDevour: "Both devour",
	glassDarkens: "The glass darkens on both sides.",
	bothTake: (a: string, n: number, b: string, m: number) =>
		`${a} takes ${num(n)}, ${b} ${num(m)}.`,
	silence: "A mask stayed silent",
	silenceLine: "The silent one is shamed before the glass.",

	// the feed of rites
	feedTitle: "Recent rites",
	sealed: (n: string) => `${n}'s choice is sealed.`,
	kindled: (n: string) => `${n} kindled.`,
	devoured: (n: string) => `${n} devoured.`,
	pairKindle: (a: string, b: string) => `${a} and ${b} kindled together.`,
	pairDevour: (dev: string, vic: string) => `${dev} devoured ${vic}.`,
	pairRuin: (a: string, b: string) => `${a} and ${b} devoured each other.`,
	opened: "The bell calls a Gathering.",
	tolled: (n: number) => `The bell tolls (${n}).`,
	tollEnds: "The toll falls silent.",
	closed: "The Gathering is ended.",
	quiet: "No rites yet.",

	// standings
	ledger: "Light",
	ledgerTitle: "The Ledger of Light",
	ledgerEmpty: "No Fragment has yet won Light.",
	rank: "Rank",
	light: "Light",
	close: "Close",
} as const;
