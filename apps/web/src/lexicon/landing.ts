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
