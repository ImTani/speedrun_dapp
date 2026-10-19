// Cosmetic catalog and Scrying rules: pure, shared by server, client and preview mocks. No I/O.
// Items never change how a Fragment plays. Display names live in src/lexicon/reliquary.ts.

import { keccak256, stringToHex } from "viem";
import type { MaskVariant } from "@/scene/masks.js";

export type ItemKind = "finish" | "tint" | "title";
export type Rarity = "common" | "rare" | "relic";
/** Where an item comes from: a Scrying rarity, or a Vestry pack. */
export type ItemSource = Rarity | "vestry";

export type TintKey =
	| "bone"
	| "verdigris"
	| "pyre"
	| "night"
	| "oxblood"
	| "gilt";

export interface Item {
	id: string;
	kind: ItemKind;
	source: ItemSource;
	/** finish: the Mask variant; tint: the tint key; title: the lexicon key. */
	value: string;
}

/** CSS filter applied over the mask for each tint. */
export const TINT_FILTER: Record<TintKey, string> = {
	bone: "grayscale(0.55) sepia(0.35) brightness(1.18) contrast(0.95)",
	verdigris: "sepia(0.55) hue-rotate(115deg) saturate(1.35) brightness(0.95)",
	pyre: "sepia(0.4) saturate(2.4) hue-rotate(-18deg) brightness(1.08)",
	night:
		"grayscale(0.5) sepia(0.3) hue-rotate(185deg) saturate(1.6) brightness(0.72)",
	oxblood: "sepia(0.6) hue-rotate(-38deg) saturate(2.6) brightness(0.78)",
	gilt: "sepia(0.85) saturate(2.1) hue-rotate(-6deg) brightness(1.14)",
};

const item = (kind: ItemKind, value: string, source: ItemSource): Item => ({
	id: `${kind}.${value}`,
	kind,
	source,
	value,
});

/** Every item there is. Gilded (the default finish), no tint and no title need no item. */
export const ITEMS: readonly Item[] = [
	// Scrying: common
	item("tint", "bone", "common"),
	item("title", "patient", "common"),
	item("title", "quiet", "common"),
	item("title", "unlit", "common"),
	item("title", "penitent", "common"),
	item("title", "lowerNave", "common"),
	item("title", "hollow", "common"),
	// Scrying: rare
	item("finish", "grisaille", "rare"),
	item("tint", "verdigris", "rare"),
	item("title", "unrepentant", "rare"),
	item("title", "seventhBell", "rare"),
	item("title", "twiceBurned", "rare"),
	// Scrying: relic
	item("tint", "pyre", "relic"),
	item("title", "lastSaint", "relic"),
	item("title", "godless", "relic"),
	// Vestry only
	item("finish", "ink", "vestry"),
	item("tint", "night", "vestry"),
	item("title", "longNight", "vestry"),
	item("tint", "oxblood", "vestry"),
	item("title", "redHand", "vestry"),
	item("tint", "gilt", "vestry"),
	item("title", "emptyThrone", "vestry"),
	item("title", "uncrowned", "vestry"),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string | null | undefined): Item | undefined =>
	id ? BY_ID.get(id) : undefined;

// ---------------------------------------------------------------- equipped

export interface Equipped {
	finish: string | null;
	tint: string | null;
	title: string | null;
}
export const NOTHING_EQUIPPED: Equipped = {
	finish: null,
	tint: null,
	title: null,
};

/** What equipped item ids mean on screen: a Mask variant, a CSS filter, a title key. */
export function cosmeticOf(e: Partial<Equipped> | null | undefined): {
	variant: MaskVariant;
	filter: string | undefined;
	title: string | null;
} {
	const finish = itemById(e?.finish);
	const tint = itemById(e?.tint);
	const title = itemById(e?.title);
	return {
		variant:
			finish?.kind === "finish" ? (finish.value as MaskVariant) : "gilded",
		filter:
			tint?.kind === "tint" ? TINT_FILTER[tint.value as TintKey] : undefined,
		title: title?.kind === "title" ? title.value : null,
	};
}

// ---------------------------------------------------------------- Scrying

export const SCRY_COST = 100;
export const DUPLICATE_REFUND = 40;
/** A Relic is certain within this many Scryings. */
export const PITY = 20;
/** Chance per Scrying, in percent. */
export const RATES: Record<Rarity, number> = { common: 70, rare: 25, relic: 5 };
export const RARITIES: readonly Rarity[] = ["common", "rare", "relic"];

export const poolOf = (rarity: Rarity): Item[] =>
	ITEMS.filter((i) => i.source === rarity);

/** Deterministic seed for a player's n-th Scrying (n counts from 0). */
export function scrySeed(privyId: string, n: number): `0x${string}` {
	return keccak256(stringToHex(`scry:${privyId}:${n}`));
}

/** Scryings left until a Relic is certain, given Scryings since the last Relic. */
export const pityLeft = (sinceRelic: number): number =>
	Math.max(1, PITY - Math.max(0, sinceRelic));

/**
 * The n-th Scrying's outcome. `sinceRelic` counts Scryings since the last Relic;
 * at PITY - 1 the next one is a Relic.
 */
export function scry(
	privyId: string,
	n: number,
	sinceRelic: number,
): { item: Item; rarity: Rarity } {
	const seed = scrySeed(privyId, n);
	const roll = Number.parseInt(seed.slice(2, 10), 16) % 100;
	const pick = Number.parseInt(seed.slice(10, 18), 16);
	const rarity: Rarity =
		sinceRelic >= PITY - 1
			? "relic"
			: roll < RATES.relic
				? "relic"
				: roll < RATES.relic + RATES.rare
					? "rare"
					: "common";
	const pool = poolOf(rarity);
	const chosen = pool[pick % pool.length] as Item;
	return { item: chosen, rarity };
}

/** One Scrying as stored and shown. */
export interface ScryResult {
	n: number;
	item: string;
	rarity: Rarity;
	duplicate: boolean;
	refund: number;
	at: string;
}
