import { arenaAbi } from "@arena/chain";
import { type Address, encodeFunctionData, type Hex } from "viem";
import { packById } from "@/game/vestry.ts";
import { prepareOp } from "@/server/aa.ts";
import { requireUser } from "@/server/auth.ts";
import { ARENA, boutActive } from "@/server/chain.ts";
import { parseConfig } from "@/server/config.ts";
import { HttpError } from "@/server/env.ts";
import { body, handle, json } from "@/server/http.ts";
import { buyCall, getInventory, ownedPacks } from "@/server/inventory.ts";
import { ensurePlayer, fragmentOf } from "@/server/player.ts";
import { requireUnlocked } from "@/server/state.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ action?: unknown; config?: unknown; pack?: unknown }>(
		request,
	);
	const player = await ensurePlayer(did);
	if (b.action === "buy") {
		// Vestry: cosmetics are the player's, so no Fragment is needed to buy.
		const pack = packById(b.pack);
		if (!pack) throw new HttpError(400, "invalid_pack");
		await requireUnlocked(did, "vestry");
		const { items } = await getInventory(did);
		if (ownedPacks(items).includes(pack.id)) throw new HttpError(409, "owned");
		return json(await prepareOp(player.eoa, buyCall(pack)));
	}
	const fragment = await fragmentOf(player.account);
	if (!fragment) throw new HttpError(404, "no_fragment");
	let data: Hex;
	if (b.action === "confirm") {
		if (fragment.status !== "registered" || !fragment.agent)
			throw new HttpError(409, "not_ready");
		data = encodeFunctionData({
			abi: arenaAbi,
			functionName: "confirmAgent",
			args: [fragment.agent as Address],
		});
	} else if (b.action === "retune") {
		const config = parseConfig(b.config);
		if (fragment.status !== "confirmed") throw new HttpError(409, "not_ready");
		await requireUnlocked(did, "retune");
		if (await boutActive()) throw new HttpError(409, "gathering_active");
		data = encodeFunctionData({
			abi: arenaAbi,
			functionName: "retune",
			args: [config],
		});
	} else {
		throw new HttpError(400, "invalid_action");
	}
	const out = await prepareOp(player.eoa, { to: ARENA, data });
	return json(out);
});
