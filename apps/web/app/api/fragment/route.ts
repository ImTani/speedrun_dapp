import { requireUser } from "@/server/auth.ts";
import { CHAIN_ID } from "@/server/chain.ts";
import { parseConfig } from "@/server/config.ts";
import { db } from "@/server/db.ts";
import { HttpError } from "@/server/env.ts";
import { body, handle, json } from "@/server/http.ts";
import { ensurePlayer, fragmentOf } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ name?: unknown; config?: unknown }>(request);
	const name = typeof b.name === "string" ? b.name.trim() : "";
	if (name.length < 1 || name.length > 24)
		throw new HttpError(400, "invalid_name");
	const config = parseConfig(b.config);
	const player = await ensurePlayer(did);
	if (await fragmentOf(player.account))
		throw new HttpError(409, "already_bound");
	const rows =
		await db()`insert into fragments (chain_id, owner_account, config, name)
		values (${CHAIN_ID}, ${player.account}, ${config.toString()}, ${name})
		on conflict (chain_id, owner_account) do nothing returning id`;
	if (rows.length === 0) throw new HttpError(409, "already_bound");
	return json({ fragment: await fragmentOf(player.account) }, 201);
});
