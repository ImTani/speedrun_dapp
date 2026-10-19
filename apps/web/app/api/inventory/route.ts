import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { getInventory } from "@/server/inventory.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** {items: owned item ids, equipped: {finish, tint, title}} */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	return json(await getInventory(did));
});
