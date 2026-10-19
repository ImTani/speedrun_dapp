import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { scryOnce } from "@/server/inventory.ts";
import { requireUnlocked } from "@/server/state.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One Scrying for 100 Ash. 402 not_enough_ash when the purse is short, 403 locked. */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	await requireUnlocked(did, "reliquary");
	return json(await scryOnce(did));
});
