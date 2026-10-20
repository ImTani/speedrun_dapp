// Reliquary strings and every cosmetic's name. Short and plain: what the player needs to read.
import {
	type ItemKind,
	itemById,
	type Rarity,
	type TintKey,
} from "@/game/reliquary.ts";

const FINISH: Record<string, string> = {
	gilded: "Gilded",
	grisaille: "Grisaille",
	ink: "Ink",
};

const TINT: Record<TintKey, string> = {
	bone: "Bone",
	verdigris: "Verdigris",
	pyre: "Pyre",
	night: "Night",
	oxblood: "Oxblood",
	gilt: "Gilt",
};

/** Titles, shown under a Fragment's name. */
const TITLE: Record<string, string> = {
	patient: "the Patient",
	quiet: "the Quiet",
	unlit: "the Unlit",
	penitent: "the Penitent",
	lowerNave: "of the Lower Nave",
	hollow: "the Hollow",
	unrepentant: "the Unrepentant",
	seventhBell: "of the Seventh Bell",
	twiceBurned: "the Twice-Burned",
	lastSaint: "the Last Saint",
	godless: "the Godless",
	longNight: "of the Long Night",
	redHand: "the Red Hand",
	emptyThrone: "of the Empty Throne",
	uncrowned: "the Uncrowned",
};

/** A title's text from its key (what equippedFor / cosmeticOf hand back), or "". */
export const titleText = (key: string | null | undefined): string =>
	(key && TITLE[key]) || "";

/** Display name of an item id. */
export function itemName(id: string | null | undefined): string {
	const it = itemById(id);
	if (!it) return "";
	if (it.kind === "finish") return FINISH[it.value] ?? it.value;
	if (it.kind === "tint") return TINT[it.value as TintKey] ?? it.value;
	return TITLE[it.value] ?? it.value;
}

export const reliquary = {
	name: "Reliquary",
	ash: "Ash",
	/** The button: the action and the price (the purse says Ash). "Scry · 100" */
	scry: (cost: number) => `Scry · ${cost}`,
	scrying: "Scrying…",
	/** "Again · 100" */
	again: (cost: number) => `Again · ${cost}`,
	/** The note under a Scry the purse can't cover: "You have 40 Ash" */
	have: (ash: number) => `You have ${ash} Ash`,
	/** "Relic guaranteed within 12" */
	pity: (left: number) =>
		left <= 1 ? "Next one is a Relic" : `Relic guaranteed within ${left}`,
	rates: "Common 70% · Rare 25% · Relic 5%",
	cosmeticOnly: "Looks only. Never changes how your Fragment plays.",

	rarity: { common: "Common", rare: "Rare", relic: "Relic" } as Record<
		Rarity,
		string
	>,
	kind: { finish: "Finish", tint: "Tint", title: "Title" } as Record<
		ItemKind,
		string
	>,
	fresh: "New",
	/** "Owned · +40 Ash back" */
	duplicate: (refund: number) => `Already owned · +${refund} Ash back`,
	wear: "Wear",
	/** Already worn: a quiet state, not a button. */
	worn: "Worn",

	recent: "Recent",
	none: "Nothing scried yet.",
	loading: "Loading…",

	errors: {
		notEnoughAsh: "Not enough Ash.",
		failed: "Could not scry. Try again.",
		unavailable: "The Reliquary is closed for now. Try again soon.",
	},

	finish: FINISH,
	tint: TINT,
	title: TITLE,
} as const;
