// Strings for the public landing page (app/page.tsx). Written for two readers: a judge on a
// laptop and a curious player on a phone. Plain words first; the cathedral is in the pictures.

export const landing = {
	meta: {
		title: "Apostasy: Sede Vacante · an on-chain idle auto-battler",
		description:
			"Bind a masked Fragment, let it duel while you're away, come back for the reveal. Every move is a gasless transaction on Avalanche. Sign in with email or Google.",
		ogAlt: "Apostasy: Sede Vacante, an idle auto-battler on Avalanche",
	},

	hero: {
		name: "Apostasy",
		sub: "Sede Vacante",
		line: "An idle auto-battler where every move is an on-chain transaction.",
		play: "Play",
		note: "Free in your browser. Sign in with email or Google.",
		qr: "Scan to play on your phone",

		// ---- the hero directions (src/landing/hero, picked in src/landing/heroConfig.ts)
		/** The short line under Play. */
		free: "Free · plays in your browser · sign in with email",
		/** The cue at the foot of the hero, down to "How it plays". */
		scroll: "How it plays",

		/** B, The Face-off: two Fragments, a toll, a verdict, on a loop. */
		faceoff: {
			/** The two Fragments: Vesper wears Inquisitor (night blue), Marrow wears Rancour (blood red). */
			left: "Vesper",
			right: "Marrow",
			/** The rule, in plain words, under the windows. */
			rule: "Each toll of the bell, both choose in secret: Kindle (share) or Devour (steal). Light is the score.",
			/** Under each mask before the unveiling. */
			sealed: "Choosing",
			/** The unit on each Fragment's running score. */
			light: "Light",
			/** Read to screen readers in place of the moving picture. */
			aria: "Two masked Fragments duel. Both kindle: 3 Light each. One devours: it takes 5, the other gets 0. Both devour: 1 Light each.",
			/** The lines under a verdict: the Light it moved. */
			each: (n: number) => `+${n} Light each`,
			took: (name: string, n: number) => `${name} +${n} Light`,
			got: (name: string) => `${name} +0`,
		},

		/** C, The Rose: the seven masks riding in a turning rose window. */
		rose: {
			/** Above the mask that is passing the top of the rose. */
			kicker: "Seven masks, seven ways to fight",
			/** Read to screen readers in place of the turning rose. */
			aria: "A rose window turning slowly, with the seven masks in its panes.",
		},
	},

	how: {
		head: "How it plays",
		steps: [
			{
				title: "Build a masked Fragment",
				line: "Pick one of seven masks and carve the rules it fights by.",
			},
			{
				title: "It duels while you're away",
				line: "Each Gathering it seals its moves and fights on its own.",
			},
			{
				title: "Come back for the reveal and collect",
				line: "The moves unseal, the winner devours, you collect the spoils.",
			},
		],
		maskAlt: "Three of the seven masks: Mercy, Echo and Inquisitor",
		duelAlt: "Two Fragments' stained-glass windows facing each other",
		collectAlt:
			"The game collecting a full Vigil: plus 96 Ash and 180 Resonance",
	},

	chain: {
		head: "On-chain, invisible",
		lead: "Every commit and every reveal is a real transaction. Players never see a wallet.",
		moves: "Sponsored transactions",
		movesNote: "On Fuji testnet",
		/** Honest disclosure: house Fragments exist and are counted. */
		house:
			"Some Fragments are run by the house so every Gathering fills; they count in these numbers.",
		gatherings: "Gatherings played",
		fragments: "Fragments bound",
		mainnet: "Transactions on Avalanche mainnet",
		loading: "Counting",
		down: "Live numbers are resting. The contract below has them all.",
		facts: [
			"Gasless: ERC-4337 smart accounts, gas sponsored through SmoothSend",
			"Sign in with email or Google",
			"No wallet, no gas, no seed phrase for players",
		],
		explorer: "Arena contract on Snowtrace (Fuji)",
	},

	screens: {
		head: "Inside",
		hint: "Swipe for more",
		items: [
			{
				src: "/landing/title.webp",
				caption: "The nave",
				alt: "Title screen: a lit stained-glass window over the name Apostasy",
			},
			{
				src: "/landing/bind.webp",
				caption: "Choose a mask",
				alt: "Binding a Fragment: choosing the Echo mask",
			},
			{
				src: "/landing/stage.webp",
				caption: "Your Fragment",
				alt: "A bound Fragment in its window with its Light and Gatherings",
			},
			{
				src: "/landing/gathering.webp",
				caption: "The Gathering",
				alt: "A duel in the Gathering: Saint Gloria of the Ash devours Brother Ash",
			},
			{
				src: "/landing/spire.webp",
				caption: "The Spire",
				alt: "The Spire: five floors of rival masks to climb",
			},
		],
	},

	built: {
		head: "Built with",
		chips: [
			"Avalanche",
			"SmoothSend",
			"ERC-4337",
			"Privy",
			"Next.js",
			"Foundry",
		],
	},

	close: {
		line: "Your Fragment is waiting.",
	},

	footer: {
		github: "Source on GitHub",
		credits: "Credits",
		copyright: "© 2026 Tani",
	},
} as const;
