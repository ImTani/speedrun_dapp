import {
	clampDegree,
	DUEL_ASH_BONUS,
	DUEL_RESONANCE,
	type Profile,
	profileFrom,
	vigilAccrued,
} from "@/game/economy.ts";
import { CHAIN_ID } from "./chain.ts";
import { db } from "./db.ts";
import { HttpError } from "./env.ts";

export type { Profile } from "@/game/economy.ts";

interface ProfileRow {
	degree: number;
	resonance: number;
	ash: number;
	/** vigil_since in epoch ms, for the accrual maths. */
	since_ms: number;
	/** vigil_since as Postgres text, exact to the microsecond, for compare-and-set. */
	since_text: string;
}

const isUniqueViolation = (e: unknown) =>
	(e as { code?: unknown } | null)?.code === "23505";

/** Loads the profile row, creating it (Degree 7, empty purse, Vigil from now) on first sight. */
async function row(privyId: string): Promise<ProfileRow> {
	const sql = db();
	await sql`insert into profiles (privy_id) values (${privyId})
		on conflict (privy_id) do nothing`;
	const rows = (await sql`select degree, resonance, ash,
			(extract(epoch from vigil_since) * 1000)::float8 as since_ms,
			vigil_since::text as since_text
		from profiles where privy_id = ${privyId}`) as ProfileRow[];
	const r = rows[0];
	if (!r) throw new HttpError(500, "profile_missing");
	return {
		...r,
		degree: Number(r.degree),
		resonance: Number(r.resonance),
		ash: Number(r.ash),
		since_ms: Number(r.since_ms),
	};
}

/** The player's economy as the UI sees it. Does not settle; call settleGatherings first. */
export async function getProfile(privyId: string): Promise<Profile> {
	const r = await row(privyId);
	return profileFrom(r, vigilAccrued(Date.now(), r.since_ms));
}

/**
 * Credit Ash and/or Resonance once per (player, ref). Replays with the same ref change nothing.
 * Returns true when this call made the credit.
 */
export async function grant(
	privyId: string,
	amounts: { ash?: number; resonance?: number },
	kind: string,
	ref: string,
): Promise<boolean> {
	const ash = Math.max(0, Math.trunc(amounts.ash ?? 0));
	const resonance = Math.max(0, Math.trunc(amounts.resonance ?? 0));
	await row(privyId);
	const done = (await db()`with ins as (
			insert into economy_ledger (privy_id, kind, ash, resonance, ref)
			values (${privyId}, ${kind}, ${ash}, ${resonance}, ${ref})
			on conflict (privy_id, ref) do nothing
			returning ash, resonance
		)
		update profiles p set ash = p.ash + ins.ash, resonance = p.resonance + ins.resonance
		from ins where p.privy_id = ${privyId}
		returning 1 as ok`) as { ok: number }[];
	return done.length > 0;
}

/**
 * Take Ash once per (player, ref). Throws HttpError(402, 'not_enough_ash') when the purse is short.
 * A replay of a ref already spent succeeds without charging again.
 */
export async function spend(
	privyId: string,
	ash: number,
	kind: string,
	ref: string,
): Promise<void> {
	const amount = Math.trunc(ash);
	if (!Number.isFinite(amount) || amount <= 0)
		throw new HttpError(400, "invalid_amount");
	await row(privyId);
	const sql = db();
	try {
		// One statement: the debit and its ledger line land together or not at all. A duplicate
		// ref raises a unique violation, which rolls the debit back.
		const done = (await sql`with upd as (
				update profiles set ash = ash - ${amount}::int
				where privy_id = ${privyId} and ash >= ${amount}::int
				returning privy_id
			)
			insert into economy_ledger (privy_id, kind, ash, resonance, ref)
			select privy_id, ${kind}::text, ${-amount}::int, 0, ${ref}::text from upd
			returning 1 as ok`) as { ok: number }[];
		if (done.length > 0) return;
	} catch (e) {
		if (isUniqueViolation(e)) return;
		throw e;
	}
	const seen = (await sql`select 1 as ok from economy_ledger
		where privy_id = ${privyId} and ref = ${ref}`) as { ok: number }[];
	if (seen.length > 0) return;
	throw new HttpError(402, "not_enough_ash");
}

/** Set the player's Degree (1..7). */
export async function setDegree(
	privyId: string,
	degree: number,
): Promise<void> {
	if (!Number.isInteger(degree) || clampDegree(degree) !== degree)
		throw new HttpError(400, "invalid_degree");
	await row(privyId);
	await db()`update profiles set degree = ${degree} where privy_id = ${privyId}`;
}

/** Postgres "relation does not exist": migration 006 (economy_settled) has not landed yet. */
const isMissingTable = (e: unknown) =>
	(e as { code?: unknown } | null)?.code === "42P01";
/** Until this time (epoch ms) settle by full scan; set when economy_settled is missing. */
let fullScanUntil = 0;

/**
 * Credit every scored duel the player's Fragment fought on this chain that is not yet in the
 * ledger. Lazy and idempotent: safe to call on every read. Returns how many duels were credited.
 *
 * Reads only PairScored newer than the player's watermark (economy_settled), then moves the
 * watermark up to the indexer's cursor, below which the runner has written every event. Without
 * the table it scans all of the Fragment's duels, as before; the ledger keeps both exact.
 */
export async function settleGatherings(privyId: string): Promise<number> {
	await ensureRow(privyId);
	if (Date.now() >= fullScanUntil) {
		try {
			return await settleSince(privyId);
		} catch (e) {
			if (!isMissingTable(e)) throw e;
			fullScanUntil = Date.now() + 10 * 60_000;
			console.warn("[economy] economy_settled missing: settling by full scan");
		}
	}
	return settleAll(privyId);
}

/** The profile row exists (the credit below updates it). One statement, no read back. */
async function ensureRow(privyId: string): Promise<void> {
	await db()`insert into profiles (privy_id) values (${privyId})
		on conflict (privy_id) do nothing`;
}

async function settleSince(privyId: string): Promise<number> {
	const ref = `duel:${CHAIN_ID}:`;
	const rows = (await db()`with f as (
			select lower(fr.agent) as agent
			from players p
			join fragments fr on fr.chain_id = ${CHAIN_ID}
				and lower(fr.owner_account) = lower(p.account)
			where p.privy_id = ${privyId} and fr.agent is not null
			limit 1
		),
		w as (
			select
				coalesce((select block from economy_settled
					where privy_id = ${privyId} and chain_id = ${CHAIN_ID}), -1)::bigint as done,
				coalesce((select last_block from indexer_state
					where chain_id = ${CHAIN_ID}), -1)::bigint as top
		),
		duels as (
			select ${ref}::text || e.block::text || ':' || e.log_index::text as ref,
				case when lower(e.data ->> 'agentA') = f.agent
					then (e.data ->> 'pointsA')::int
					else (e.data ->> 'pointsB')::int end as light
			from arena_events e cross join f
			where e.chain_id = ${CHAIN_ID} and e.name = 'PairScored'
				and e.block > (select done from w)
				and (lower(e.data ->> 'agentA') = f.agent or lower(e.data ->> 'agentB') = f.agent)
		),
		ins as (
			insert into economy_ledger (privy_id, kind, ash, resonance, ref)
			select ${privyId}::text, 'gathering', greatest(d.light, 0) + ${DUEL_ASH_BONUS}::int,
				${DUEL_RESONANCE}::int, d.ref
			from duels d
			where not exists (
				select 1 from economy_ledger l where l.privy_id = ${privyId} and l.ref = d.ref
			)
			on conflict (privy_id, ref) do nothing
			returning ash, resonance
		),
		tot as (
			select count(*)::int as n, coalesce(sum(ash), 0)::int as ash,
				coalesce(sum(resonance), 0)::int as resonance
			from ins
		),
		upd as (
			update profiles p set ash = p.ash + tot.ash, resonance = p.resonance + tot.resonance
			from tot where p.privy_id = ${privyId} and tot.n > 0
			returning 1
		),
		mark as (
			insert into economy_settled (privy_id, chain_id, block)
			select ${privyId}::text, ${CHAIN_ID}::int, w.top from w
			where w.top > w.done and exists (select 1 from f)
			on conflict (privy_id, chain_id) do update
				set block = greatest(economy_settled.block, excluded.block), updated_at = now()
			returning 1
		)
		select n from tot`) as { n: number }[];
	return Number(rows[0]?.n ?? 0);
}

/** Every duel the Fragment fought (the path before migration 006). */
async function settleAll(privyId: string): Promise<number> {
	const ref = `duel:${CHAIN_ID}:`;
	const rows = (await db()`with f as (
			select lower(fr.agent) as agent
			from players p
			join fragments fr on fr.chain_id = ${CHAIN_ID}
				and lower(fr.owner_account) = lower(p.account)
			where p.privy_id = ${privyId} and fr.agent is not null
			limit 1
		),
		duels as (
			select ${ref}::text || e.block::text || ':' || e.log_index::text as ref,
				case when lower(e.data ->> 'agentA') = f.agent
					then (e.data ->> 'pointsA')::int
					else (e.data ->> 'pointsB')::int end as light
			from arena_events e cross join f
			where e.chain_id = ${CHAIN_ID} and e.name = 'PairScored'
				and (lower(e.data ->> 'agentA') = f.agent or lower(e.data ->> 'agentB') = f.agent)
		),
		ins as (
			insert into economy_ledger (privy_id, kind, ash, resonance, ref)
			select ${privyId}::text, 'gathering', greatest(d.light, 0) + ${DUEL_ASH_BONUS}::int,
				${DUEL_RESONANCE}::int, d.ref
			from duels d
			where not exists (
				select 1 from economy_ledger l where l.privy_id = ${privyId} and l.ref = d.ref
			)
			on conflict (privy_id, ref) do nothing
			returning ash, resonance
		),
		tot as (
			select count(*)::int as n, coalesce(sum(ash), 0)::int as ash,
				coalesce(sum(resonance), 0)::int as resonance
			from ins
		),
		upd as (
			update profiles p set ash = p.ash + tot.ash, resonance = p.resonance + tot.resonance
			from tot where p.privy_id = ${privyId} and tot.n > 0
			returning 1
		)
		select n from tot`) as { n: number }[];
	return Number(rows[0]?.n ?? 0);
}

/**
 * Empty the Vigil into the purse and start it again from now. Compare-and-set on vigil_since,
 * so two claims racing credit it once.
 */
export async function claimVigil(
	privyId: string,
): Promise<{ profile: Profile; gained: { ash: number; resonance: number } }> {
	const r = await row(privyId);
	const now = Date.now();
	const v = vigilAccrued(now, r.since_ms);
	let gained = { ash: 0, resonance: 0 };
	if (v.ash > 0 || v.resonance > 0) {
		const nowIso = new Date(now).toISOString();
		const done = (await db()`with upd as (
				update profiles
				set vigil_since = ${nowIso}::timestamptz,
					ash = ash + ${v.ash}, resonance = resonance + ${v.resonance}
				where privy_id = ${privyId} and vigil_since = ${r.since_text}::timestamptz
				returning privy_id
			)
			insert into economy_ledger (privy_id, kind, ash, resonance, ref)
			select privy_id, 'vigil', ${v.ash}::int, ${v.resonance}::int, ${`vigil:${now}`}::text from upd
			on conflict (privy_id, ref) do nothing
			returning 1 as ok`) as { ok: number }[];
		if (done.length > 0) gained = { ash: v.ash, resonance: v.resonance };
	}
	return { profile: await getProfile(privyId), gained };
}
