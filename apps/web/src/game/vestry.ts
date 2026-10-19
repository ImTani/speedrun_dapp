// Vestry packs: fixed contents, priced in test USDC on Fuji. Pure; names live in src/lexicon/vestry.ts.

import { type Address, getAddress, isAddress } from "viem";

/** Fuji test USDC (6 decimals). */
export const USDC_FUJI: Address = "0x5425890298aed601595a70AB815c96711a31Bc65";
export const USDC_DECIMALS = 6;
/** Where pack payments go unless VESTRY_TREASURY says otherwise (the deployer). */
export const DEFAULT_TREASURY: Address =
	"0x6bb27590a2f67CE709Caf41D9611B581471d4a21";

export type PackId = "night" | "oxblood" | "throne";

export interface Pack {
	id: PackId;
	/** Price in whole USDC. */
	usdc: number;
	/** Item ids (src/game/reliquary.ts). */
	items: readonly string[];
	/** Aspect-agnostic preview: the finish and tint to show the pack's mask in. */
	preview: { finish: string | null; tint: string | null };
}

export const PACKS: readonly Pack[] = [
	{
		id: "night",
		usdc: 1,
		items: ["finish.ink", "tint.night", "title.longNight"],
		preview: { finish: "finish.ink", tint: "tint.night" },
	},
	{
		id: "oxblood",
		usdc: 2,
		items: ["tint.oxblood", "title.redHand"],
		preview: { finish: null, tint: "tint.oxblood" },
	},
	{
		id: "throne",
		usdc: 5,
		items: ["tint.gilt", "title.emptyThrone", "title.uncrowned"],
		preview: { finish: null, tint: "tint.gilt" },
	},
];

/** Price in USDC base units. */
export const priceUnits = (p: Pack): bigint =>
	BigInt(p.usdc) * 10n ** BigInt(USDC_DECIMALS);

export const packById = (id: unknown): Pack | undefined =>
	PACKS.find((p) => p.id === id);

/** Prices are distinct, so a paid amount names its pack. */
export const packByAmount = (units: bigint): Pack | undefined =>
	PACKS.find((p) => priceUnits(p) === units);

/** The treasury from an env value, falling back to the default when unset or malformed. */
export function treasuryAddress(raw: string | undefined): Address {
	return raw && isAddress(raw) ? getAddress(raw) : DEFAULT_TREASURY;
}
