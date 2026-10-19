import { CHAIN_ID } from "@/server/chain.ts";
import { db } from "@/server/db.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shared by every viewer: the CDN holds it 10 s (serving it stale up to 30 s while it refreshes). */
const CACHE = "public, s-maxage=10, stale-while-revalidate=30";
/** One read per instance per this long, however many viewers poll at once. */
const MEMO_MS = 5_000;
let memo: { at: number; body: Promise<unknown> } | null = null;

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

async function read() {
	const rows = (await db()`select l.agent, f.name, f.config::text as config,
			l.light::text as light, l.duels::text as duels
		from light l
		join fragments f on f.chain_id = l.chain_id and lower(f.agent) = lower(l.agent)
		where l.chain_id = ${CHAIN_ID}
		order by l.light desc, l.duels desc
		limit 100`) as {
		agent: string;
		name: string;
		config: string;
		light: string;
		duels: string;
	}[];
	return {
		rows: rows.map((r) => ({
			agent: r.agent,
			name: r.name,
			aspect: Number(BigInt(r.config) & 0xffn),
			light: Number(r.light),
			duels: Number(r.duels),
		})),
	};
}
