/**
 * Mock handlers for `api.call()` in the dev preview harness. Feature modules register their
 * routes here (in src/client/mock/<feature>.ts) and the MockApiProvider serves them; production
 * never imports this. A handler gets the path (with query) and the parsed JSON body.
 */
export type MockHandler = (
	path: string,
	body: unknown,
	method: string,
) => unknown | Promise<unknown>;

const routes: { prefix: string; method: string; handler: MockHandler }[] = [];

/** Register a handler for requests whose path starts with `prefix` (longest prefix wins). */
export function registerMockRoute(
	prefix: string,
	handler: MockHandler,
	method = "GET",
) {
	routes.push({ prefix, method: method.toUpperCase(), handler });
	routes.sort((a, b) => b.prefix.length - a.prefix.length);
}

export async function serveMock<T>(path: string, init: RequestInit = {}): Promise<T> {
	const method = (init.method ?? "GET").toUpperCase();
	const route = routes.find((r) => path.startsWith(r.prefix) && r.method === method);
	if (!route) throw new Error(`no mock route for ${method} ${path}`);
	const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
	return (await route.handler(path, body, method)) as T;
}
