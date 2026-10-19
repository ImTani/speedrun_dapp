// Preview mock for the economy routes: a mid-game Claimant. Import for its side effect.
import {
	levelThreshold,
	type Profile,
	profileFrom,
	vigilAccrued,
} from "@/game/economy.ts";
import { registerMockRoute } from "../mockRoutes.ts";

const HOUR = 3_600_000;

interface MockPurse {
	degree: number;
	resonance: number;
	ash: number;
	vigilSince: number;
}

/** Degree 6 (cap 15), level 12 a little past its threshold, 340 Ash, Vigil 7 hours in. */
function fresh(): MockPurse {
	return {
		degree: 6,
		resonance: levelThreshold(12) + 140,
		ash: 340,
		vigilSince: Date.now() - 7 * HOUR,
	};
}

let purse = fresh();

/** Restore the starting purse (each preview link can call this for a clean world). */
export function resetMockEconomy(over: Partial<MockPurse> = {}) {
	purse = { ...fresh(), ...over };
}

/** Spend from the mock purse (other features' mocks use this); false when short. */
export function mockSpend(ash: number): boolean {
	if (purse.ash < ash) return false;
	purse = { ...purse, ash: purse.ash - ash };
	return true;
}

/** Credit the mock purse (other features' mocks use this). */
export function mockGrant(g: { ash?: number; resonance?: number }) {
	purse = {
		...purse,
		ash: purse.ash + (g.ash ?? 0),
		resonance: purse.resonance + (g.resonance ?? 0),
	};
}

export function mockProfile(): Profile {
	return profileFrom(purse, vigilAccrued(Date.now(), purse.vigilSince));
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

registerMockRoute("/api/profile", async () => {
	await wait(200);
	return mockProfile();
});

registerMockRoute(
	"/api/vigil/claim",
	async () => {
		await wait(500);
		const now = Date.now();
		const v = vigilAccrued(now, purse.vigilSince);
		purse = {
			...purse,
			ash: purse.ash + v.ash,
			resonance: purse.resonance + v.resonance,
			vigilSince: now,
		};
		return {
			profile: mockProfile(),
			gained: { ash: v.ash, resonance: v.resonance },
		};
	},
	"POST",
);
