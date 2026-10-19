import { requireUser } from "@/server/auth.ts";
import { getProfile, settleGatherings } from "@/server/economy.ts";
import { handle, json } from "@/server/http.ts";
import { ensurePlayer } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The player's economy. Credits any unsettled Gathering duels first. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	await ensurePlayer(did);
	await settleGatherings(did);
	return json(await getProfile(did));
});
