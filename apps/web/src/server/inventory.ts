// Cosmetics: what a player owns and wears, Scrying in the Reliquary, Vestry purchases.
// Off-chain in Neon (db/migrations/003_inventory.sql). Items never change how a Fragment plays.

import { ENTRY_POINT_V07_ADDRESS } from "@smoothsend/sdk/avax";
import {
	type Address,
	decodeEventLog,
	encodeFunctionData,
	erc20Abi,
	type Hex,
	isAddressEqual,
	parseAbi,
} from "viem";
import {
	DUPLICATE_REFUND,
	type Equipped,
	type ItemKind,
	itemById,
	NOTHING_EQUIPPED,
	pityLeft,
	type Rarity,
	SCRY_COST,
	type ScryResult,
	scry,
} from "@/game/reliquary.ts";
import {
	PACKS,
	type Pack,
	type PackId,
	packByAmount,
	priceUnits,
	treasuryAddress,
	USDC_DECIMALS,
	USDC_FUJI,
} from "@/game/vestry.ts";
import { opStatus } from "./aa.ts";
import { CHAIN_ID, publicClient } from "./chain.ts";
import { db } from "./db.ts";
import { getProfile, grant, spend } from "./economy.ts";
import { HttpError } from "./env.ts";

export type { Equipped } from "@/game/reliquary.ts";

/** Where Vestry payments go: env VESTRY_TREASURY, else the deployer. */
export const treasury = (): Address =>
	treasuryAddress(process.env.VESTRY_TREASURY);

// ---------------------------------------------------------------- inventory

export interface Inventory {
	items: string[];
	equipped: Equipped;
}

async function ownedItems(privyId: string): Promise<string[]> {
	const rows = (await db()`select item from inventory_items
		where privy_id = ${privyId} order by at, item`) as { item: string }[];
	return rows.map((r) => r.item);
}

async function equippedOf(privyId: string): Promise<Equipped> {
	const rows = (await db()`select finish, tint, title from inventory_equipped
		where privy_id = ${privyId}`) as Equipped[];
	const r = rows[0];
	return r
		? { finish: r.finish, tint: r.tint, title: r.title }
		: { ...NOTHING_EQUIPPED };
}

export async function getInventory(privyId: string): Promise<Inventory> {
	const [items, equipped] = await Promise.all([
		ownedItems(privyId),
		equippedOf(privyId),
	]);
	return { items, equipped };
}

const SLOTS: readonly ItemKind[] = ["finish", "tint", "title"];

/**
 * Wear items. Each slot in `patch` is an owned item id of that kind, or null for the default;
 * slots left out stay as they are.
 */
export async function equip(
	privyId: string,
	patch: Partial<Record<ItemKind, unknown>>,
): Promise<Inventory> {
	const current = await getInventory(privyId);
	const next: Equipped = { ...current.equipped };
	for (const slot of SLOTS) {
		if (!(slot in patch)) continue;
		const v = patch[slot];
		if (v === null) {
			next[slot] = null;
			continue;
		}
		const it = typeof v === "string" ? itemById(v) : undefined;
		if (!it || it.kind !== slot) throw new HttpError(400, "invalid_item");
		if (!current.items.includes(it.id)) throw new HttpError(403, "not_owned");
		next[slot] = it.id;
	}
	await db()`insert into inventory_equipped (privy_id, finish, tint, title)
		values (${privyId}, ${next.finish}, ${next.tint}, ${next.title})
		on conflict (privy_id) do update set finish = excluded.finish, tint = excluded.tint,
			title = excluded.title, updated_at = now()`;
	return { items: current.items, equipped: next };
}

/**
 * What each Fragment (by agent address) wears, for the Gathering and standings.
 * Keys are the addresses as passed in; Fragments wearing nothing are left out.
 */
export async function equippedFor(
	agents: string[],
): Promise<Map<string, Equipped>> {
	const out = new Map<string, Equipped>();
	if (agents.length === 0) return out;
	const lower = [...new Set(agents.map((a) => a.toLowerCase()))];
	const rows =
		(await db()`select lower(f.agent) as agent, e.finish, e.tint, e.title
		from fragments f
		join players p on lower(p.account) = lower(f.owner_account)
		join inventory_equipped e on e.privy_id = p.privy_id
		where f.chain_id = ${CHAIN_ID} and lower(f.agent) = any(${lower}::text[])`) as (Equipped & {
			agent: string;
		})[];
	const byLower = new Map(rows.map((r) => [r.agent, r]));
	for (const a of agents) {
		const r = byLower.get(a.toLowerCase());
		if (r && (r.finish || r.tint || r.title))
			out.set(a, { finish: r.finish, tint: r.tint, title: r.title });
	}
	return out;
}

// ---------------------------------------------------------------- Reliquary

export interface ReliquaryState {
	ash: number;
	cost: number;
	refund: number;
	/** Scryings left until a Relic is certain. */
	pityLeft: number;
	recent: ScryResult[];
}

interface ScryRow {
	n: number;
	item: string;
	rarity: Rarity;
	duplicate: boolean;
	refund: number;
	at: string;
}

const toResult = (r: ScryRow): ScryResult => ({
	n: Number(r.n),
	item: r.item,
	rarity: r.rarity,
	duplicate: Boolean(r.duplicate),
	refund: Number(r.refund),
	at: new Date(r.at).toISOString(),
});

/** Scryings so far and Scryings since the last Relic. */
async function scryCounts(
	privyId: string,
): Promise<{ n: number; sinceRelic: number }> {
	const rows = (await db()`select count(*)::int as n,
			coalesce(max(n) filter (where rarity = 'relic'), -1)::int as last_relic
		from scry_log where privy_id = ${privyId}`) as {
		n: number;
		last_relic: number;
	}[];
	const n = Number(rows[0]?.n ?? 0);
	const last = Number(rows[0]?.last_relic ?? -1);
	return { n, sinceRelic: n - last - 1 };
}

async function recentScryings(privyId: string, limit = 10) {
	const rows = (await db()`select n, item, rarity, duplicate, refund, at
		from scry_log where privy_id = ${privyId}
		order by n desc limit ${limit}`) as ScryRow[];
	return rows.map(toResult);
}

export async function reliquaryState(privyId: string): Promise<ReliquaryState> {
	const [profile, counts, recent] = await Promise.all([
		getProfile(privyId),
		scryCounts(privyId),
		recentScryings(privyId),
	]);
	return {
		ash: profile.ash,
		cost: SCRY_COST,
		refund: DUPLICATE_REFUND,
		pityLeft: pityLeft(counts.sinceRelic),
		recent,
	};
}

/**
 * One Scrying: take the Ash, roll the player's next seeded pull, grant the item (or refund a
 * duplicate). Idempotent per pull number, so a retried or racing request replays the same pull.
 */
export async function scryOnce(
	privyId: string,
): Promise<{ result: ScryResult; ash: number; pityLeft: number }> {
	const { n, sinceRelic } = await scryCounts(privyId);
	const { item, rarity } = scry(privyId, n, sinceRelic);
	await spend(privyId, SCRY_COST, "scry", `scry:${n}`);
	const sql = db();
	// The item insert decides "duplicate" atomically; the log row is the pull's single record.
	let rows = (await sql`with it as (
			insert into inventory_items (privy_id, item, source)
			values (${privyId}, ${item.id}, 'scry')
			on conflict (privy_id, item) do nothing
			returning 1
		)
		insert into scry_log (privy_id, n, item, rarity, duplicate, refund)
		select ${privyId}::text, ${n}::int, ${item.id}::text, ${rarity}::text,
			not exists (select 1 from it),
			case when exists (select 1 from it) then 0 else ${DUPLICATE_REFUND}::int end
		on conflict (privy_id, n) do nothing
		returning n, item, rarity, duplicate, refund, at`) as ScryRow[];
	if (rows.length === 0)
		rows =
			(await sql`select n, item, rarity, duplicate, refund, at from scry_log
			where privy_id = ${privyId} and n = ${n}`) as ScryRow[];
	const row = rows[0];
	if (!row) throw new HttpError(500, "scry_lost");
	const result = toResult(row);
	if (result.refund > 0)
		await grant(privyId, { ash: result.refund }, "scry", `scry-refund:${n}`);
	const profile = await getProfile(privyId);
	const since = result.rarity === "relic" ? 0 : sinceRelic + 1;
	return { result, ash: profile.ash, pityLeft: pityLeft(since) };
}

// ---------------------------------------------------------------- Vestry

/** Packs whose every item the player already owns. */
export function ownedPacks(items: readonly string[]): PackId[] {
	const have = new Set(items);
	return PACKS.filter((p) => p.items.every((i) => have.has(i))).map(
		(p) => p.id,
	);
}

/** The call a player's account makes to buy `pack`: USDC.transfer(treasury, price). */
export function buyCall(pack: Pack): { to: Address; data: Hex } {
	return {
		to: USDC_FUJI,
		data: encodeFunctionData({
			abi: erc20Abi,
			functionName: "transfer",
			args: [treasury(), priceUnits(pack)],
		}),
	};
}

/** The account's test USDC, in whole USDC (two decimals); null when the chain does not answer. */
export async function usdcBalance(account: Address): Promise<number | null> {
	try {
		const units = await publicClient().readContract({
			address: USDC_FUJI,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [account],
		});
		return Number(units / 10n ** BigInt(USDC_DECIMALS - 2)) / 100;
	} catch {
		return null;
	}
}

const entryPointAbi = parseAbi([
	"event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
]);

async function grantPack(privyId: string, pack: Pack): Promise<void> {
	const items = [...pack.items];
	await db()`insert into inventory_items (privy_id, item, source)
		select ${privyId}::text, i, 'vestry' from unnest(${items}::text[]) as i
		on conflict (privy_id, item) do nothing`;
}

/**
 * Grant the pack a landed UserOp paid for. Verifies on chain that the op is the player's own,
 * succeeded, and moved a pack's price in USDC from their account to the treasury.
 * Idempotent per op and per Transfer log.
 */
export async function claimPurchase(
	privyId: string,
	account: Address,
	userOpHash: string,
): Promise<{ pack: PackId; items: string[] }> {
	if (!/^0x[0-9a-fA-F]{64}$/.test(userOpHash))
		throw new HttpError(400, "invalid_hash");
	const hash = userOpHash.toLowerCase();
	const sql = db();
	const seen = (await sql`select privy_id, pack from vestry_purchases
		where user_op_hash = ${hash}`) as { privy_id: string; pack: string }[];
	const prior = seen[0];
	if (prior) {
		if (prior.privy_id !== privyId) throw new HttpError(409, "claimed");
		const pack = PACKS.find((p) => p.id === prior.pack);
		if (!pack) throw new HttpError(500, "unknown_pack");
		await grantPack(privyId, pack);
		return { pack: pack.id, items: [...pack.items] };
	}

	const st = await opStatus(hash);
	if (st.state !== "landed" || !st.tx) throw new HttpError(409, "pending");
	if (st.success === false) throw new HttpError(409, "op_failed");
	const receipt = await publicClient().getTransactionReceipt({
		hash: st.tx as Hex,
	});
	const logs = receipt.logs;

	// The op's own UserOperationEvent: right hash, the player's account, success.
	const opIndex = logs.findIndex((l) => {
		if (!isAddressEqual(l.address, ENTRY_POINT_V07_ADDRESS as Address))
			return false;
		try {
			const ev = decodeEventLog({
				abi: entryPointAbi,
				data: l.data,
				topics: l.topics,
			});
			return (
				ev.args.userOpHash.toLowerCase() === hash &&
				isAddressEqual(ev.args.sender, account) &&
				ev.args.success
			);
		} catch {
			return false;
		}
	});
	if (opIndex < 0) throw new HttpError(403, "not_yours");

	// The op's execution logs sit after the EntryPoint's previous log and before its event.
	let start = 0;
	for (let i = opIndex - 1; i >= 0; i--) {
		const l = logs[i];
		if (l && isAddressEqual(l.address, ENTRY_POINT_V07_ADDRESS as Address)) {
			start = i + 1;
			break;
		}
	}
	const to = treasury();
	let paid: { pack: Pack; amount: bigint; logIndex: number } | null = null;
	for (const l of logs.slice(start, opIndex)) {
		if (!isAddressEqual(l.address, USDC_FUJI)) continue;
		try {
			const ev = decodeEventLog({
				abi: erc20Abi,
				data: l.data,
				topics: l.topics,
			});
			if (ev.eventName !== "Transfer") continue;
			if (!isAddressEqual(ev.args.from, account)) continue;
			if (!isAddressEqual(ev.args.to, to)) continue;
			const pack = packByAmount(ev.args.value);
			if (pack) {
				paid = { pack, amount: ev.args.value, logIndex: l.logIndex };
				break;
			}
		} catch {}
	}
	if (!paid) throw new HttpError(403, "no_payment");

	const ins = (await sql`insert into vestry_purchases
			(user_op_hash, chain_id, privy_id, pack, amount, tx, log_index)
		values (${hash}, ${CHAIN_ID}, ${privyId}, ${paid.pack.id}, ${paid.amount.toString()}::bigint,
			${st.tx.toLowerCase()}, ${paid.logIndex})
		on conflict do nothing
		returning 1 as ok`) as { ok: number }[];
	if (ins.length === 0) {
		const again = (await sql`select privy_id from vestry_purchases
			where user_op_hash = ${hash}`) as { privy_id: string }[];
		if (again[0]?.privy_id !== privyId) throw new HttpError(409, "claimed");
	}
	await grantPack(privyId, paid.pack);
	return { pack: paid.pack.id, items: [...paid.pack.items] };
}
