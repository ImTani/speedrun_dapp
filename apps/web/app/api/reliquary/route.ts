import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { reliquaryState } from "@/server/inventory.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ash, the Scrying price, pulls until a certain Relic, and the last ten Scryings. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	return json(await reliquaryState(did));
});
