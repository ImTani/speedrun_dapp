import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { scryOnce } from "@/server/inventory.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One Scrying for 100 Ash. 402 not_enough_ash when the purse is short. */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	return json(await scryOnce(did));
});
