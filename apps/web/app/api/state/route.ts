import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { gameState } from "@/server/state.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the shell needs in one read: {me, profile, unlocks, fresh, onboarding, marks,
 * equipped}. Credits finished Gathering duels first, like /api/profile.
 */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	return json(await gameState(did));
});
