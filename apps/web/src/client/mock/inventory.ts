// Preview mock for the Reliquary, Vestry and wardrobe routes. Import for its side effect.
// Ash comes from the economy mock's purse, so the Reliquary and the Fragment tab agree.
import {
	DUPLICATE_REFUND,
	type Equipped,
	type ItemKind,
	itemById,
	NOTHING_EQUIPPED,
	pityLeft,
	SCRY_COST,
	type ScryResult,
	scry,
} from "@/game/reliquary.ts";
import { PACKS, type PackId, packById } from "@/game/vestry.ts";
import { ApiError } from "../api.ts";
import { registerMockRoute } from "../mockRoutes.ts";
import { mockGrant, mockProfile, mockSpend } from "./economy.ts";

const MOCK_ID = "did:privy:preview";

interface MockInventory {
	items: string[];
	equipped: Equipped;
	log: ScryResult[];
	sinceRelic: number;
	usdc: number;
}

/** A Claimant a few Scryings in: two titles and a tint, 13 since the last Relic, 4 USDC. */
function fresh(): MockInventory {
	const at = (minAgo: number) =>
		new Date(Date.now() - minAgo * 60_000).toISOString();
	const log: ScryResult[] = [
		{
			n: 2,
			item: "title.unrepentant",
			rarity: "rare",
			duplicate: false,
			refund: 0,
			at: at(40),
		},
		{
			n: 1,
			item: "tint.bone",
			rarity: "common",
			duplicate: false,
			refund: 0,
			at: at(300),
		},
		{
			n: 0,
			item: "title.quiet",
			rarity: "common",
			duplicate: false,
			refund: 0,
			at: at(1500),
		},
	];
	return {
		items: ["title.quiet", "tint.bone", "title.unrepentant"],
		equipped: { ...NOTHING_EQUIPPED, title: "title.unrepentant" },
		log,
		sinceRelic: 13,
		usdc: 4,
	};
}

let inv = fresh();

/** Restore the starting wardrobe (each preview link can call this for a clean world). */
export function resetMockInventory(over: Partial<MockInventory> = {}) {
	inv = { ...fresh(), ...over };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const owned = (): PackId[] =>
	PACKS.filter((p) => p.items.every((i) => inv.items.includes(i))).map(
		(p) => p.id,
	);
const snapshot = () => ({
	items: [...inv.items],
	equipped: { ...inv.equipped },
});

registerMockRoute("/api/inventory", async () => {
	await wait(150);
	return snapshot();
});

registerMockRoute(
	"/api/inventory/equip",
	async (_path, body) => {
		await wait(350);
		const patch = (body ?? {}) as Partial<Record<ItemKind, unknown>>;
		const next = { ...inv.equipped };
		for (const slot of ["finish", "tint", "title"] as const) {
			if (!(slot in patch)) continue;
			const v = patch[slot];
			if (v === null) next[slot] = null;
			else {
				const it = typeof v === "string" ? itemById(v) : undefined;
				if (!it || it.kind !== slot) throw new ApiError(400, "invalid_item");
				if (!inv.items.includes(it.id)) throw new ApiError(403, "not_owned");
				next[slot] = it.id;
			}
		}
		inv = { ...inv, equipped: next };
		return snapshot();
	},
	"POST",
);

registerMockRoute("/api/reliquary", async () => {
	await wait(200);
	return {
		ash: mockProfile().ash,
		cost: SCRY_COST,
		refund: DUPLICATE_REFUND,
		pityLeft: pityLeft(inv.sinceRelic),
		recent: inv.log.slice(0, 10),
	};
});

registerMockRoute(
	"/api/reliquary/scry",
	async () => {
		await wait(700);
		if (!mockSpend(SCRY_COST)) throw new ApiError(402, "not_enough_ash");
		const n = inv.log.length;
		const { item, rarity } = scry(MOCK_ID, n, inv.sinceRelic);
		const duplicate = inv.items.includes(item.id);
		const refund = duplicate ? DUPLICATE_REFUND : 0;
		if (refund) mockGrant({ ash: refund });
		const result: ScryResult = {
			n,
			item: item.id,
			rarity,
			duplicate,
			refund,
			at: new Date().toISOString(),
		};
		inv = {
			...inv,
			items: duplicate ? inv.items : [...inv.items, item.id],
			log: [result, ...inv.log],
			sinceRelic: rarity === "relic" ? 0 : inv.sinceRelic + 1,
		};
		return {
			result,
			ash: mockProfile().ash,
			pityLeft: pityLeft(inv.sinceRelic),
		};
	},
	"POST",
);

registerMockRoute("/api/vestry", async () => {
	await wait(200);
	return { usdc: inv.usdc, owned: owned() };
});

registerMockRoute(
	"/api/vestry/claim",
	async (_path, body) => {
		await wait(1200);
		const pack = packById((body as { pack?: unknown } | undefined)?.pack);
		if (!pack) throw new ApiError(403, "no_payment");
		if (!owned().includes(pack.id)) {
			if (inv.usdc < pack.usdc) throw new ApiError(409, "op_failed");
			inv = {
				...inv,
				usdc: inv.usdc - pack.usdc,
				items: [
					...inv.items,
					...pack.items.filter((i) => !inv.items.includes(i)),
				],
			};
		}
		return { pack: pack.id, items: [...pack.items], inventory: snapshot() };
	},
	"POST",
);
