// Every string for Marks and notifications. Plain and short. No imports: the runner reads the
// `push` block by relative path.

const DEGREES = [
	"",
	"First",
	"Second",
	"Third",
	"Fourth",
	"Fifth",
	"Sixth",
	"Seventh",
];
const TIERS = ["", "I", "II", "III", "IV", "V"];

/** "First Degree", "Sixth Degree". */
export const degreeName = (degree: number) =>
	`${DEGREES[degree] ?? degree} Degree`;

export const marks = {
	heading: "Marks",
	intro: "Earned by your Fragment. Yours for good; they cannot be traded.",
	stigmataHeading: "Stigmata",
	stigmataIntro: "Only one Claimant can ever hold each.",

	/** Name and the line that says how each tier is earned. */
	kinds: {
		degree: {
			name: "Degree",
			tierName: (tier: number) => degreeName(tier),
			how: (tier: number) => `Reach the ${degreeName(tier)}.`,
		},
		firstGathering: {
			name: "First Gathering",
			tierName: () => "First Gathering",
			how: () => "Fight in a Gathering.",
		},
		devourer: {
			name: "Devourer",
			tierName: (tier: number) => `Devourer ${TIERS[tier] ?? tier}`,
			how: (need: number) => `Devour ${need} times.`,
		},
		kindler: {
			name: "Kindler",
			tierName: (tier: number) => `Kindler ${TIERS[tier] ?? tier}`,
			how: (need: number) => `Kindle ${need} times.`,
		},
		spire: {
			name: "Spire",
			tierName: (tier: number) => `Spire ${TIERS[tier] ?? tier}`,
			how: (need: number) => `Clear ${need} Spire floors.`,
		},
		steadfast: {
			name: "Steadfast",
			tierName: (tier: number) => `Steadfast ${TIERS[tier] ?? tier}`,
			how: (need: number) => `Fight in ${need} Gatherings.`,
		},
		firstOfTheFirst: {
			name: "First of the First",
			tierName: () => "First of the First",
			how: () => "Be the first Claimant to reach the First Degree.",
		},
	},

	state: {
		locked: "Locked",
		earned: "Earned",
		sealed: "Sealed",
		taken: "Claimed",
	},
	/** Under an earned Mark that is not sealed yet. */
	sealingSoon: "Sealing soon",
	/** Progress toward a locked tier: "12 / 50". */
	progress: (have: number, need: number) => `${Math.min(have, need)} / ${need}`,
	takenBy: "Another Claimant holds it.",
	newMark: "New Mark",
	empty: "No Marks yet. Your Fragment earns them in Gatherings and the Spire.",

	notify: {
		heading: "Notifications",
		offer: "Tell me when a Gathering opens",
		on: "Notifications on",
		turnOff: "Turn off",
		working: "One moment…",
		denied: "Notifications are blocked. Allow them in your browser settings.",
		unsupported:
			"This browser can't notify you. On iPhone, add the app to your Home Screen first.",
		failed: "Couldn't turn notifications on. Try again.",
	},

	/** Push messages the runner sends (apps/runner/src/notify.ts). */
	push: {
		openTitle: "A Gathering opens",
		openBodyYours: (name: string) => `${name} is fighting. Come and watch.`,
		openBody: "Come and watch.",
	},

	errors: {
		load: "Couldn't load your Marks.",
	},
} as const;
