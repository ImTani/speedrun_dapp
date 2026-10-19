import { opStatus } from "@/server/aa.ts";
import { HttpError } from "@/server/env.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (request) => {
	const hash = new URL(request.url).searchParams.get("hash") ?? "";
	if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
		throw new HttpError(400, "invalid_hash");
	return json(await opStatus(hash));
});
