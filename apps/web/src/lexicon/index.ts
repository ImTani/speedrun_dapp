// Every player-facing string lives here. No technical words.
export { gathering } from "./gathering.ts";

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

	bind: {
		heading: "Bind a Fragment",
		chooseAspect: "Choose the mask it will wear",
		sigilsHeading: "Carve its Sigils",
		noSigils: "Madness heeds no Sigil.",
		nameLabel: "Speak its name",
		namePlaceholder: "A name for the glass",
		submit: "Bind it",
		binding: "Binding…",
		back: "Another mask",
		next: "Wear this mask",
	},

	status: {
		requested: "The Fragment stirs in the glass…",
		requestedHint: "It wakes slowly. Stay, or return later.",
		registered: "It awaits your seal.",
		registeredHint: "Set your seal upon the binding, and it is yours.",
		seal: "Seal the binding",
		sealing: "The wax is pressed…",
		sealingHint: "The bells must carry your seal across the nave.",
		confirmed: "Bound",
		failed: "The binding broke.",
		failedHint: "The glass would not hold. Try again.",
		sealFailed: "The seal did not take. Press it once more.",
	},

	hero: {
		light: "Light",
		duels: "Gatherings faced",
		sigils: "Sigils",
		retune: "Re-carve the Sigils",
		retuneApply: "Carve anew",
		retuning: "The chisel bites…",
		retuneDone: "The Sigils are recut.",
		retuneFailed: "The stone refused the chisel.",
		retuneLocked:
			"A Gathering is under way. The glass cannot be touched until the bell falls silent.",
		cancel: "Leave it be",
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
