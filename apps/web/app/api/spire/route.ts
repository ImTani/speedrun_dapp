import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { spireState } from "@/server/spire.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The current Degree's five floors, climbs left, and the Fragment that climbs. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	return json(await spireState(did));
});
