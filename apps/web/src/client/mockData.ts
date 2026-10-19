// Fixture world for the dev preview harness (app/preview). Never imported by production screens.
import {
	DEFAULT_KNOBS,
	encodeConfig,
	type StrategyId,
} from "@arena/strategies";
import type {
	FragmentRow,
	GatheringEvent,
	GatheringState,
	Me,
	StandingRow,
} from "./api.ts";

/** Named states for the Claimant's own Fragment (what /api/me answers). */
export const ME_STATES = {
	loading: "The nave never answers: the waiting word stays on screen.",
	unavailable: "The nave is closed (503): the unavailable banner.",
	silent: "The nave errors (500): the no-voice banner.",
	none: "No Fragment yet: the binding flow (choose a mask, carve Sigils, name it).",
	requested: "A Fragment was asked for and stirs in the glass (dim window).",
	registered: "The Fragment awaits the Claimant's seal (seal button live).",
	failed: "The binding broke.",
	confirmed:
		"Bound Fragment with Light and duels, Sigils shown, re-carve open.",
	"confirmed-dark": "Bound Fragment that has lost Light (negative Light).",
	"confirmed-locked":
		"Bound Fragment while a Gathering is underway (re-carving locked).",
} as const;
export type MeState = keyof typeof ME_STATES;

/** Named states for /api/gathering (and /api/standings). */
export const GATHERING_STATES = {
	commit: "Active Gathering, Fragments sealing their choices; countdown runs.",
	reveal:
		"Active Gathering, choices unveiled; two fresh duels arrive every poll (queue speeds up).",
	between: "Active Gathering, between tolls of the bell.",
	closed: "Gathering ended: the waiting word over the last result.",
	empty: "No Gathering has ever been held: the waiting word and hint.",
	vision:
		"The nave is silent (503 on reads): the screen falls back to its own vision.",
} as const;
export type GatheringStateName = keyof typeof GATHERING_STATES;

export const isMeState = (s: string): s is MeState => s in ME_STATES;
export const isGatheringState = (s: string): s is GatheringStateName =>
	s in GATHERING_STATES;

/** The Claimant's own Fragment address in the fixture world. */
export const SELF_AGENT = "0x000000000000000000000000000000000000c0de";

const NAMES = [
	"Old Marrow",
	"Vesper",
	"Saint Ossery",
	"Gallow",
	"Lady Cinder",
	"The Pale Fool",
	"Brother Ash",
	"Wick",
	"Mother Hollow",
	"Thorn of Ninefold",
	"Censer",
	"The Weeping Abbot",
	"Lantern-Eater",
	"Sister Vellum",
	"Gloam",
	"Rook",
	"The Tithe",
	"Candlewright",
	"Bellmouth",
	"Grey Penitent",
	"Ossuary Jack",
	"Lachryma",
	"Saint Sallow",
	"The Unshriven",
];

const agentOf = (i: number) =>
	`0x${(0xa000 + i).toString(16).padStart(40, "0")}`;

/** 24 rivals plus the Claimant's own Fragment: 25 rows, every Aspect represented. */
export function mockStandings(self?: {
	name: string;
	aspect: number;
	light: number;
	duels: number;
}): StandingRow[] {
	const rows: StandingRow[] = NAMES.map((name, i) => ({
		agent: agentOf(i),
		name,
		aspect: (i * 3) % 7,
		light: 96 - i * 7 + ((i * 13) % 5),
		duels: 6 + ((i * 5) % 9),
	}));
	rows.push(
		self
			? { agent: SELF_AGENT, ...self }
			: { agent: agentOf(99), name: "", aspect: 6, light: -9, duels: 3 },
	);
	return rows.sort((a, b) => b.light - a.light);
}

export function configFor(aspect: number): string {
	return encodeConfig({
		strategy: aspect as StrategyId,
		knobs: { ...DEFAULT_KNOBS, forgiveness: 20, retaliation: 2, noise: 5 },
	}).toString();
}

export function fragmentRow(
	status: FragmentRow["status"],
	aspect: number,
	name = "Saint Gloria of the Ash",
): FragmentRow {
	return {
		id: 7,
		status,
		agent: status === "requested" ? null : SELF_AGENT,
		config: configFor(aspect),
		name,
		error: status === "failed" ? "binding failed" : null,
	};
}

export function initialMe(state: MeState, aspect: number): Me {
	const base: Me = {
		account: "0x00000000000000000000000000000000c1a1a1a1",
		fragment: null,
		boutActive: false,
	};
	switch (state) {
		case "requested":
		case "registered":
		case "failed":
			return { ...base, fragment: fragmentRow(state, aspect) };
		case "confirmed":
		case "confirmed-dark":
			return { ...base, fragment: fragmentRow("confirmed", aspect) };
		case "confirmed-locked":
			return {
				...base,
				fragment: fragmentRow("confirmed", aspect),
				boutActive: true,
			};
		default:
			return base;
	}
}

// ---------- the Gathering ----------

const PARTICIPANTS = 8;
const pts = (m: number, o: number) =>
	m === 0 ? (o === 0 ? 3 : 0) : o === 0 ? 5 : 1;

/** Deterministic move for duel n, side s: a mix of kindling, devouring and ruin. */
const moveOf = (n: number, s: 0 | 1) => {
	const pattern = [
		[1, 0],
		[0, 0],
		[1, 1],
		[0, 1],
		[0, 0],
		[1, 0],
		[0, 0],
		[1, 1],
	][n % 8] as [number, number];
	return pattern[s];
};

/**
 * A stateful fixture Gathering. Each call to next() returns the current snapshot; in the
 * reveal state every call also unveils two more duels so the screen's queue fills up.
 */
export function createGatheringSource(
	state: GatheringStateName,
	selfAspect: number,
	includeSelf: boolean,
) {
	const rows = mockStandings();
	const participants = rows.slice(0, PARTICIPANTS).map((r) => ({
		agent: r.agent,
		name: r.name,
		aspect: r.aspect,
	}));
	if (includeSelf)
		participants[PARTICIPANTS - 1] = {
			agent: SELF_AGENT,
			name: "Saint Gloria of the Ash",
			aspect: selfAspect,
		};
	const at = (i: number) => participants[i % PARTICIPANTS]?.agent ?? "";

	let block = 100;
	const events: GatheringEvent[] = [];
	const push = (
		name: string,
		round: number | null,
		agent: string | null,
		data: Record<string, unknown> = {},
		logIndex = 0,
	) =>
		events.push({
			block: block++,
			logIndex,
			tx: `0x${block.toString(16).padStart(64, "0")}`,
			name,
			gathering: "3",
			round,
			agent,
			data,
		});

	let duel = 0;
	const unveilDuel = (round: number) => {
		const x = (duel * 2) % PARTICIPANTS;
		const y = (x + 1 + (duel % 3)) % PARTICIPANTS;
		const ma = moveOf(duel, 0);
		const mb = moveOf(duel, 1);
		push("Revealed", round, at(x), { move: String(ma) });
		push("Revealed", round, at(y), { move: String(mb) });
		push("PairScored", round, at(x), {
			agentA: at(x),
			agentB: at(y),
			moveA: String(ma),
			moveB: String(mb),
			pointsA: String(pts(ma, mb)),
			pointsB: String(pts(mb, ma)),
			forfeit: false,
		});
		duel++;
	};
	const sealAll = (round: number) => {
		for (let i = 0; i < PARTICIPANTS; i++) push("Committed", round, at(i));
	};

	if (state !== "empty" && state !== "vision") {
		push("BoutOpened", null, null);
		push("RoundStarted", 0, null);
		sealAll(0);
		for (let i = 0; i < 4; i++) unveilDuel(0);
		push("RoundStarted", 1, null);
		sealAll(1);
		if (state !== "commit") for (let i = 0; i < 3; i++) unveilDuel(1);
		if (state === "closed") {
			for (let i = 0; i < 1; i++) unveilDuel(1);
			push("BoutClosed", null, null);
		}
	}

	const t0 = Math.floor(Date.now() / 1000);
	const phase =
		state === "commit" ? "commit" : state === "reveal" ? "reveal" : "between";

	return {
		next(): GatheringState {
			if (state === "reveal" && duel < 64) {
				unveilDuel(1);
				unveilDuel(1);
			}
			if (state === "empty")
				return { active: false, gathering: null, events: [] };
			// deadlines roll forward so the countdown never runs dry while reviewing
			const now = Math.floor(Date.now() / 1000);
			const cycle = 90;
			const commitDeadline = now + cycle - ((now - t0) % cycle);
			return {
				active: state !== "closed",
				gathering: {
					id: "3",
					round: 1,
					rounds: 6,
					movesPerMatch: 3,
					phase,
					commitDeadline,
					revealDeadline: commitDeadline + 45,
					participants: participants.map((p) => ({ ...p })),
				},
				events: events.slice(),
			};
		},
	};
}
