import { requireUser } from "@/server/auth.ts";
import { body, handle, json } from "@/server/http.ts";
import { claimPurchase, getInventory } from "@/server/inventory.ts";
import { ensurePlayer } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grant the pack a landed payment op bought. Body {userOpHash, pack?}; the paid amount names the
 * pack, so `pack` is only a hint (the preview mock uses it). 409 pending while the op is in flight,
 * 409 op_failed when it reverted, 403 no_payment / not_yours when the chain shows no payment.
 */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ userOpHash?: unknown }>(request);
	const player = await ensurePlayer(did);
	const claimed = await claimPurchase(
		did,
		player.account,
		typeof b.userOpHash === "string" ? b.userOpHash : "",
	);
	return json({ ...claimed, inventory: await getInventory(did) });
});
