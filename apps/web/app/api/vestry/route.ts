import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";
import { getInventory, ownedPacks, usdcBalance } from "@/server/inventory.ts";
import { ensurePlayer } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The player's test USDC (null when the chain is silent) and the packs they own. */
export const GET = handle(async (request) => {
	const did = await requireUser(request);
	const player = await ensurePlayer(did);
	const [usdc, inv] = await Promise.all([
		usdcBalance(player.account),
		getInventory(did),
	]);
	return json({ usdc, owned: ownedPacks(inv.items) });
});
