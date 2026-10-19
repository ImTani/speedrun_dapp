import { requireUser } from "@/server/auth.ts";
import { body, handle, json } from "@/server/http.ts";
import { equip } from "@/server/inventory.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Body {finish?, tint?, title?}: an owned item id per slot, or null for the default. */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<Record<string, unknown>>(request);
	const patch: Record<string, unknown> = {};
	for (const slot of ["finish", "tint", "title"] as const)
		if (b && typeof b === "object" && slot in b) patch[slot] = b[slot];
	return json(await equip(did, patch));
});
