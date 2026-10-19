import type { UserOperationAvax } from "@smoothsend/sdk/avax";
import type { Hex } from "viem";
import { checkOp, submitOp } from "@/server/aa.ts";
import { requireUser } from "@/server/auth.ts";
import { HttpError } from "@/server/env.ts";
import { body, handle, json } from "@/server/http.ts";
import { ensurePlayer } from "@/server/player.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ userOp?: UserOperationAvax; signature?: unknown }>(
		request,
	);
	if (
		!b.userOp ||
		typeof b.userOp !== "object" ||
		typeof b.signature !== "string" ||
		!/^0x[0-9a-fA-F]+$/.test(b.signature)
	)
		throw new HttpError(400, "invalid_op");
	const player = await ensurePlayer(did);
	checkOp(b.userOp, player.account);
	const userOpHash = await submitOp(player.eoa, b.userOp, b.signature as Hex);
	return json({ userOpHash });
});
