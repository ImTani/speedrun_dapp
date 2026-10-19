import { requireUser } from "@/server/auth.ts";
import { claimVigil } from "@/server/economy.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Empty the Vigil into the purse. Returns {profile, gained: {ash, resonance}}. */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	return json(await claimVigil(did));
});
