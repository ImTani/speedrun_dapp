// Fake Gathering used when the API is unavailable (503 / offline), so the stage still plays.
import type { GatheringResponse, StandingsResponse } from "./types.ts";

const F = [
	{
		agent: "0x00000000000000000000000000000000000000a1",
		name: "Old Marrow",
		aspect: 6,
	},
	{
		agent: "0x00000000000000000000000000000000000000b2",
		name: "Vesper",
		aspect: 2,
	},
	{
		agent: "0x00000000000000000000000000000000000000c3",
		name: "Saint Ossery",
		aspect: 0,
	},
	{
		agent: "0x00000000000000000000000000000000000000d4",
		name: "Gallow",
		aspect: 1,
	},
	{
		agent: "0x00000000000000000000000000000000000000e5",
		name: "Lady Cinder",
		aspect: 3,
	},
	{
		agent: "0x00000000000000000000000000000000000000f6",
		name: "The Pale Fool",
		aspect: 4,
	},
] as const;

const a = (i: number) => F[i % F.length]?.agent ?? "";
// [A, B, moveA, moveB] per duel; points follow the classic table: 3/3, 5/0, 0/5, 1/1
const DUELS: [number, number, number, number][] = [
	[0, 1, 1, 0],
	[2, 3, 0, 0],
	[4, 5, 1, 1],
	[1, 2, 0, 1],
	[3, 0, 0, 0],
	[5, 4, 1, 0],
];
const pts = (m: number, o: number) =>
	m === 0 ? (o === 0 ? 3 : 0) : o === 0 ? 5 : 1;

export function fixtureGathering(): GatheringResponse {
	const events: GatheringResponse["events"] = [
		{
			block: 1,
			logIndex: 0,
			tx: "0x0",
			name: "BoutOpened",
			gathering: "1",
			round: null,
			agent: null,
			data: {},
		},
		{
			block: 2,
			logIndex: 0,
			tx: "0x0",
			name: "RoundStarted",
			gathering: "1",
			round: 0,
			agent: null,
			data: {},
		},
	];
	let b = 3;
	for (const i of [0, 1, 2, 3, 4, 5])
		events.push({
			block: b++,
			logIndex: 0,
			tx: "0x0",
			name: "Committed",
			gathering: "1",
			round: 0,
			agent: a(i),
			data: {},
		});
	DUELS.forEach(([x, y, mx, my], i) => {
		events.push({
			block: b,
			logIndex: 0,
			tx: "0x0",
			name: "Revealed",
			gathering: "1",
			round: 0,
			agent: a(x),
			data: { move: String(mx) },
		});
		events.push({
			block: b,
			logIndex: 1,
			tx: "0x0",
			name: "Revealed",
			gathering: "1",
			round: 0,
			agent: a(y),
			data: { move: String(my) },
		});
		events.push({
			block: b,
			logIndex: 2 + i,
			tx: `0xf${i}`,
			name: "PairScored",
			gathering: "1",
			round: 0,
			agent: a(x),
			data: {
				agentA: a(x),
				agentB: a(y),
				moveA: String(mx),
				moveB: String(my),
				pointsA: String(pts(mx, my)),
				pointsB: String(pts(my, mx)),
				forfeit: false,
			},
		});
		b++;
	});
	const now = Math.floor(Date.now() / 1000);
	return {
		active: true,
		gathering: {
			id: "1",
			round: 1,
			rounds: 6,
			movesPerMatch: 3,
			phase: "commit",
			commitDeadline: now + 40 - (now % 40),
			revealDeadline: now + 80 - (now % 40),
			participants: F.map((f) => ({ ...f })),
		},
		events,
	};
}

export function fixtureStandings(): StandingsResponse {
	return {
		rows: F.map((f, i) => ({
			agent: f.agent,
			name: f.name,
			aspect: f.aspect,
			light: 40 - i * 6,
			duels: 12,
		})),
	};
}
