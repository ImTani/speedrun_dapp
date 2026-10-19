import { requireUser } from "@/server/auth.ts";
import { db } from "@/server/db.ts";
import { HttpError } from "@/server/env.ts";
import { body, handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscriptionJSON {
	endpoint?: unknown;
	keys?: { p256dh?: unknown; auth?: unknown };
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function endpointOf(v: unknown): string {
	if (typeof v !== "string" || v.length > 1024)
		throw new HttpError(400, "invalid_subscription");
	let url: URL;
	try {
		url = new URL(v);
	} catch {
		throw new HttpError(400, "invalid_subscription");
	}
	if (url.protocol !== "https:")
		throw new HttpError(400, "invalid_subscription");
	return v;
}

function key(v: unknown, max: number): string {
	if (typeof v !== "string" || v.length > max || !B64URL.test(v))
		throw new HttpError(400, "invalid_subscription");
	return v;
}

/** Saves this browser's push subscription for the signed-in player. */
export const POST = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ subscription?: SubscriptionJSON }>(request);
	const s = b.subscription ?? {};
	const endpoint = endpointOf(s.endpoint);
	const p256dh = key(s.keys?.p256dh, 256);
	const auth = key(s.keys?.auth, 64);
	await db()`insert into push_subscriptions (endpoint, privy_id, p256dh, auth)
		values (${endpoint}, ${did}, ${p256dh}, ${auth})
		on conflict (endpoint) do update set privy_id = excluded.privy_id,
			p256dh = excluded.p256dh, auth = excluded.auth`;
	return json({ ok: true }, 201);
});

/** Forgets a subscription (only the player's own). */
export const DELETE = handle(async (request) => {
	const did = await requireUser(request);
	const b = await body<{ endpoint?: unknown }>(request);
	const endpoint = endpointOf(b.endpoint);
	await db()`delete from push_subscriptions where endpoint = ${endpoint} and privy_id = ${did}`;
	return json({ ok: true });
});
