// Staggered unlocks: which mechanics a player has opened. Pure, shared by server, client and
// preview mocks. No I/O here. Names and requirement lines live in lexicon/unlocks.ts.
import type { Me } from "@/client/api.ts";
import type { Profile } from "./economy.ts";

export type UnlockId =
	| "fragment"
	| "gathering"
	| "vigil"
	| "retune"
	| "spire"
	| "marks"
	| "reliquary"
	| "vestry";

/** The player's Fragment status, or null when they have none. */
export type UnlockFragmentStatus =
	| "requested"
	| "registered"
	| "confirmed"
	| "failed"
	| null;

/** Everything the unlock rules read. */
export interface UnlockFacts {
	status: UnlockFragmentStatus;
	/** Gathering duels the player's Fragment has fought. */
	duels: number;
	level: number;
	/** 7 (start) down to 1. */
	degree: number;
	ash: number;
	/** First Spire floor clears across every Degree. */
	spireClears: number;
	/** Scryings ever made. */
	scries: number;
	/** Marks earned (queued or sealed). */
	marksEarned: number;
}

/** Key of the requirement line in lexicon/unlocks.ts (`unlocks.need`). */
export type UnlockNeed =
	| "always"
	| "bind"
	| "seal"
	| "firstDuel"
	| "threeDuels"
	| "earnMark"
	| "clearFloor"
	| "scryOnce";

export interface UnlockDef {
	id: UnlockId;
	need: UnlockNeed;
	test: (f: UnlockFacts) => boolean;
}

/** In the order a player usually opens them. */
export const UNLOCKS: readonly UnlockDef[] = [
	{ id: "fragment", need: "always", test: () => true },
	{
		id: "gathering",
		need: "bind",
		test: (f) => f.status === "registered" || f.status === "confirmed",
	},
	{ id: "vigil", need: "seal", test: (f) => f.status === "confirmed" },
	{ id: "retune", need: "firstDuel", test: (f) => f.duels >= 1 },
	{
		id: "spire",
		need: "threeDuels",
		test: (f) => f.duels >= 3 || f.level >= 3,
	},
	{ id: "marks", need: "earnMark", test: (f) => f.marksEarned >= 1 },
	{
		id: "reliquary",
		need: "clearFloor",
		test: (f) => f.spireClears >= 1 || f.ash >= 100,
	},
	{
		id: "vestry",
		need: "scryOnce",
		test: (f) => f.scries >= 1 || f.degree <= 6,
	},
];

export const UNLOCK_IDS: readonly UnlockId[] = UNLOCKS.map((u) => u.id);

export const isUnlockId = (v: unknown): v is UnlockId =>
	typeof v === "string" && (UNLOCK_IDS as readonly string[]).includes(v);

/** Which mechanics the facts open right now. */
export function computeUnlocks(facts: UnlockFacts): Record<UnlockId, boolean> {
	const out = {} as Record<UnlockId, boolean>;
	for (const u of UNLOCKS) out[u.id] = u.test(facts);
	return out;
}

/**
 * Unlocks never close again: once opened (e.g. Ash reached 100, then was spent), they stay.
 * `kept` is what was opened before.
 */
export function withKept(
	now: Record<UnlockId, boolean>,
	kept: readonly string[],
): Record<UnlockId, boolean> {
	const out = { ...now };
	for (const id of kept) if (isUnlockId(id)) out[id] = true;
	return out;
}

/** The opened ids, in UNLOCKS order. */
export const unlockedIds = (u: Record<UnlockId, boolean>): UnlockId[] =>
	UNLOCK_IDS.filter((id) => u[id]);

/** The first mechanic still closed (what to point the player at next), or null when all are open. */
export function nextUnlock(u: Record<UnlockId, boolean>): UnlockDef | null {
	return UNLOCKS.find((d) => !u[d.id]) ?? null;
}

/** Steps of the interactive onboarding, in order. */
export const ONBOARDING_STEPS = [
	"mask",
	"sigil",
	"name",
	"bind",
	"practice",
	"seal",
	"gathering",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const isOnboardingStep = (v: unknown): v is OnboardingStep =>
	typeof v === "string" && (ONBOARDING_STEPS as readonly string[]).includes(v);

/** Steps that happen before the Fragment exists. */
export const PRE_BIND_STEPS: readonly OnboardingStep[] = [
	"mask",
	"sigil",
	"name",
	"bind",
];

/** Unlocked ids the player has not been shown yet ('fragment' is always known). */
export function freshUnlocks(
	u: Record<UnlockId, boolean>,
	acked: readonly string[],
): UnlockId[] {
	return UNLOCK_IDS.filter(
		(id) => id !== "fragment" && u[id] && !acked.includes(id),
	);
}

/** GET /api/state: everything the shell and screens need, in one read. */
export interface GameState {
	me: Me;
	profile: Profile | null;
	unlocks: Record<UnlockId, boolean>;
	/** Unlocked but not yet shown to the player. */
	fresh: UnlockId[];
	onboarding: { step: OnboardingStep | null; done: boolean };
	marks: { earned: number; total: number };
	equipped: { finish: string | null; title: string | null };
}

/** POST /api/onboarding body. */
export interface OnboardingUpdate {
	step?: OnboardingStep | null;
	done?: boolean;
	ack?: UnlockId[];
}

/** POST /api/onboarding answer. */
export interface OnboardingResponse {
	onboarding: GameState["onboarding"];
	fresh: UnlockId[];
}
