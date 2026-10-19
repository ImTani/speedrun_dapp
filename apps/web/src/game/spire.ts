// The Spire: PvE rules, the Remnant roster and the duel simulation. Pure, shared by the server,
// the client and the preview mocks. No I/O here.
//
// Each Degree (7..1) has five floors; floor 5 is that Degree's boss Remnant. A floor is a five-move
// duel between the player's Fragment (its current Aspect and Sigils) and the floor's Remnant,
// played with @arena/strategies decide() on a deterministic seed.
//
// Clearing a floor means drawing at least `need` Light from it. (Out-scoring the Remnant cannot be
// the rule: a Fragment that never strikes first, such as Mercy, Echo or Rancour, can at best tie
// any opponent in a single duel, so those Aspects could never climb.) The Remnants get nastier
// upward and each `need` is tuned so every Aspect has a way up with the right Sigils.

import {
	type AgentConfig,
	DEFAULT_KNOBS,
	decide,
	type Knobs,
	Move,
	StrategyId,
	scoreTurn,
	type Turn,
} from "@arena/strategies";
import { concat, encodeAbiParameters, type Hex, keccak256 } from "viem";

export const FLOORS = 5;
export const BOSS_FLOOR = 5;
export const MOVES = 5;
export const ATTEMPTS_MAX = 5;
/** One climb returns every 4.8 hours (five a day). */
export const ATTEMPT_REGEN_MS = 4.8 * 3_600_000;
/** Replaying a cleared floor pays this share of its first-clear reward. */
export const REPLAY_SHARE = 0.25;

export interface Remnant {
	name: string;
	/** Aspect index 0..6 (equals the StrategyId). */
	aspect: StrategyId;
	knobs: Knobs;
	/** Light the Fragment must draw from it to clear the floor. */
	need: number;
}

const k = (over: Partial<Knobs>): Knobs => ({ ...DEFAULT_KNOBS, ...over });
const S = StrategyId;
const DEVOUR = 1;
const FATE = 2;

/** ROSTER[7 - degree][floor - 1]. Floor 5 is the boss. */
export const ROSTER: readonly (readonly Remnant[])[] = [
	// Degree VII
	[
		{
			name: "The Guttered Wick",
			aspect: S.AlwaysCooperate,
			knobs: k({}),
			need: 12,
		},
		{ name: "Sister Tallow", aspect: S.Random, knobs: k({}), need: 6 },
		{ name: "The Choir Rat", aspect: S.Pavlov, knobs: k({}), need: 9 },
		{
			name: "The Lantern Thief",
			aspect: S.AlwaysCooperate,
			knobs: k({ noise: 20 }),
			need: 12,
		},
		{
			name: "The Open Mouth",
			aspect: S.AlwaysDefect,
			knobs: k({ noise: 20 }),
			need: 4,
		},
	],
	// Degree VI
	[
		{
			name: "The Penitent",
			aspect: S.AlwaysCooperate,
			knobs: k({ noise: 10 }),
			need: 15,
		},
		{ name: "Mother Wick", aspect: S.Random, knobs: k({}), need: 7 },
		{
			name: "The Bell Ringer",
			aspect: S.TitForTat,
			knobs: k({ noise: 10 }),
			need: 12,
		},
		{
			name: "The Tithe Collector",
			aspect: S.AlwaysDefect,
			knobs: k({ noise: 20 }),
			need: 4,
		},
		{
			name: "The Mirror",
			aspect: S.TitForTat,
			knobs: k({ retaliation: 2, noise: 5 }),
			need: 11,
		},
	],
	// Degree V
	[
		{ name: "The Hollow Novice", aspect: S.Random, knobs: k({}), need: 9 },
		{
			name: "The Cinder Abbess",
			aspect: S.Pavlov,
			knobs: k({ opening: DEVOUR }),
			need: 7,
		},
		{
			name: "The Tallow Bishop",
			aspect: S.Grudger,
			knobs: k({ forgiveness: 30 }),
			need: 14,
		},
		{
			name: "The Ninth Pew",
			aspect: S.TitForTat,
			knobs: k({ retaliation: 2, noise: 10 }),
			need: 11,
		},
		{ name: "The Ledger", aspect: S.Grudger, knobs: k({ noise: 5 }), need: 10 },
	],
	// Degree IV
	[
		{
			name: "Saint Gnaw",
			aspect: S.AlwaysDefect,
			knobs: k({ noise: 15 }),
			need: 3,
		},
		{
			name: "The Ossuary Clerk",
			aspect: S.Detective,
			knobs: k({ forgiveness: 30 }),
			need: 14,
		},
		{
			name: "The Vesper Hound",
			aspect: S.TitForTat,
			knobs: k({ retaliation: 3, noise: 15 }),
			need: 10,
		},
		{
			name: "Lady Soot",
			aspect: S.Pavlov,
			knobs: k({ opening: FATE, noise: 10 }),
			need: 10,
		},
		{
			name: "The Gourmand",
			aspect: S.Pavlov,
			knobs: k({ opening: DEVOUR, noise: 10 }),
			need: 9,
		},
	],
	// Degree III
	[
		{ name: "The Thurible", aspect: S.Random, knobs: k({}), need: 10 },
		{
			name: "The Saltwound",
			aspect: S.Grudger,
			knobs: k({ opening: FATE }),
			need: 8,
		},
		{ name: "The Pale Choir", aspect: S.Detective, knobs: k({}), need: 14 },
		{
			name: "The Sexton",
			aspect: S.TitForTat,
			knobs: k({ opening: DEVOUR, retaliation: 2, forgiveness: 30, noise: 10 }),
			need: 10,
		},
		{
			name: "The Inquisitor",
			aspect: S.Detective,
			knobs: k({ noise: 5 }),
			need: 14,
		},
	],
	// Degree II
	[
		{
			name: "The Gilded Tooth",
			aspect: S.Grudger,
			knobs: k({ opening: DEVOUR, forgiveness: 20, noise: 10 }),
			need: 9,
		},
		{
			name: "The Miserere",
			aspect: S.Detective,
			knobs: k({ forgiveness: 10, noise: 10 }),
			need: 13,
		},
		{
			name: "The Last Novice",
			aspect: S.Grudger,
			knobs: k({ opening: DEVOUR, forgiveness: 40 }),
			need: 11,
		},
		{
			name: "The Weeping Font",
			aspect: S.Pavlov,
			knobs: k({ opening: DEVOUR, noise: 15 }),
			need: 10,
		},
		{
			name: "The Laughing Thing",
			aspect: S.TitForTat,
			knobs: k({ opening: FATE, retaliation: 3, noise: 20 }),
			need: 11,
		},
	],
	// Degree I
	[
		{ name: "The Ember Prior", aspect: S.Random, knobs: k({}), need: 11 },
		{
			name: "The Tolling Bell",
			aspect: S.TitForTat,
			knobs: k({ retaliation: 5, noise: 10 }),
			need: 10,
		},
		{
			name: "The Grey Confessor",
			aspect: S.Detective,
			knobs: k({ noise: 10 }),
			need: 13,
		},
		{
			name: "The Widow Censer",
			aspect: S.Grudger,
			knobs: k({ opening: FATE, noise: 10 }),
			need: 9,
		},
		{
			name: "The Hollow Saint",
			aspect: S.Grudger,
			knobs: k({ noise: 10 }),
			need: 13,
		},
	],
];

export function clampDegree(degree: number): number {
	const d = Math.trunc(degree);
	return Number.isFinite(d) ? Math.min(7, Math.max(1, d)) : 7;
}

export function remnantAt(degree: number, floor: number): Remnant {
	const row = ROSTER[7 - clampDegree(degree)];
	const r = row?.[floor - 1];
	if (!r) throw new RangeError(`no Remnant at degree ${degree} floor ${floor}`);
	return r;
}

export function remnantConfig(r: Remnant): AgentConfig {
	return { strategy: r.aspect, knobs: r.knobs };
}

/** First-clear reward; replays pay REPLAY_SHARE of it. */
export function floorReward(
	degree: number,
	floor: number,
	replay = false,
): { ash: number; resonance: number } {
	const d = clampDegree(degree);
	const ash = 20 * floor * (8 - d);
	const resonance = 30 * floor;
	return replay
		? {
				ash: Math.floor(ash * REPLAY_SHARE),
				resonance: Math.floor(resonance * REPLAY_SHARE),
			}
		: { ash, resonance };
}

// ---------------------------------------------------------------- climbs (attempts)

export interface AttemptState {
	/** Climbs available now, 0..ATTEMPTS_MAX. */
	left: number;
	/** Regen clock origin (ms): the next climb returns at `at + ATTEMPT_REGEN_MS` when not full. */
	at: number;
}

/** Applies regeneration up to `now` to the stored (count, clock). */
export function attemptsNow(
	stored: number,
	at: number,
	now: number,
): AttemptState {
	const s = Math.max(0, Math.min(ATTEMPTS_MAX, Math.trunc(stored)));
	if (s >= ATTEMPTS_MAX) return { left: ATTEMPTS_MAX, at: now };
	const gained = Math.max(0, Math.floor((now - at) / ATTEMPT_REGEN_MS));
	const left = Math.min(ATTEMPTS_MAX, s + gained);
	return left >= ATTEMPTS_MAX
		? { left, at: now }
		: { left, at: at + gained * ATTEMPT_REGEN_MS };
}

/** When the next climb returns (ms), or null when full. */
export function nextAttemptAt(a: AttemptState): number | null {
	return a.left >= ATTEMPTS_MAX ? null : a.at + ATTEMPT_REGEN_MS;
}

/** Spends one climb; null when none are left. */
export function spendAttempt(
	a: AttemptState,
	now: number,
): AttemptState | null {
	if (a.left < 1) return null;
	// A full meter starts its regen clock on the first spend.
	return { left: a.left - 1, at: a.left >= ATTEMPTS_MAX ? now : a.at };
}

// ---------------------------------------------------------------- the duel

export interface DuelTurn {
	/** 0 Kindle, 1 Devour (Move). */
	mine: Move;
	theirs: Move;
}

export interface DuelResult {
	won: boolean;
	myLight: number;
	theirLight: number;
	need: number;
	turns: DuelTurn[];
}

/** Seed for one climb: keccak(privyId, degree, floor, attempt). */
export function climbSeed(
	privyId: string,
	degree: number,
	floor: number,
	attempt: number,
): Hex {
	return keccak256(
		encodeAbiParameters(
			[
				{ type: "string" },
				{ type: "uint8" },
				{ type: "uint8" },
				{ type: "uint32" },
			],
			[privyId, degree, floor, attempt],
		),
	);
}

/** Plays the five moves. Same inputs, same duel. */
export function duel(
	mine: AgentConfig,
	remnant: Remnant,
	seed: Hex,
): DuelResult {
	const theirsCfg = remnantConfig(remnant);
	const theirSeed = keccak256(concat([seed, "0x52"]));
	const a: Turn[] = [];
	const b: Turn[] = [];
	const turns: DuelTurn[] = [];
	let myLight = 0;
	let theirLight = 0;
	for (let i = 0; i < MOVES; i++) {
		const ctx = { boutId: 0n, matchIndex: 0n, moveIndex: BigInt(i) };
		const m = decide({ config: mine, history: a, seed, ctx });
		const t = decide({ config: theirsCfg, history: b, seed: theirSeed, ctx });
		const [pm, pt] = scoreTurn(m, t);
		myLight += pm;
		theirLight += pt;
		a.push({ mine: m, theirs: t });
		b.push({ mine: t, theirs: m });
		turns.push({ mine: m, theirs: t });
	}
	return {
		won: myLight >= remnant.need,
		myLight,
		theirLight,
		need: remnant.need,
		turns,
	};
}

/** Light per side for one turn. */
export function turnLight(t: DuelTurn): [number, number] {
	return scoreTurn(t.mine, t.theirs);
}

export { Move };

// ---------------------------------------------------------------- API shapes (server <-> client)

export type FloorStatus = "cleared" | "open" | "locked";
/** Why a floor is locked: the floor below is not cleared, or the Fragment is below its level cap. */
export type FloorLock = "below" | "level";

export interface SpireFloor {
	floor: number;
	boss: boolean;
	name: string;
	aspect: number;
	need: number;
	status: FloorStatus;
	lock: FloorLock | null;
	/** What clearing it now pays (the replay share once cleared). */
	reward: { ash: number; resonance: number };
}

export interface SpireState {
	/** Current Degree, 7..1. */
	degree: number;
	/** True once the Degree I boss has fallen: replays only. */
	summit: boolean;
	level: number;
	levelCap: number;
	attempts: { left: number; max: number; nextAt: number | null };
	fragment: { name: string; aspect: number } | null;
	/** Floors 1..5 of the current Degree, bottom first. */
	floors: SpireFloor[];
}

export interface ClimbResponse {
	result: {
		won: boolean;
		myLight: number;
		theirLight: number;
		need: number;
		turns: DuelTurn[];
	};
	rewards: { ash: number; resonance: number; first: boolean };
	/** The new Degree when a boss fell. */
	promoted?: { degree: number };
	state: SpireState;
}

/** Builds the floors view for a Degree from progress. Shared by server and mocks. */
export function floorsFor(
	degree: number,
	cleared: number,
	level: number,
	levelCap: number,
): SpireFloor[] {
	const d = clampDegree(degree);
	return (ROSTER[7 - d] ?? []).map((r, i) => {
		const floor = i + 1;
		const boss = floor === BOSS_FLOOR;
		const done = floor <= cleared;
		const lock: FloorLock | null = done
			? null
			: floor > cleared + 1
				? "below"
				: boss && level < levelCap
					? "level"
					: null;
		return {
			floor,
			boss,
			name: r.name,
			aspect: r.aspect,
			need: r.need,
			status: done ? "cleared" : lock ? "locked" : "open",
			lock,
			reward: floorReward(d, floor, done),
		};
	});
}
