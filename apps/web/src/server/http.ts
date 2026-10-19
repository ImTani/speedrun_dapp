import { ConfigError, HttpError } from "./env.ts";

/** JSON response; bigints become decimal strings. */
export function json(body: unknown, status = 200): Response {
	return new Response(
		JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
		{ status, headers: { "content-type": "application/json" } },
	);
}

export function fail(e: unknown): Response {
	if (e instanceof HttpError) return json({ error: e.code }, e.status);
	if (e instanceof ConfigError) return json({ error: "unavailable" }, 503);
	console.error("[api]", e);
	return json({ error: "internal" }, 500);
}

/** Wraps a handler so thrown errors become JSON responses. */
export function handle(
	fn: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
	return async (request) => {
		try {
			return await fn(request);
		} catch (e) {
			return fail(e);
		}
	};
}

export async function body<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		throw new HttpError(400, "bad_json");
	}
}
