// Marks catalog: pure data shared by the web app, the preview mocks and the runner (which imports
// this file by relative path). No imports and no I/O here. Display names live in lexicon/marks.ts.

/** What a Mark counts. Each is a number that only grows. */
export type MarkMetric =
	| "degree" // Degrees climbed above the Seventh (0..6)
	| "gatherings" // Gatherings the Fragment fought in
	| "devours" // moves that took
	| "kindles" // moves that gave
	| "spire"; // Spire floors cleared

export type MarkKey =
	| "degree"
	| "firstGathering"
	| "devourer"
	| "kindler"
	| "spire"
	| "steadfast"
	| "firstOfTheFirst";

export interface MarkTier {
	/** On-chain tier byte. */
	tier: number;
	/** The metric must reach this to earn the tier. */
	need: number;
}

export interface MarkDef {
	kind: number;
	key: MarkKey;
	metric: MarkMetric;
	tiers: readonly MarkTier[];
	/** Stigmata: 1-of-1 across all players (Badges.setUnique; tier must be 0). */
	unique: boolean;
}

/** Kinds 1..99 are tiered Marks; 100+ are Stigmata. */
export const MARKS: readonly MarkDef[] = [
	{
		kind: 1,
		key: "degree",
		metric: "degree",
		// Tier = the Degree reached: Sixth (one climb) up to First (six climbs).
		tiers: [6, 5, 4, 3, 2, 1].map((tier) => ({ tier, need: 7 - tier })),
		unique: false,
	},
	{
		kind: 2,
		key: "firstGathering",
		metric: "gatherings",
		tiers: [{ tier: 1, need: 1 }],
		unique: false,
	},
	{
		kind: 3,
		key: "devourer",
		metric: "devours",
		tiers: [
			{ tier: 1, need: 10 },
			{ tier: 2, need: 50 },
			{ tier: 3, need: 200 },
		],
		unique: false,
	},
	{
		kind: 4,
		key: "kindler",
		metric: "kindles",
		tiers: [
			{ tier: 1, need: 10 },
			{ tier: 2, need: 50 },
			{ tier: 3, need: 200 },
		],
		unique: false,
	},
	{
		kind: 5,
		key: "spire",
		metric: "spire",
		tiers: [
			{ tier: 1, need: 5 },
			{ tier: 2, need: 15 },
			{ tier: 3, need: 30 },
		],
		unique: false,
	},
	{
		kind: 6,
		key: "steadfast",
		metric: "gatherings",
		tiers: [
			{ tier: 1, need: 5 },
			{ tier: 2, need: 20 },
			{ tier: 3, need: 50 },
		],
		unique: false,
	},
	{
		kind: 100,
		key: "firstOfTheFirst",
		metric: "degree",
		tiers: [{ tier: 0, need: 6 }],
		unique: true,
	},
];

export type MarkProgress = Record<MarkMetric, number>;

export const EMPTY_PROGRESS: MarkProgress = {
	degree: 0,
	gatherings: 0,
	devours: 0,
	kindles: 0,
	spire: 0,
};

/** Badges.badgeId(kind, tier). */
export function markId(kind: number, tier: number): bigint {
	return (BigInt(kind) << 8n) | BigInt(tier & 0xff);
}

export function markDef(kind: number): MarkDef | undefined {
	return MARKS.find((m) => m.kind === kind);
}

/** Every (kind, tier) the progress has reached. Stigmata are included; the caller checks they are free. */
export function earnedTiers(
	progress: MarkProgress,
): { kind: number; tier: number; unique: boolean }[] {
	const out: { kind: number; tier: number; unique: boolean }[] = [];
	for (const m of MARKS)
		for (const t of m.tiers)
			if (progress[m.metric] >= t.need)
				out.push({ kind: m.kind, tier: t.tier, unique: m.unique });
	return out;
}

/** locked: not reached; earned: queued for sealing; sealed: on-chain; taken: a Stigma held by someone else. */
export type MarkState = "locked" | "earned" | "sealed" | "taken";

export interface MarkTierView {
	tier: number;
	need: number;
	state: MarkState;
	/** Transaction hash once sealed (for a block-explorer link). */
	tx: string | null;
}

export interface MarkView {
	kind: number;
	key: MarkKey;
	unique: boolean;
	/** Current value of the Mark's metric. */
	have: number;
	tiers: MarkTierView[];
}

/** GET /api/marks */
export interface MarksResponse {
	progress: MarkProgress;
	marks: MarkView[];
}

/** Builds the shelf from progress and the player's rows. Shared by the server and the mocks. */
export function marksView(
	progress: MarkProgress,
	held: readonly {
		kind: number;
		tier: number;
		status: "queued" | "minted";
		tx: string | null;
	}[],
	taken: readonly { kind: number; tier: number }[] = [],
): MarksResponse {
	const key = (k: number, t: number) => `${k}:${t}`;
	const mine = new Map(held.map((h) => [key(h.kind, h.tier), h]));
	const others = new Set(taken.map((t) => key(t.kind, t.tier)));
	return {
		progress,
		marks: MARKS.map((m) => ({
			kind: m.kind,
			key: m.key,
			unique: m.unique,
			have: progress[m.metric],
			tiers: m.tiers.map((t) => {
				const h = mine.get(key(m.kind, t.tier));
				const state: MarkState = h
					? h.status === "minted"
						? "sealed"
						: "earned"
					: others.has(key(m.kind, t.tier))
						? "taken"
						: "locked";
				return { tier: t.tier, need: t.need, state, tx: h?.tx ?? null };
			}),
		})),
	};
}
