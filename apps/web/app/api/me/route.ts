import type { Address } from "viem";
import { requireUser } from "@/server/auth.ts";
import { agentConfirmed, boutActive } from "@/server/chain.ts";
import { db } from "@/server/db.ts";
import { handle, json } from "@/server/http.ts";
import { ensurePlayer, fragmentOf } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request) => {
	const did = await requireUser(request);
	const player = await ensurePlayer(did);
	const fragment = await fragmentOf(player.account);
	if (fragment?.status === "registered" && fragment.agent) {
		const ok = await agentConfirmed(fragment.agent as Address).catch(
			() => false,
		);
		if (ok) {
			await db()`update fragments set status = 'confirmed', confirmed_at = now()
				where id = ${fragment.id} and status = 'registered'`;
			fragment.status = "confirmed";
		}
	}
	const active = await boutActive().catch(() => false);
	return json({ account: player.account, fragment, boutActive: active });
});
