// Preview mock for GET /api/state and POST /api/onboarding. Import for its side effect.
// Six worlds (STATE_PREVIEWS); resetMockState(name) picks one and resets the economy, Marks and
// wardrobe mocks to match. Without a reset the world is `late` (everything open), so existing
// previews keep every tab. linkMockMe() lets the harness feed the live /api/me fixture in, so
// binding and sealing in the preview move the state along.
import { levelThreshold } from "@/game/economy.ts";
import type { MarksResponse } from "@/game/marks.ts";
import { NOTHING_EQUIPPED } from "@/game/reliquary.ts";
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
	type UnlockId,
	unlockedIds,
	withKept,
} from "@/game/unlocks.ts";
import { ApiError, type Me } from "../api.ts";
import { initialMe, type MeState } from "../mockData.ts";
import { registerMockRoute, serveMock } from "../mockRoutes.ts";
import { mockProfile, resetMockEconomy } from "./economy.ts";
import { resetMockInventory } from "./inventory.ts";
import { resetMockMarks } from "./marks.ts";

/** Named worlds for /api/state (dev-facing descriptions). */
export const STATE_PREVIEWS = {
	fresh: "No Fragment yet: only the Fragment tab, onboarding at the mask.",
	stirring:
		"Fragment asked for and stirring; onboarding at practice. Awaits the seal after 4 s.",
	sealable: "Fragment awaits the seal: Gathering just opened (fresh).",
	early: "Sealed, no duels yet: Gathering and Vigil open, Vigil fresh.",
	mid: "Six duels, level 4: Retune and Spire just opened (fresh).",
	late: "Everything open, onboarding done, nothing fresh.",
} as const;
export type StatePreviewName = keyof typeof STATE_PREVIEWS;
export const isStatePreview = (s: string): s is StatePreviewName =>
	s in STATE_PREVIEWS;

interface Preset {
	me: MeState;
	duels: number;
	level: number;
	degree: number;
	ash: number;
	vigilHours: number;
	spireClears: number;
	scries: number;
	step: OnboardingStep | null;
	done: boolean;
	acked: UnlockId[];
}

const PRESETS: Record<StatePreviewName, Preset> = {
	fresh: {
		me: "none",
		duels: 0,
		level: 1,
		degree: 7,
		ash: 0,
		vigilHours: 0,
		spireClears: 0,
		scries: 0,
		step: "mask",
		done: false,
		acked: ["fragment"],
	},
	stirring: {
		me: "requested",
		duels: 0,
		level: 1,
		degree: 7,
		ash: 0,
		vigilHours: 0,
		spireClears: 0,
		scries: 0,
		step: "practice",
		done: false,
		acked: ["fragment"],
	},
	sealable: {
		me: "registered",
		duels: 0,
		level: 1,
		degree: 7,
		ash: 0,
		vigilHours: 0,
		spireClears: 0,
		scries: 0,
		step: "seal",
		done: false,
		acked: ["fragment"],
	},
	early: {
		me: "confirmed",
		duels: 0,
		level: 1,
		degree: 7,
		ash: 0,
		vigilHours: 2,
		spireClears: 0,
		scries: 0,
		step: "gathering",
		done: false,
		acked: ["fragment", "gathering"],
	},
	mid: {
		me: "confirmed",
		duels: 6,
		level: 4,
		degree: 7,
		ash: 60,
		vigilHours: 5,
		spireClears: 0,
		scries: 0,
		step: null,
		done: true,
		acked: ["fragment", "gathering", "vigil"],
	},
	late: {
		me: "confirmed",
		duels: 23,
		level: 12,
		degree: 6,
		ash: 340,
		vigilHours: 7,
		spireClears: 7,
		scries: 4,
		step: null,
		done: true,
		acked: [
			"fragment",
			"gathering",
			"vigil",
			"retune",
			"spire",
			"marks",
			"reliquary",
			"vestry",
		],
	},
};

interface World {
	name: StatePreviewName;
	me: Me;
	/** When the fixture Fragment was asked for (it wakes 4 s later). */
	stirredAt: number;
	duels: number;
	spireClears: number;
	scries: number;
	step: OnboardingStep | null;
	done: boolean;
	acked: UnlockId[];
	/** Sticky, like the server. */
	unlocked: UnlockId[];
}

const HOUR = 3_600_000;

function build(name: StatePreviewName, aspect: number): World {
	const p = PRESETS[name];
	return {
		name,
		me: initialMe(p.me, aspect),
		stirredAt: Date.now(),
		duels: p.duels,
		spireClears: p.spireClears,
		scries: p.scries,
		step: p.step,
		done: p.done,
		acked: [...p.acked],
		unlocked: [],
	};
}

let world = build("late", 2);
let linkedMe: (() => Promise<Me>) | null = null;

/**
 * Pick a world. Also resets the economy, Marks and wardrobe mocks so every screen agrees
 * (`late` restores their default fixtures).
 */
export function resetMockState(
	name: StatePreviewName = "late",
	opts: { aspect?: number } = {},
) {
	const p = PRESETS[name];
	world = build(name, Math.max(0, Math.min(6, Math.trunc(opts.aspect ?? 2))));
	if (name === "late") {
		resetMockEconomy();
		resetMockMarks();
		resetMockInventory();
		return;
	}
	resetMockEconomy({
		degree: p.degree,
		resonance: levelThreshold(p.level) + 10,
		ash: p.ash,
		vigilSince: Date.now() - p.vigilHours * HOUR,
	});
	resetMockMarks({ empty: true });
	resetMockInventory({ items: [], equipped: { ...NOTHING_EQUIPPED } });
}

/** Read /api/me from the harness's live fixture instead of this world's own (null unlinks). */
export function linkMockMe(source: (() => Promise<Me>) | null) {
	linkedMe = source;
}

/** Bump the world's counters (e.g. a preview playing a duel or a Scrying). */
export function mockStateFacts(
	patch: Partial<Pick<World, "duels" | "spireClears" | "scries">>,
) {
	world = { ...world, ...patch };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function meNow(): Promise<Me> {
	if (linkedMe) return linkedMe();
	const f = world.me.fragment;
	if (f?.status === "requested" && Date.now() - world.stirredAt > 4000)
		world = {
			...world,
			me: {
				...world.me,
				fragment: {
					...f,
					status: "registered",
					agent: "0x000000000000000000000000000000000000c0de",
				},
			},
		};
	return structuredClone(world.me);
}

const marksEarned = (m: MarksResponse) =>
	m.marks.reduce(
		(n, k) =>
			n +
			k.tiers.filter((t) => t.state === "earned" || t.state === "sealed")
				.length,
		0,
	);
const marksTotal = (m: MarksResponse) =>
	m.marks.reduce((n, k) => n + k.tiers.length, 0);

registerMockRoute("/api/state", async (): Promise<GameState> => {
	await wait(150);
	const [me, marks, inv] = await Promise.all([
		meNow(),
		serveMock<MarksResponse>("/api/marks"),
		serveMock<{ equipped: { finish: string | null; title: string | null } }>(
			"/api/inventory",
		),
	]);
	const profile = mockProfile();
	const status = me.fragment?.status ?? null;
	const earned = marksEarned(marks);
	const unlocks = withKept(
		computeUnlocks({
			status,
			duels: world.duels,
			level: profile.level,
			degree: profile.degree,
			ash: profile.ash,
			spireClears: world.spireClears,
			scries: world.scries,
			marksEarned: earned,
		}),
		world.unlocked,
	);
	world = { ...world, unlocked: unlockedIds(unlocks) };
	let step = world.step;
	if (step && PRE_BIND_STEPS.includes(step) && status && status !== "failed")
		step =
			status === "requested"
				? "practice"
				: status === "registered"
					? "seal"
					: "gathering";
	return {
		me,
		profile,
		unlocks,
		fresh: freshUnlocks(unlocks, world.acked),
		onboarding: { step: world.done ? null : step, done: world.done },
		marks: { earned, total: marksTotal(marks) },
		equipped: { finish: inv.equipped.finish, title: inv.equipped.title },
	};
});

registerMockRoute(
	"/api/onboarding",
	async (_path, body): Promise<OnboardingResponse> => {
		await wait(120);
		const b = (body ?? {}) as { step?: unknown; done?: unknown; ack?: unknown };
		if (b.step !== undefined && b.step !== null && !isOnboardingStep(b.step))
			throw new ApiError(400, "invalid_step");
		if (b.done !== undefined && typeof b.done !== "boolean")
			throw new ApiError(400, "invalid_done");
		if (
			b.ack !== undefined &&
			(!Array.isArray(b.ack) || !b.ack.every(isUnlockId))
		)
			throw new ApiError(400, "invalid_ack");
		const ack = ((b.ack as UnlockId[] | undefined) ?? []).filter((id) =>
			world.unlocked.includes(id),
		);
		const done = b.done === undefined ? world.done : (b.done as boolean);
		const step =
			b.done === true
				? null
				: b.step !== undefined
					? (b.step as OnboardingStep | null)
					: world.step;
		world = {
			...world,
			done,
			step,
			acked: [...new Set([...world.acked, ...ack])],
		};
		return {
			onboarding: { step: world.done ? null : world.step, done: world.done },
			fresh: UNLOCK_IDS.filter(
				(id) =>
					id !== "fragment" &&
					world.unlocked.includes(id) &&
					!world.acked.includes(id),
			),
		};
	},
	"POST",
);
