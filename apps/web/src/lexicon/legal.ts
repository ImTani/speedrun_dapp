// Strings for the legal pages' chrome, the storage notice, the legal links and account deletion.
// The documents themselves live in src/legal (terms.tsx, privacy.tsx, cookies.tsx).
// Player-facing: plain words, no jargon beyond what the documents explain.

export const legal = {
	links: {
		label: "Legal",
		terms: "Terms",
		privacy: "Privacy",
		cookies: "Cookies",
	},

	page: {
		back: "Back",
		effective: "Effective",
		contents: "Contents",
		short: "The short version",
		contact: "Questions?",
		draft: "Draft: operator details are still placeholders",
	},

	notice: {
		label: "Storage notice",
		text: "We only use storage needed to sign you in and save your settings.",
		link: "Cookie policy",
		dismiss: "Got it",
	},

	deletion: {
		title: "Delete my account",
		lead: "This removes your Fragment, progress, cosmetics, Marks queue, notification settings and purchase records from our servers.",
		kept: "Moves, Marks and purchases already recorded on the blockchain are public and permanent, so they stay. Your sign-in account with Privy is separate: ask Privy or us to remove it.",
		start: "Delete my account",
		confirmTitle: "Delete everything?",
		confirmLead:
			"Your Fragment stops playing and your progress is gone for good. This cannot be undone.",
		confirm: "Yes, delete it",
		cancel: "Keep my account",
		working: "Deleting…",
		done: "Your account data has been deleted. You have been signed out.",
		failed: "That did not work. Try again, or write to us.",
	},
} as const;
