import { LINKS } from "@/legal/config.ts";
import { deletePlayerData } from "@/server/account.ts";
import { requireUser } from "@/server/auth.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes every off-chain record of the signed-in player, in one transaction (src/server/account.ts).
 * -> {deleted: true, kept: [...], privy}. On-chain records are public and permanent, and the Privy
 * sign-in account is Privy's: neither is deleted here. 401 unauthorized.
 */
export const DELETE = handle(async (request) => {
	const did = await requireUser(request);
	await deletePlayerData(did);
	return json({
		deleted: true,
		kept: ["on_chain_records", "privy_account"],
		privy: { help: LINKS.privyHelp, email: LINKS.privySupport },
	});
});
