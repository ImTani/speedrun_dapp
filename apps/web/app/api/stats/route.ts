import type { ChainStats, Stats } from "@/landing/types.ts";
import { db } from "@/server/db.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public totals for the landing page. No sign-in, nothing per player.
 *
 *   GET /api/stats -> { chains: { "43113": { transactions, moves, gatherings, fragments }, "43114"?: {...} } }
 *
 * transactions: distinct transaction hashes among indexed Arena events. Every game action
 * (register, confirm, retune, open, start, seal, unveil, finalize, close) is one sponsored UserOp
 * in its own transaction, so this is the on-chain transaction count. moves: Committed + Revealed
 * events; gatherings: BoutClosed events; fragments: Fragments whose binding is confirmed on-chain.
 * A chain appears once it has any.
 */

/** Shared by every visitor: the CDN holds it a minute and serves it stale while it refreshes. */
const CACHE = "public, s-maxage=60, stale-while-revalidate=600";
/** One read per instance per this long, however many visitors arrive at once. */
const MEMO_MS = 30_000;

let memo: { at: number; body: Promise<Stats> } | null = null;

export const GET = handle(async () => {
	const now = Date.now();
	if (!memo || now - memo.at > MEMO_MS) {
		const body = read();
		const m = { at: now, body };
		memo = m;
		body.catch(() => {
			if (memo === m) memo = null;
		});
	}
	const res = json(await memo.body);
	res.headers.set("cache-control", CACHE);
	return res;
});

async function read(): Promise<Stats> {
	const sql = db();
	const [events, fragments, txs] = (await Promise.all([
		// (chain_id, name) leads the arena_events_name index.
		sql`select chain_id, name, count(*)::text as n
			from arena_events
			where chain_id in (43113, 43114) and name in ('Committed', 'Revealed', 'BoutClosed')
			group by chain_id, name`,
		sql`select chain_id, count(*)::text as n
			from fragments
			where chain_id in (43113, 43114) and status = 'confirmed'
			group by chain_id`,
		sql`select chain_id, count(distinct tx)::text as n
			from arena_events
			where chain_id in (43113, 43114)
			group by chain_id`,
	])) as [
		{ chain_id: number; name: string; n: string }[],
		{ chain_id: number; n: string }[],
		{ chain_id: number; n: string }[],
	];

	const chains: Stats["chains"] = {};
	const of = (id: number): ChainStats | null => {
		if (id !== 43113 && id !== 43114) return null;
		const key = `${id}` as const;
		chains[key] ??= { transactions: 0, moves: 0, gatherings: 0, fragments: 0 };
		return chains[key];
	};
	for (const r of events) {
		const c = of(Number(r.chain_id));
		if (!c) continue;
		if (r.name === "BoutClosed") c.gatherings += Number(r.n);
		else c.moves += Number(r.n);
	}
	for (const r of fragments) {
		const c = of(Number(r.chain_id));
		if (c) c.fragments += Number(r.n);
	}
	for (const r of txs) {
		const c = of(Number(r.chain_id));
		if (c) c.transactions += Number(r.n);
	}
	return { chains };
}
