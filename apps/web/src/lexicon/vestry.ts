// Vestry strings. Short and plain: what the player needs to read.
import type { PackId } from "@/game/vestry.ts";

export const vestry = {
	name: "Vestry",
	lead: "Looks for your Fragment. Never changes how it plays.",
	/** "You have 3.50 USDC" */
	balance: (usdc: number) => `You have ${usdc.toFixed(2)} USDC`,
	/** "1 USDC" */
	price: (usdc: number) => `${usdc} USDC`,
	buy: (usdc: number) => `Buy · ${usdc} USDC`,
	/** Price the account can't cover: "5 USDC · not enough" */
	short: (usdc: number) => `${usdc} USDC · not enough`,
	buying: "Paying…",
	granting: "Paid. Adding to your wardrobe…",
	owned: "Owned",
	bought: "Added to your wardrobe.",
	contains: "Contains",

	packs: {
		night: { name: "Night Vestments" },
		oxblood: { name: "Oxblood Vestments" },
		throne: { name: "Vestments of the Empty Throne" },
	} as Record<PackId, { name: string }>,

	wardrobe: {
		heading: "Wardrobe",
		finish: "Finish",
		tint: "Tint",
		title: "Title",
		none: "None",
		gilded: "Gilded",
		save: "Wear",
		saving: "Saving…",
		saved: "Saved.",
		preview: "Preview",
		noTitle: "No title",
	},

	errors: {
		noFunds: "Not enough USDC.",
		failed: "Payment did not go through. Nothing was taken.",
		cancelled: "Payment cancelled.",
		stuck: "Payment is taking long. It will be added once it lands.",
		generic: "Something went wrong. Try again.",
		unavailable: "The Vestry is closed for now. Try again soon.",
		saveFailed: "Could not save. Try again.",
	},
} as const;
