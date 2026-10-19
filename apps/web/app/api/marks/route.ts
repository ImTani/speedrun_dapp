import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { evaluateMarks, listMarks } from "@/server/marks.ts";
import { ensurePlayer } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Queues any Mark the player has newly reached, then returns the whole shelf. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	await ensurePlayer(did);
	const progress = await evaluateMarks(did);
	return json(await listMarks(did, progress));
});
