// Strings for the shell: title screen, the five ways (tabs), sealed doors, colophon.
// Player-facing only. No technical words.

export const shell = {
	title: {
		name: "Apostasy",
		sub: "Sede Vacante",
		tagline: "The god devoured itself. Its light lies shattered in the glass.",
		enter: "Enter the nave",
		entering: "The doors groan…",
	},

	/** Accessible name of the tab bar. */
	ways: "The ways of the nave",
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
			line: "Its stair is bricked shut. Something waits at every Degree.",
		},
		reliquary: {
			name: "The Reliquary",
			line: "Chained and sealed in wax. What lies within may not yet be scried.",
		},
		vestry: {
			name: "The Vestry",
			line: "The vestments sleep beneath their dust sheets.",
		},
	},

	colophon: {
		open: "Colophon",
		heading: "Colophon",
		lead: "Those whose hands shaped this cathedral.",
		masks: "The masks",
		carvings: "The carvings",
		carvingsLine:
			"Carvings after icons by Lorc and Delapouite, game-icons.net, CC BY 3.0 (creativecommons.org/licenses/by/3.0). Recoloured and shaded.",
		letters: "The letters",
		lettersLine:
			"Grenze Gotisch by Renata Polastri (Omnibus-Type), IM Fell English by Igino Marini, Cinzel by Natanael Gama. SIL Open Font License 1.1.",
		roll: "The full roll of sources",
		close: "Close the book",
	},
} as const;

export type ShellTab = keyof typeof shell.tabs;
