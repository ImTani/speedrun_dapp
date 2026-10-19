import { DEGREE_START } from "@/game/economy.ts";
import {
	EMPTY_PROGRESS,
	earnedTiers,
	type MarkProgress,
	type MarksResponse,
	markDef,
	marksView,
} from "@/game/marks.ts";
import { CHAIN_ID } from "./chain.ts";
import { db } from "./db.ts";

/** Types a query's rows (the Neon client returns untyped records). */
const typed = <T>(q: PromiseLike<Record<string, unknown>[]>): Promise<T[]> =>
	Promise.resolve(q).then((r) => r as T[]);

/**
 * Queues one Mark for the runner to mint. Idempotent: a (player, kind, tier) is queued once, and a
 * Stigma (kind >= 100) is queued for one player only. Returns true when this call queued it.
 */
export async function queueMark(
	privyId: string,
	kind: number,
	tier: number,
): Promise<boolean> {
	const def = markDef(kind);
	if (!def?.tiers.some((t) => t.tier === tier)) return false;
	const rows = await db()`insert into marks (chain_id, privy_id, kind, tier)
		values (${CHAIN_ID}, ${privyId}, ${kind}, ${tier})
		on conflict do nothing returning id`;
	return rows.length > 0;
}

/** Postgres has the table (migrations may land in any order). */
async function hasTables(names: string[]): Promise<Record<string, boolean>> {
	const rows =
		(await db()`select n as name, to_regclass('public.' || n) is not null as ok
		from unnest(${names}::text[]) as n`) as { name: string; ok: boolean }[];
	return Object.fromEntries(rows.map((r) => [r.name, r.ok]));
}

/** The player's Fragment agent (lowercase), if it has one. */
async function agentOf(privyId: string): Promise<string | null> {
	const rows = (await db()`select lower(f.agent) as agent from players p
		join fragments f on f.chain_id = ${CHAIN_ID} and lower(f.owner_account) = lower(p.account)
		where p.privy_id = ${privyId} and f.agent is not null limit 1`) as {
		agent: string;
	}[];
	return rows[0]?.agent ?? null;
}

/** Gatherings fought, Devours and Kindles from the indexed duels. Forfeited duels count as attended only. */
async function duelProgress(agent: string) {
	const rows = (await db()`with mine as (
			select gathering, (data ->> 'moveA')::int as move, (data ->> 'forfeit')::boolean as forfeit
			from arena_events
			where chain_id = ${CHAIN_ID} and name = 'PairScored' and lower(data ->> 'agentA') = ${agent}
			union all
			select gathering, (data ->> 'moveB')::int, (data ->> 'forfeit')::boolean
			from arena_events
			where chain_id = ${CHAIN_ID} and name = 'PairScored' and lower(data ->> 'agentB') = ${agent}
		)
		select count(distinct gathering)::int as gatherings,
			(count(*) filter (where move = 1 and not coalesce(forfeit, false)))::int as devours,
			(count(*) filter (where move = 0 and not coalesce(forfeit, false)))::int as kindles
		from mine`) as { gatherings: number; devours: number; kindles: number }[];
	const r = rows[0];
	return {
		gatherings: Number(r?.gatherings ?? 0),
		devours: Number(r?.devours ?? 0),
		kindles: Number(r?.kindles ?? 0),
	};
}

/** First clears across every Degree, kept by the Spire (migrations/002_spire.sql). */
async function spireCleared(privyId: string): Promise<number> {
	const rows = await typed<{ n: number }>(
		db()`select floors_cleared as n from spire_progress where privy_id = ${privyId}`,
	);
	return Number(rows[0]?.n ?? 0);
}

/** Everything the Marks catalog counts, for one player. */
export async function markProgress(privyId: string): Promise<MarkProgress> {
	const tables = await hasTables(["profiles", "spire_progress"]);
	const agent = await agentOf(privyId);
	const [duels, degree, spire] = await Promise.all([
		agent ? duelProgress(agent) : { gatherings: 0, devours: 0, kindles: 0 },
		tables.profiles
			? typed<{ degree: number }>(
					db()`select degree from profiles where privy_id = ${privyId}`,
				).then((r) => DEGREE_START - Number(r[0]?.degree ?? DEGREE_START))
			: 0,
		tables.spire_progress ? spireCleared(privyId).catch(() => 0) : 0,
	]);
	return {
		...EMPTY_PROGRESS,
		...duels,
		degree: Math.max(0, Math.min(DEGREE_START - 1, degree)),
		spire,
	};
}

/** Queues every Mark the player has reached. Returns the progress it measured. */
export async function evaluateMarks(privyId: string): Promise<MarkProgress> {
	const progress = await markProgress(privyId);
	const earned = earnedTiers(progress);
	if (earned.length) {
		const kinds = earned.map((e) => e.kind);
		const tiers = earned.map((e) => e.tier);
		// One round trip; conflicts (already queued, or a Stigma someone else holds) are skipped.
		await db()`insert into marks (chain_id, privy_id, kind, tier)
			select ${CHAIN_ID}, ${privyId}, k, t
			from unnest(${kinds}::int[], ${tiers}::int[]) as e(k, t)
			on conflict do nothing`;
	}
	return progress;
}

/** The shelf: every catalog tier with this player's state. */
export async function listMarks(
	privyId: string,
	progress?: MarkProgress,
): Promise<MarksResponse> {
	const sql = db();
	const [held, taken, p] = await Promise.all([
		typed<{
			kind: number;
			tier: number;
			status: "queued" | "minted";
			tx: string | null;
		}>(sql`select kind, tier, status, tx from marks
			where chain_id = ${CHAIN_ID} and privy_id = ${privyId}`),
		typed<{ kind: number; tier: number }>(sql`select kind, tier from marks
			where chain_id = ${CHAIN_ID} and kind >= 100 and privy_id <> ${privyId}`),
		progress ?? markProgress(privyId),
	]);
	return marksView(
		p,
		held.map((h) => ({ ...h, kind: Number(h.kind), tier: Number(h.tier) })),
		taken.map((t) => ({ kind: Number(t.kind), tier: Number(t.tier) })),
	);
}
