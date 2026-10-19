import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { meFor } from "@/server/state.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** {account, fragment, boutActive}. A registered Fragment the chain confirmed is promoted. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	return json(await meFor(did));
});
