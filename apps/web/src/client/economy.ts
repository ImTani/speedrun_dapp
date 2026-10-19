// Economy client: the player's Degree, level, Resonance, Ash and Vigil.
import { levelThreshold, type Profile } from "@/game/economy.ts";
import type { Api } from "./api.ts";

export type { Profile, VigilState } from "@/game/economy.ts";
export {
	levelCap,
	levelThreshold,
	VIGIL_CAP_HOURS,
} from "@/game/economy.ts";

export interface VigilClaim {
	profile: Profile;
	gained: { ash: number; resonance: number };
}

/** GET /api/profile. The server credits finished Gathering duels before answering. */
export const fetchProfile = (api: Api): Promise<Profile> =>
	api.call<Profile>("/api/profile");

/** POST /api/vigil/claim: empty the Vigil into the purse. */
export const claimVigil = (api: Api): Promise<VigilClaim> =>
	api.call<VigilClaim>("/api/vigil/claim", { method: "POST", body: "{}" });

/** Share of the way from this level to the next, 0..1 (1 when the Degree caps the level). */
export function levelProgress(p: Profile): number {
	if (p.level >= p.levelCap || p.resonanceToNext <= 0) return 1;
	const floor = levelThreshold(p.level);
	const span = levelThreshold(p.level + 1) - floor;
	return span > 0 ? Math.min(1, Math.max(0, (p.resonance - floor) / span)) : 0;
}
