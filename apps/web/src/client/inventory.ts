"use client";

// Client for the Reliquary, the Vestry and the wardrobe. Uses api.call, so the preview
// harness can stand in (src/client/mock/inventory.ts).

import type { Equipped, ItemKind, ScryResult } from "@/game/reliquary.ts";
import type { PackId } from "@/game/vestry.ts";
import { type Api, ApiError } from "./api.ts";

export interface InventoryState {
	items: string[];
	equipped: Equipped;
}

export interface ReliquaryState {
	ash: number;
	cost: number;
	refund: number;
	pityLeft: number;
	recent: ScryResult[];
}

export interface ScryOutcome {
	result: ScryResult;
	ash: number;
	pityLeft: number;
}

export interface VestryState {
	/** Whole USDC, or null when it could not be read. */
	usdc: number | null;
	owned: PackId[];
}

export interface ClaimResult {
	pack: PackId;
	items: string[];
	inventory: InventoryState;
}

const post = (body?: unknown): RequestInit =>
	body === undefined
		? { method: "POST" }
		: { method: "POST", body: JSON.stringify(body) };

export const inventory = (api: Api) => ({
	get: () => api.call<InventoryState>("/api/inventory"),
	equip: (patch: Partial<Record<ItemKind, string | null>>) =>
		api.call<InventoryState>("/api/inventory/equip", post(patch)),
	reliquary: () => api.call<ReliquaryState>("/api/reliquary"),
	scry: () => api.call<ScryOutcome>("/api/reliquary/scry", post()),
	vestry: () => api.call<VestryState>("/api/vestry"),
	claim: (userOpHash: string, pack?: PackId) =>
		api.call<ClaimResult>("/api/vestry/claim", post({ userOpHash, pack })),
});

// ---------------------------------------------------------------- buying

const PENDING_KEY = "vestry.pending";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Pending {
	hash: string;
	pack: PackId;
}

/** Payments sent but not yet granted, kept so a closed app can finish them later. */
export function pendingClaims(): Pending[] {
	try {
		const raw = localStorage.getItem(PENDING_KEY);
		const list = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(list)
			? list.filter(
					(p): p is Pending =>
						typeof p?.hash === "string" && typeof p?.pack === "string",
				)
			: [];
	} catch {
		return [];
	}
}
function setPending(list: Pending[]) {
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify(list));
	} catch {}
}
const remember = (p: Pending) =>
	setPending([...pendingClaims().filter((x) => x.hash !== p.hash), p]);
const forget = (h: string) =>
	setPending(pendingClaims().filter((x) => x.hash !== h));

export type BuyStage = "paying" | "granting";

/** Why a purchase stopped, for the lexicon. */
export type BuyError = "noFunds" | "failed" | "cancelled" | "stuck" | "generic";

export class BuyFailed extends Error {
	constructor(readonly reason: BuyError) {
		super(reason);
	}
}

/** Claim a sent payment, waiting while it is still in flight. */
async function claimWhenLanded(
	api: Api,
	{ hash, pack }: Pending,
	until: number,
): Promise<ClaimResult> {
	const inv = inventory(api);
	for (;;) {
		try {
			const out = await inv.claim(hash, pack);
			forget(hash);
			return out;
		} catch (e) {
			if (e instanceof ApiError && e.message === "pending") {
				if (Date.now() > until) throw new BuyFailed("stuck");
				await sleep(2500);
				continue;
			}
			if (e instanceof ApiError && e.message === "op_failed") {
				forget(hash);
				throw new BuyFailed("failed");
			}
			if (e instanceof ApiError && (e.status === 403 || e.status === 409)) {
				forget(hash);
				throw new BuyFailed("generic");
			}
			throw new BuyFailed("stuck");
		}
	}
}

/** Pay for a pack from the player's account, then claim it. */
export async function buyPack(
	api: Api,
	pack: PackId,
	onStage?: (s: BuyStage) => void,
): Promise<ClaimResult> {
	onStage?.("paying");
	let prepared: Awaited<ReturnType<Api["prepare"]>>;
	try {
		prepared = await api.prepare({ action: "buy", pack });
	} catch (e) {
		if (e instanceof ApiError && e.message === "would_revert")
			throw new BuyFailed("noFunds");
		throw new BuyFailed("generic");
	}
	let signature: `0x${string}`;
	try {
		signature = await api.signRaw(prepared.userOpHash);
	} catch {
		throw new BuyFailed("cancelled");
	}
	let sent: string;
	try {
		sent = (await api.submit(prepared.userOp, signature)).userOpHash;
	} catch {
		throw new BuyFailed("generic");
	}
	const pending = { hash: sent, pack };
	remember(pending);
	onStage?.("granting");
	return claimWhenLanded(api, pending, Date.now() + 90_000);
}

/** Finish payments a closed app left behind. Resolves the claims that went through. */
export async function resumeClaims(api: Api): Promise<ClaimResult[]> {
	const done: ClaimResult[] = [];
	for (const p of pendingClaims()) {
		try {
			done.push(await claimWhenLanded(api, p, Date.now() + 5_000));
		} catch {}
	}
	return done;
}
