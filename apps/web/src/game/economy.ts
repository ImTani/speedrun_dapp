// Economy rules: pure, shared by server, client and preview mocks. No I/O here.

/** Degrees run from 7 (where every Claimant starts) down to 1. */
export const DEGREE_START = 7;
export const DEGREE_TOP = 1;

/** Resonance and Ash credited for each duel the player's Fragment fought. */
export const DUEL_RESONANCE = 12;
export const DUEL_ASH_BONUS = 2;

/** The Vigil: earned while away, up to a cap. */
export const VIGIL_ASH_PER_HOUR = 8;
export const VIGIL_RESONANCE_PER_HOUR = 15;
export const VIGIL_CAP_HOURS = 12;

const HOUR_MS = 3_600_000;

export interface VigilState {
	ash: number;
	resonance: number;
	/** Hours counted so far (one decimal), never above capHours. */
	hours: number;
	capHours: number;
	full: boolean;
}

export interface Profile {
	degree: number;
	level: number;
	levelCap: number;
	resonance: number;
	/** Resonance still needed for the next level; 0 at the Degree's cap. */
	resonanceToNext: number;
	ash: number;
	vigil: VigilState;
}

export function clampDegree(degree: number): number {
	const d = Math.trunc(degree);
	if (!Number.isFinite(d)) return DEGREE_START;
	return Math.min(DEGREE_START, Math.max(DEGREE_TOP, d));
}

/** Highest level a Fragment may reach at this Degree: 10 at Degree 7 ... 40 at Degree 1. */
export function levelCap(degree: number): number {
	return 10 + (DEGREE_START - clampDegree(degree)) * 5;
}

/** Cumulative Resonance needed to stand at `level` (level 1 needs nothing). */
export function levelThreshold(level: number): number {
	const n = Math.max(1, Math.trunc(level));
	return Math.round(60 * (n - 1) ** 1.5);
}

/** Level for a Resonance total, capped by Degree. */
export function levelFor(resonance: number, degree: number): number {
	const cap = levelCap(degree);
	let level = 1;
	while (level < cap && resonance >= levelThreshold(level + 1)) level++;
	return level;
}

/** Resonance left until the next level, or 0 when the Degree's cap holds it back. */
export function resonanceToNext(resonance: number, degree: number): number {
	const level = levelFor(resonance, degree);
	if (level >= levelCap(degree)) return 0;
	return Math.max(0, levelThreshold(level + 1) - resonance);
}

/** What the Vigil holds at `now` (ms) when it was last emptied at `since` (ms). */
export function vigilAccrued(now: number, since: number): VigilState {
	const elapsed = Math.max(0, now - since) / HOUR_MS;
	const hours = Math.min(elapsed, VIGIL_CAP_HOURS);
	return {
		ash: Math.floor(hours * VIGIL_ASH_PER_HOUR),
		resonance: Math.floor(hours * VIGIL_RESONANCE_PER_HOUR),
		hours: Math.floor(hours * 10) / 10,
		capHours: VIGIL_CAP_HOURS,
		full: elapsed >= VIGIL_CAP_HOURS,
	};
}

/** Reward for one duel, given the Light the player's Fragment earned in it. */
export function duelReward(light: number): { ash: number; resonance: number } {
	return {
		ash: Math.max(0, Math.trunc(light)) + DUEL_ASH_BONUS,
		resonance: DUEL_RESONANCE,
	};
}

/** Build the Profile view from stored totals. */
export function profileFrom(
	row: { degree: number; resonance: number; ash: number },
	vigil: VigilState,
): Profile {
	const degree = clampDegree(row.degree);
	return {
		degree,
		level: levelFor(row.resonance, degree),
		levelCap: levelCap(degree),
		resonance: row.resonance,
		resonanceToNext: resonanceToNext(row.resonance, degree),
		ash: row.ash,
		vigil,
	};
}
