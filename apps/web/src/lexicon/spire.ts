// Spire labels. Short and plain: what the player needs to read.
import { roman } from "./gathering.ts";

function wait(ms: number): string {
	const m = Math.max(1, Math.ceil(ms / 60_000));
	const h = Math.floor(m / 60);
	return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export const spire = {
	title: "The Spire",
	/** "Degree VI" */
	degreeOf: (d: number) => `Degree ${roman(d)}`,
	summit: "Summit reached",
	summitLine: "Every Remnant has fallen. Floors stay open to climb again.",
	/** "Level 12 of 15" */
	levelOf: (level: number, cap: number) => `Level ${level} of ${cap}`,
	floor: (n: number) => `Floor ${roman(n)}`,
	floorAria: (n: number, name: string, status: string) =>
		`Floor ${n}, ${name}, ${status}`,
	boss: "Remnant",
	aspects: [
		"Mercy",
		"Hunger",
		"Echo",
		"Rancour",
		"Appetite",
		"Inquisitor",
		"Madness",
	],
	status: { cleared: "Cleared", open: "Open", locked: "Locked" },
	lock: {
		below: "Clear the floor below",
		/** "Reach level 15" */
		level: (cap: number) => `Reach level ${cap}`,
	},
	/** "Needs 13 Light" */
	need: (n: number) => `Needs ${n} Light`,
	/** "+60 Ash · +90 Resonance" */
	reward: (ash: number, resonance: number) =>
		`+${ash} Ash · +${resonance} Resonance`,

	climbs: "Climbs",
	/** "3 of 5" */
	climbsOf: (left: number, max: number) => `${left} of ${max}`,
	/** "+1 in 2h 14m" */
	nextIn: (ms: number) => `+1 in ${wait(ms)}`,
	full: "Full",

	/** The button: the action and the floor. "Climb IV" */
	climb: (floor: number) => `Climb ${roman(floor)}`,
	/** The button with no climbs left (the wait goes in the note under it). */
	climbBare: "Climb",
	climbing: "Climbing…",
	noClimbs: "No climbs left",
	/** The note under a disabled Climb: "Next climb in 2h 14m" */
	nextClimb: (ms: number) => `Next climb in ${wait(ms)}`,
	pick: "Choose a floor",

	duel: {
		kindle: "Kindle",
		devour: "Devour",
		light: "Light",
		/** "Turn 3: you Kindle, it Devours" */
		turnAria: (n: number, mine: boolean, theirs: boolean) =>
			`Turn ${n}: yours ${mine ? "Devours" : "Kindles"}, the Remnant ${theirs ? "Devours" : "Kindles"}`,
		/** "15 Light · needed 12" */
		score: (mine: number, need: number) => `${mine} Light · needed ${need}`,
		won: "Cleared",
		lost: "Fallen",
		firstClear: "First clear",
		replay: "Replay reward",
		/** "Degree VI reached" */
		promoted: (d: number) => `Degree ${roman(d)} reached`,
		continue: "Continue",
		skip: "Skip",
	},

	noFragment: "Bind a Fragment to climb the Spire.",
	loading: "Loading…",
	errors: {
		generic: "Something went wrong. Try again.",
		unavailable: "The Spire is closed for now. Come back soon.",
		noClimbs: "No climbs left.",
		locked: "That floor is locked.",
		busy: "A climb is already under way.",
		retry: "Try again",
	},
} as const;
