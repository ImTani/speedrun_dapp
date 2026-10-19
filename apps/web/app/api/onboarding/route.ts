import { requireUser } from "@/server/auth.ts";
import { body, handle, json } from "@/server/http.ts";
import { updateOnboarding } from "@/server/state.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * {step?, done?, ack?} -> {onboarding, fresh}. `done: true` clears the step; `ack` marks fresh
 * unlocks as shown. 400 invalid_step | invalid_done | invalid_ack, 503 before migration 005.
 */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ step?: unknown; done?: unknown; ack?: unknown }>(
		request,
	);
	return json(await updateOnboarding(did, b ?? {}));
});
