import { decodeConfig } from "@arena/strategies";
import {
	ATTEMPTS_MAX,
	attemptsNow,
	BOSS_FLOOR,
	type ClimbResponse,
	clampDegree,
	climbSeed,
	duel,
	FLOORS,
	floorReward,
	floorsFor,
	nextAttemptAt,
	remnantAt,
	type SpireState,
	spendAttempt,
} from "@/game/spire.ts";
import { db } from "./db.ts";
import { getProfile, grant, setDegree, settleGatherings } from "./economy.ts";
import { HttpError } from "./env.ts";
import { evaluateMarks, queueMark } from "./marks.ts";
import { ensurePlayer, type FragmentRow, fragmentOf } from "./player.ts";

/** Marks kind for Degrees (tier = the Degree reached). */
const MARK_DEGREE = 1;

interface ProgressRow {
	degree: number;
	cleared: number;
	attempts: number;
	/** attempts_at in epoch ms. */
	at_ms: number;
	runs: number;
}

async function progressRow(
	privyId: string,
	degree: number,
): Promise<ProgressRow> {
	const sql = db();
	await sql`insert into spire_progress (privy_id, degree) values (${privyId}, ${degree})
		on conflict (privy_id) do nothing`;
	const rows = (await sql`select degree, cleared, attempts, runs,
			(extract(epoch from attempts_at) * 1000)::float8 as at_ms
		from spire_progress where privy_id = ${privyId}`) as ProgressRow[];
	const r = rows[0];
	if (!r) throw new HttpError(500, "spire_missing");
	const row = {
		degree: Number(r.degree),
		cleared: Number(r.cleared),
		attempts: Number(r.attempts),
		at_ms: Number(r.at_ms),
		runs: Number(r.runs),
	};
	// The Degree lives in the profile; when it moved elsewhere, this Degree starts from floor 0.
	if (row.degree !== degree) {
		await sql`update spire_progress set degree = ${degree}, cleared = 0, updated_at = now()
			where privy_id = ${privyId} and degree = ${row.degree}`;
		return { ...row, degree, cleared: 0 };
	}
	return row;
}

function aspectOf(f: FragmentRow): number {
	return Number(BigInt(f.config) & 0xffn);
}

function stateFrom(
	row: ProgressRow,
	profile: { level: number; levelCap: number },
	fragment: FragmentRow | null,
	now: number,
): SpireState {
	const a = attemptsNow(row.attempts, row.at_ms, now);
	return {
		degree: row.degree,
		summit: row.degree === 1 && row.cleared >= FLOORS,
		level: profile.level,
		levelCap: profile.levelCap,
		attempts: { left: a.left, max: ATTEMPTS_MAX, nextAt: nextAttemptAt(a) },
		fragment:
			fragment && fragment.status !== "failed"
				? { name: fragment.name, aspect: aspectOf(fragment) }
				: null,
		floors: floorsFor(row.degree, row.cleared, profile.level, profile.levelCap),
	};
}

/** The tower as the player sees it now. */
export async function spireState(privyId: string): Promise<SpireState> {
	const player = await ensurePlayer(privyId);
	// Gathering duels feed Resonance, and the boss gate reads the level.
	await settleGatherings(privyId);
	const profile = await getProfile(privyId);
	const [fragment, row] = await Promise.all([
		fragmentOf(player.account),
		progressRow(privyId, clampDegree(profile.degree)),
	]);
	return stateFrom(row, profile, fragment, Date.now());
}

/** Climbs one floor: spends a climb, plays the duel, pays and promotes. */
export async function climb(
	privyId: string,
	floor: number,
): Promise<ClimbResponse> {
	if (!Number.isInteger(floor) || floor < 1 || floor > FLOORS)
		throw new HttpError(400, "invalid_floor");
	const [player, profile] = await Promise.all([
		ensurePlayer(privyId),
		getProfile(privyId),
	]);
	const fragment = await fragmentOf(player.account);
	if (!fragment || fragment.status === "failed")
		throw new HttpError(409, "no_fragment");
	const config = BigInt(fragment.config);
	const mine = decodeConfig(config);

	const degree = clampDegree(profile.degree);
	const row = await progressRow(privyId, degree);
	const target = floorsFor(
		degree,
		row.cleared,
		profile.level,
		profile.levelCap,
	)[floor - 1];
	if (!target || target.status === "locked")
		throw new HttpError(409, "floor_locked");

	// Spend one climb. `runs` is the version: a concurrent climb makes this update miss.
	const now = Date.now();
	const spent = spendAttempt(attemptsNow(row.attempts, row.at_ms, now), now);
	if (!spent) throw new HttpError(429, "no_attempts");
	const sql = db();
	const bumped = (await sql`update spire_progress
		set attempts = ${spent.left}, attempts_at = to_timestamp(${spent.at / 1000}),
			runs = runs + 1, updated_at = now()
		where privy_id = ${privyId} and runs = ${row.runs}
		returning runs`) as { runs: number }[];
	const attempt = Number(bumped[0]?.runs ?? 0);
	if (!attempt) throw new HttpError(409, "busy");

	const remnant = remnantAt(degree, floor);
	const result = duel(
		mine,
		remnant,
		climbSeed(privyId, degree, floor, attempt),
	);

	let first = false;
	let promoted: { degree: number } | undefined;
	let rewards = { ash: 0, resonance: 0 };
	if (result.won) {
		if (floor > row.cleared) {
			const took = await sql`update spire_progress
				set cleared = ${floor}, floors_cleared = floors_cleared + 1, updated_at = now()
				where privy_id = ${privyId} and degree = ${degree} and cleared = ${floor - 1}
				returning 1 as ok`;
			first = took.length > 0;
		}
		rewards = floorReward(degree, floor, !first);
		await grant(privyId, rewards, "spire", `spire:${attempt}`);
		if (first && floor === BOSS_FLOOR && degree > 1) {
			const next = degree - 1;
			await setDegree(privyId, next);
			await sql`update spire_progress set degree = ${next}, cleared = 0, updated_at = now()
				where privy_id = ${privyId} and degree = ${degree}`;
			await queueMark(privyId, MARK_DEGREE, next);
			promoted = { degree: next };
		}
		if (first)
			await evaluateMarks(privyId).catch((e) =>
				console.error(
					"[spire] marks",
					String((e as Error).message ?? e).slice(0, 160),
				),
			);
	}

	await sql`insert into spire_runs (privy_id, attempt, degree, floor, config, won, my_light,
			their_light, turns, first_clear, ash, resonance, promoted_to)
		values (${privyId}, ${attempt}, ${degree}, ${floor}, ${config.toString()}, ${result.won},
			${result.myLight}, ${result.theirLight}, ${JSON.stringify(result.turns)}::jsonb, ${first},
			${rewards.ash}, ${rewards.resonance}, ${promoted?.degree ?? null})
		on conflict (privy_id, attempt) do nothing`;

	const after = await getProfile(privyId);
	const nextRow = await progressRow(privyId, clampDegree(after.degree));
	return {
		result: {
			won: result.won,
			myLight: result.myLight,
			theirLight: result.theirLight,
			need: result.need,
			turns: result.turns,
		},
		rewards: { ...rewards, first },
		...(promoted ? { promoted } : {}),
		state: stateFrom(nextRow, after, fragment, Date.now()),
	};
}
