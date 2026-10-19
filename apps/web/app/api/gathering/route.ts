import { boutCount, boutInfo, CHAIN_ID, roundInfo } from "@/server/chain.ts";
import { db } from "@/server/db.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventRow {
	block: string;
	log_index: number;
	tx: string;
	name: string;
	gathering: string | null;
	round: number | null;
	agent: string | null;
	data: object;
}

/** What the Gathering screen reads; Revealed and RoundFinalized never reach the page. */
const FEED_EVENTS = [
	"BoutOpened",
	"RoundStarted",
	"Committed",
	"PairScored",
	"BoutClosed",
];
/** Shared by every viewer: the CDN holds it 3 s (serving it stale up to 10 s while it refreshes). */
const CACHE = "public, s-maxage=3, stale-while-revalidate=10";
/** One read per instance per this long, however many viewers poll at once. */
const MEMO_MS = 2_000;
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
	const id = await boutCount();
	if (id === 0n) return { active: false, gathering: null, events: [] };
	const info = await boutInfo(id);
	const round = info.roundsPlayed;
	const r = info.active ? await roundInfo(id, BigInt(round)) : null;
	const now = Math.floor(Date.now() / 1000);
	const phase: "commit" | "reveal" | "between" =
		r?.started && !r.finalized
			? now <= Number(r.commitDeadline)
				? "commit"
				: "reveal"
			: "between";

	// Names/aspects and the event feed come from Postgres; without it the chain view still works.
	let names = new Map<string, { name: string; aspect: number }>();
	let events: EventRow[] = [];
	try {
		const sql = db();
		const lower = info.participants.map((a) => a.toLowerCase());
		const frs =
			(await sql`select lower(agent) as agent, name, config::text as config
			from fragments where chain_id = ${CHAIN_ID} and lower(agent) = any(${lower})`) as {
				agent: string;
				name: string;
				config: string;
			}[];
		names = new Map(
			frs.map((f) => [
				f.agent,
				{ name: f.name, aspect: Number(BigInt(f.config) & 0xffn) },
			]),
		);
		events = (await sql`select * from (
				select block::text as block, log_index, tx, name, gathering::text as gathering,
					round, agent, data
				from arena_events
				where chain_id = ${CHAIN_ID} and gathering = ${id.toString()}
					and name = any(${FEED_EVENTS})
				order by block desc, log_index desc
				limit 300
			) e order by block asc, log_index asc`) as EventRow[];
	} catch (e) {
		console.error(
			"[api/gathering] db",
			String((e as Error).message ?? e).slice(0, 160),
		);
	}

	return {
		active: info.active,
		gathering: {
			id: id.toString(),
			round,
			rounds: info.movesPerMatch * info.matches,
			movesPerMatch: info.movesPerMatch,
			phase,
			commitDeadline: Number(r?.commitDeadline ?? 0n),
			revealDeadline: Number(r?.revealDeadline ?? 0n),
			participants: info.participants.map((agent) => {
				const n = names.get(agent.toLowerCase());
				return { agent, name: n?.name ?? "", aspect: n?.aspect ?? 0 };
			}),
		},
		events: events.map((e) => ({
			block: Number(e.block),
			logIndex: e.log_index,
			tx: e.tx,
			name: e.name,
			gathering: e.gathering,
			round: e.round,
			agent: e.agent,
			data: e.data,
		})),
	};
}
