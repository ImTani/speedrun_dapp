// Game state in one read (GET /api/state), onboarding progress, and the unlock guard every gated
// action calls. Rules live in src/game/unlocks.ts; rows in db/migrations/005_onboarding.sql.
import type { Address } from "viem";
import type { Me } from "@/client/api.ts";
import { MARKS } from "@/game/marks.ts";
import {
	computeUnlocks,
	freshUnlocks,
	type GameState,
	isOnboardingStep,
	isUnlockId,
	type OnboardingResponse,
	type OnboardingStep,
	PRE_BIND_STEPS,
	UNLOCK_IDS,
	type UnlockFacts,
	type UnlockId,
	unlockedIds,
	withKept,
} from "@/game/unlocks.ts";
import { agentConfirmed, boutActive, CHAIN_ID } from "./chain.ts";
import { db } from "./db.ts";
import { getProfile, settleGatherings } from "./economy.ts";
import { HttpError } from "./env.ts";
import { evaluateMarks } from "./marks.ts";
import { ensurePlayer, type FragmentRow, fragmentOf } from "./player.ts";

export type { GameState, OnboardingResponse } from "@/game/unlocks.ts";

/** Every Mark tier in the catalog (Stigmata included). */
const MARKS_TOTAL = MARKS.reduce((n, m) => n + m.tiers.length, 0);

// ---------------------------------------------------------------- me

/** boutActive is the same for everyone; one chain read serves every poll for a few seconds. */
const BOUT_TTL_MS = 4000;
let bout: { at: number; value: Promise<boolean> } | null = null;
function boutActiveCached(): Promise<boolean> {
	const now = Date.now();
	if (!bout || now - bout.at > BOUT_TTL_MS)
		bout = { at: now, value: boutActive().catch(() => false) };
	return bout.value;
}

/** The player's Fragment; a registered one the chain has confirmed is promoted here. */
async function fragmentChecked(account: string): Promise<FragmentRow | null> {
	const fragment = await fragmentOf(account);
	if (fragment?.status === "registered" && fragment.agent) {
		const ok = await agentConfirmed(fragment.agent as Address).catch(
			() => false,
		);
		if (ok) {
			await db()`update fragments set status = 'confirmed', confirmed_at = now()
				where id = ${fragment.id} and status = 'registered'`;
			fragment.status = "confirmed";
		}
	}
	return fragment;
}

/** What GET /api/me answers. */
export async function meFor(privyId: string): Promise<Me> {
	const player = await ensurePlayer(privyId);
	const [fragment, active] = await Promise.all([
		fragmentChecked(player.account),
		boutActiveCached(),
	]);
	return { account: player.account, fragment, boutActive: active };
}

// ---------------------------------------------------------------- facts

interface FactsRow {
	duels: number;
	spire_clears: number;
	scries: number;
	marks_earned: number;
	finish: string | null;
	title: string | null;
}

/** Counts the unlock rules read, plus what the Fragment wears. One round trip. */
async function factsRow(privyId: string): Promise<FactsRow> {
	const rows = (await db()`select
			(select count(*)::int from economy_ledger
				where privy_id = ${privyId} and kind = 'gathering'
					and ref like ${`duel:${CHAIN_ID}:%`}) as duels,
			(select coalesce(max(floors_cleared), 0)::int from spire_progress
				where privy_id = ${privyId}) as spire_clears,
			(select count(*)::int from scry_log where privy_id = ${privyId}) as scries,
			(select count(*)::int from marks
				where chain_id = ${CHAIN_ID} and privy_id = ${privyId}) as marks_earned,
			e.finish, e.title
		from (select 1) as one
		left join inventory_equipped e on e.privy_id = ${privyId}`) as FactsRow[];
	const r = rows[0];
	return {
		duels: Number(r?.duels ?? 0),
		spire_clears: Number(r?.spire_clears ?? 0),
		scries: Number(r?.scries ?? 0),
		marks_earned: Number(r?.marks_earned ?? 0),
		finish: r?.finish ?? null,
		title: r?.title ?? null,
	};
}

async function marksEarned(privyId: string): Promise<number> {
	const rows = (await db()`select count(*)::int as n from marks
		where chain_id = ${CHAIN_ID} and privy_id = ${privyId}`) as { n: number }[];
	return Number(rows[0]?.n ?? 0);
}

// ---------------------------------------------------------------- onboarding rows

interface OnboardingRow {
	step: string | null;
	done: boolean;
	acked: string[];
	unlocked: string[];
}

/** The onboarding table exists (migration 005 may land after this code). Cached once true. */
let onboardingReady = false;
async function hasOnboarding(): Promise<boolean> {
	if (onboardingReady) return true;
	const rows =
		(await db()`select to_regclass('public.onboarding') is not null as ok`) as {
			ok: boolean;
		}[];
	onboardingReady = Boolean(rows[0]?.ok);
	return onboardingReady;
}

const toRow = (r: OnboardingRow): OnboardingRow => ({
	step: r.step ?? null,
	done: Boolean(r.done),
	acked: r.acked ?? [],
	unlocked: r.unlocked ?? [],
});

async function onboardingRow(privyId: string): Promise<OnboardingRow | null> {
	const rows = (await db()`select step, done, acked, unlocked from onboarding
		where privy_id = ${privyId}`) as OnboardingRow[];
	return rows[0] ? toRow(rows[0]) : null;
}

/** Where a player stands in onboarding, judged from the Fragment alone. */
function stepFor(status: FragmentRow["status"] | null): OnboardingStep | null {
	if (status === "requested") return "practice";
	if (status === "registered") return "seal";
	if (status === "confirmed") return "gathering";
	return "mask";
}

/**
 * First sight: a player who already has a sealed Fragment skips onboarding and has seen
 * everything already open; everyone else starts at the step their Fragment implies.
 */
async function createRow(
	privyId: string,
	status: FragmentRow["status"] | null,
	open: UnlockId[],
): Promise<OnboardingRow> {
	const veteran = status === "confirmed";
	const step = veteran ? null : stepFor(status);
	const acked = veteran ? open : ["fragment"];
	const rows =
		(await db()`insert into onboarding (privy_id, step, done, acked, unlocked)
		values (${privyId}, ${step}, ${veteran}, ${acked}::text[], ${open}::text[])
		on conflict (privy_id) do nothing
		returning step, done, acked, unlocked`) as OnboardingRow[];
	if (rows[0]) return toRow(rows[0]);
	const raced = await onboardingRow(privyId);
	if (!raced) throw new HttpError(500, "onboarding_missing");
	return raced;
}

/** Stores newly opened ids (unlocks never close). */
async function keepUnlocked(privyId: string, ids: UnlockId[]): Promise<void> {
	if (ids.length === 0) return;
	await db()`update onboarding
		set unlocked = array(select distinct x from unnest(unlocked || ${ids}::text[]) as x),
			updated_at = now()
		where privy_id = ${privyId}`;
}

// ---------------------------------------------------------------- state

/**
 * Everything the shell needs in one read: me, the profile (after crediting finished duels),
 * unlocks (sticky), fresh unlocks, onboarding, Marks count and what the Fragment wears.
 */
export async function gameState(privyId: string): Promise<GameState> {
	const player = await ensurePlayer(privyId);
	const ready = await hasOnboarding();
	const [fragment, active, row, settled] = await Promise.all([
		fragmentChecked(player.account),
		boutActiveCached(),
		ready ? onboardingRow(privyId) : Promise.resolve(null),
		settleGatherings(privyId),
	]);
	const [profile, facts] = await Promise.all([
		getProfile(privyId),
		factsRow(privyId),
	]);
	const kept = row?.unlocked ?? [];

	// Marks are queued when something could have earned one; until the Marks tab opens, any duel
	// or Spire clear is checked, so a first Gathering Mark opens it without visiting the shelf.
	if (
		settled > 0 ||
		(!kept.includes("marks") && (facts.duels > 0 || facts.spire_clears > 0))
	) {
		await evaluateMarks(privyId).catch((e) =>
			console.error(
				"[state] marks",
				String((e as Error).message ?? e).slice(0, 160),
			),
		);
		facts.marks_earned = await marksEarned(privyId);
	}

	const status = fragment?.status ?? null;
	const unlockFacts: UnlockFacts = {
		status,
		duels: facts.duels,
		level: profile.level,
		degree: profile.degree,
		ash: profile.ash,
		spireClears: facts.spire_clears,
		scries: facts.scries,
		marksEarned: facts.marks_earned,
	};
	const unlocks = withKept(computeUnlocks(unlockFacts), kept);
	const open = unlockedIds(unlocks);

	let onboarding: GameState["onboarding"];
	let fresh: UnlockId[] = [];
	if (ready) {
		let r = row;
		if (!r) r = await createRow(privyId, status, open);
		else
			await keepUnlocked(
				privyId,
				open.filter((id) => !kept.includes(id)),
			);
		let step = isOnboardingStep(r.step) ? r.step : null;
		// A Fragment exists, so steps before binding are behind the player.
		if (step && PRE_BIND_STEPS.includes(step) && status && status !== "failed")
			step = stepFor(status);
		onboarding = { step: r.done ? null : step, done: r.done };
		fresh = freshUnlocks(unlocks, r.acked);
	} else {
		const done = status === "confirmed";
		onboarding = { step: done ? null : stepFor(status), done };
	}

	return {
		me: { account: player.account, fragment, boutActive: active },
		profile,
		unlocks,
		fresh,
		onboarding,
		marks: { earned: facts.marks_earned, total: MARKS_TOTAL },
		equipped: { finish: facts.finish, title: facts.title },
	};
}

/**
 * Throws HttpError(403, 'locked') unless the player has opened `id`. Fast path: one lookup of
 * the stored unlocks; otherwise the facts are measured (and stored) once.
 */
export async function requireUnlocked(
	privyId: string,
	id: UnlockId,
): Promise<void> {
	if (id === "fragment") return;
	if (await hasOnboarding()) {
		const rows = (await db()`select ${id}::text = any(unlocked) as ok
			from onboarding where privy_id = ${privyId}`) as { ok: boolean }[];
		if (rows[0]?.ok) return;
	}
	const s = await gameState(privyId);
	if (!s.unlocks[id]) throw new HttpError(403, "locked");
}

// ---------------------------------------------------------------- onboarding updates

/**
 * POST /api/onboarding: move to a step, finish (or restart) onboarding, and acknowledge fresh
 * unlocks. Only ids already opened can be acknowledged.
 */
export async function updateOnboarding(
	privyId: string,
	input: { step?: unknown; done?: unknown; ack?: unknown },
): Promise<OnboardingResponse> {
	const setStep = input.step !== undefined;
	if (setStep && input.step !== null && !isOnboardingStep(input.step))
		throw new HttpError(400, "invalid_step");
	const setDone = input.done !== undefined;
	if (setDone && typeof input.done !== "boolean")
		throw new HttpError(400, "invalid_done");
	if (
		input.ack !== undefined &&
		(!Array.isArray(input.ack) || !input.ack.every(isUnlockId))
	)
		throw new HttpError(400, "invalid_ack");
	const ack = [...new Set((input.ack as UnlockId[] | undefined) ?? [])];
	const step = setStep ? (input.step as OnboardingStep | null) : null;
	const done = setDone ? (input.done as boolean) : false;

	if (!(await hasOnboarding())) throw new HttpError(503, "unavailable");
	// First sight sets up the row from the player's real standing.
	if (!(await onboardingRow(privyId))) await gameState(privyId);

	const rows = (await db()`update onboarding set
			step = case
				when ${setDone && done}::boolean then null
				when ${setStep}::boolean then ${step}::text
				else step end,
			done = case when ${setDone}::boolean then ${done}::boolean else done end,
			acked = array(
				select distinct x from unnest(
					acked || array(select a from unnest(${ack}::text[]) as a where a = any(unlocked))
				) as x
			),
			updated_at = now()
		where privy_id = ${privyId}
		returning step, done, acked, unlocked`) as OnboardingRow[];
	const r = rows[0] ? toRow(rows[0]) : null;
	if (!r) throw new HttpError(500, "onboarding_missing");
	return {
		onboarding: {
			step: r.done ? null : isOnboardingStep(r.step) ? r.step : null,
			done: r.done,
		},
		fresh: UNLOCK_IDS.filter(
			(id) =>
				id !== "fragment" && r.unlocked.includes(id) && !r.acked.includes(id),
		),
	};
}
