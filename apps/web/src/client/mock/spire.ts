// Preview mock for the Spire routes. Import for its side effect.
//
// The world is picked from the preview URL on first request: `state` when `screen=spire`, otherwise
// a `spire` param (default "mid"). `aspect=0..6` sets the Claimant's Fragment, and `outcome=win|lose`
// forces how each climb ends (otherwise the real duel decides). Call resetMockSpire() to switch.
import { decodeConfig } from "@arena/strategies";
import { levelCap } from "@/game/economy.ts";
import {
	ATTEMPTS_MAX,
	attemptsNow,
	BOSS_FLOOR,
	type ClimbResponse,
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
import { ApiError } from "../api.ts";
import { configFor, fragmentRow } from "../mockData.ts";
import { registerMockRoute } from "../mockRoutes.ts";
import { mockGrant } from "./economy.ts";

const HOUR = 3_600_000;

interface MockTower {
	degree: number;
	cleared: number;
	level: number;
	attempts: number;
	attemptsAt: number;
	runs: number;
	bound: boolean;
}

/** Preview worlds for the Spire tab. */
export const SPIRE_STATES = {
	fresh: "Degree VII, nothing cleared, five climbs.",
	mid: "Degree VI, two floors cleared, three climbs (one returning).",
	"boss-locked":
		"Degree V, four floors cleared, the Remnant locked behind the level cap.",
	"boss-ready":
		"Degree V, four floors cleared, at the level cap: the Remnant is open.",
	spent: "Degree VI, no climbs left (the next returns in under two hours).",
	summit: "Degree I, every floor cleared: replays only.",
	unbound: "No Fragment bound: the tower shows, climbing is closed.",
} as const;
export type SpireStateName = keyof typeof SPIRE_STATES;

function world(name: SpireStateName): MockTower {
	const now = Date.now();
	const base = {
		attempts: ATTEMPTS_MAX,
		attemptsAt: now,
		runs: 0,
		bound: true,
	};
	switch (name) {
		case "fresh":
			return { ...base, degree: 7, cleared: 0, level: 3 };
		case "boss-locked":
			return {
				...base,
				degree: 5,
				cleared: 4,
				level: 17,
				attempts: 4,
				attemptsAt: now - HOUR,
			};
		case "boss-ready":
			return {
				...base,
				degree: 5,
				cleared: 4,
				level: levelCap(5),
				attempts: 2,
				attemptsAt: now - 2 * HOUR,
			};
		case "spent":
			return {
				...base,
				degree: 6,
				cleared: 3,
				level: 13,
				attempts: 0,
				attemptsAt: now - 3 * HOUR,
			};
		case "summit":
			return { ...base, degree: 1, cleared: FLOORS, level: levelCap(1) };
		case "unbound":
			return { ...base, degree: 7, cleared: 0, level: 1, bound: false };
		default:
			return {
				...base,
				degree: 6,
				cleared: 2,
				level: 12,
				attempts: 3,
				attemptsAt: now - 1.5 * HOUR,
			};
	}
}

const isState = (s: string | null): s is SpireStateName =>
	!!s && s in SPIRE_STATES;

function fromUrl(): {
	name: SpireStateName;
	aspect: number;
	outcome: "win" | "lose" | null;
} {
	const p = new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	);
	const raw = p.get("screen") === "spire" ? p.get("state") : p.get("spire");
	const aspect = Math.max(
		0,
		Math.min(6, Math.trunc(Number(p.get("aspect") ?? 2)) || 0),
	);
	const o = p.get("outcome");
	return {
		name: isState(raw) ? raw : "mid",
		aspect: p.has("aspect") ? aspect : 2,
		outcome: o === "win" || o === "lose" ? o : null,
	};
}

let tower: MockTower | null = null;
let aspect = 2;
let forced: "win" | "lose" | null = null;

/** Switch the mock to a named world (defaults read from the URL). */
export function resetMockSpire(
	name?: SpireStateName,
	opts: { aspect?: number; outcome?: "win" | "lose" | null } = {},
) {
	const url = fromUrl();
	tower = world(name ?? url.name);
	aspect = opts.aspect ?? url.aspect;
	forced = opts.outcome !== undefined ? opts.outcome : url.outcome;
}

function current(): MockTower {
	if (!tower) resetMockSpire();
	return tower as MockTower;
}

function view(t: MockTower): SpireState {
	const cap = levelCap(t.degree);
	const level = Math.min(t.level, cap);
	const a = attemptsNow(t.attempts, t.attemptsAt, Date.now());
	return {
		degree: t.degree,
		summit: t.degree === 1 && t.cleared >= FLOORS,
		level,
		levelCap: cap,
		attempts: { left: a.left, max: ATTEMPTS_MAX, nextAt: nextAttemptAt(a) },
		fragment: t.bound
			? { name: fragmentRow("confirmed", aspect).name, aspect }
			: null,
		floors: floorsFor(t.degree, t.cleared, level, cap),
	};
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

registerMockRoute("/api/spire", async () => {
	await wait(250);
	return view(current());
});

registerMockRoute(
	"/api/spire/climb",
	async (_path, body): Promise<ClimbResponse> => {
		await wait(450);
		const t = current();
		const floor = Number((body as { floor?: unknown } | undefined)?.floor);
		if (!Number.isInteger(floor) || floor < 1 || floor > FLOORS)
			throw new ApiError(400, "invalid_floor");
		if (!t.bound) throw new ApiError(409, "no_fragment");
		const before = view(t);
		const target = before.floors[floor - 1];
		if (!target || target.status === "locked")
			throw new ApiError(409, "floor_locked");
		const now = Date.now();
		const spent = spendAttempt(attemptsNow(t.attempts, t.attemptsAt, now), now);
		if (!spent) throw new ApiError(429, "no_attempts");

		const mine = decodeConfig(BigInt(configFor(aspect)));
		const remnant = remnantAt(t.degree, floor);
		// The real duel; a forced outcome tries later attempts until one ends that way.
		let runs = t.runs + 1;
		let result = duel(
			mine,
			remnant,
			climbSeed("preview", t.degree, floor, runs),
		);
		for (
			let i = 0;
			forced && i < 200 && result.won !== (forced === "win");
			i++
		) {
			runs++;
			result = duel(mine, remnant, climbSeed("preview", t.degree, floor, runs));
		}

		let next: MockTower = {
			...t,
			attempts: spent.left,
			attemptsAt: spent.at,
			runs,
		};
		let first = false;
		let promoted: { degree: number } | undefined;
		let rewards = { ash: 0, resonance: 0 };
		if (result.won) {
			first = floor > t.cleared;
			rewards = floorReward(t.degree, floor, !first);
			mockGrant(rewards);
			if (first) next = { ...next, cleared: floor };
			if (first && floor === BOSS_FLOOR && t.degree > 1) {
				promoted = { degree: t.degree - 1 };
				next = { ...next, degree: t.degree - 1, cleared: 0 };
			}
		}
		tower = next;
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
			state: view(next),
		};
	},
	"POST",
);
