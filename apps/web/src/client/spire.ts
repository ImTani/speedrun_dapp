// Spire client: the tower state and climbing a floor. Feature code calls these with useApi() so the
// preview harness can stand in (src/client/mock/spire.ts).
import type { ClimbResponse, SpireState } from "@/game/spire.ts";
import type { Api } from "./api.ts";

export type {
	ClimbResponse,
	DuelTurn,
	FloorLock,
	FloorStatus,
	SpireFloor,
	SpireState,
} from "@/game/spire.ts";

/** GET /api/spire: the current Degree's five floors and climbs left. */
export const fetchSpire = (api: Api): Promise<SpireState> =>
	api.call<SpireState>("/api/spire");

/**
 * POST /api/spire/climb. Rejects with ApiError: 429 no_attempts, 409 floor_locked | no_fragment |
 * busy, 400 invalid_floor.
 */
export const climbFloor = (api: Api, floor: number): Promise<ClimbResponse> =>
	api.call<ClimbResponse>("/api/spire/climb", {
		method: "POST",
		body: JSON.stringify({ floor }),
	});
