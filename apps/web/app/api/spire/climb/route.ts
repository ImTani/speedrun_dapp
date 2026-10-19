import { requireUser } from "@/server/auth.ts";
import { body, handle, json } from "@/server/http.ts";
import { climb } from "@/server/spire.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Climb one floor: {floor} -> {result, rewards, promoted?, state}.
 * 409 no_fragment | floor_locked | busy, 429 no_attempts, 400 invalid_floor.
 */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ floor?: unknown }>(request);
	return json(await climb(did, Number(b.floor)));
});
