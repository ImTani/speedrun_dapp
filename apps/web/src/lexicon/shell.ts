// Strings for the shell: title screen, the five tabs, sealed doors, credits.
// Player-facing only. No technical words.

export const shell = {
	title: {
		name: "Apostasy",
		sub: "Sede Vacante",
		enter: "Enter",
		entering: "Opening…",
		/** Shown by the sign-in button (consent at the point of collection, as DPDP asks). */
		consent: {
			lead: "By continuing you agree to the",
			terms: "Terms",
			and: "and",
			privacy: "Privacy Policy",
		},
	},

	/** Accessible name of the tab bar. */
	ways: "Main",
	tabs: {
		fragment: "Fragment",
		spire: "Spire",
		gathering: "Gathering",
		reliquary: "Reliquary",
		vestry: "Vestry",
	},

	sealed: {
		tag: "Sealed",
		spire: {
			name: "The Spire",
			line: "Not open yet.",
		},
		reliquary: {
			name: "The Reliquary",
			line: "Not open yet.",
		},
		vestry: {
			name: "The Vestry",
			line: "Not open yet.",
		},
	},

	colophon: {
		open: "Credits",
		heading: "Credits",
		masks: "Masks",
		carvings: "Icons",
		carvingsLine:
			"Icons by Lorc and Delapouite, game-icons.net, CC BY 3.0 (creativecommons.org/licenses/by/3.0). Recoloured and shaded.",
		letters: "Fonts",
		lettersLine:
			"Grenze and Grenze Gotisch by Renata Polastri (Omnibus-Type), Alegreya by Juan Pablo del Peral (Huerta Tipográfica), IM Fell English by Igino Marini, Cinzel by Natanael Gama. SIL Open Font License 1.1.",
		roll: "All sources",
		close: "Close",
		/** In the game the same leaf is the settings sheet (the gear by the speaker). */
		settings: "Settings",
		openSettings: "Settings and credits",
		sound: "Sound",
		legal: "Legal",
	},
} as const;

export type ShellTab = keyof typeof shell.tabs;
