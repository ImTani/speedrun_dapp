// Service worker: installable PWA, offline-tolerant shell, and web push.
//
// Caching, by request:
//  - /_next/static/* (hashed chunks, CSS, self-hosted fonts): cache-first. Only responses the server
//    marks immutable are kept, so a development server (unhashed, no-store) is never cached.
//  - /masks/*: served from cache at once and refreshed behind (stale-while-revalidate).
//  - page navigations: network-first; the last good copy answers when the network is gone.
//  - /api/* and everything else (other origins, non-GET): never touched, never cached.
// Bump VERSION to drop every cache on the next activation.
const VERSION = "v2";
const STATIC = `apostasy-static-${VERSION}`;
const PAGES = `apostasy-pages-${VERSION}`;
const KEEP = [STATIC, PAGES];
const STATIC_MAX = 240; // entries; the oldest go first

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
	e.waitUntil(
		(async () => {
			const names = await caches.keys();
			await Promise.all(
				names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)),
			);
			if (self.registration.navigationPreload)
				await self.registration.navigationPreload.enable().catch(() => {});
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (e) => {
	const req = e.request;
	if (req.method !== "GET") return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;
	if (url.pathname.startsWith("/_next/static/")) {
		e.respondWith(cacheFirst(req));
		return;
	}
	if (url.pathname.startsWith("/masks/")) {
		e.respondWith(staleWhileRevalidate(e, req));
		return;
	}
	if (req.mode === "navigate") e.respondWith(networkFirst(e, req));
});

async function cacheFirst(req) {
	const cache = await caches.open(STATIC);
	const hit = await cache.match(req);
	if (hit) return hit;
	const res = await fetch(req);
	const cc = res.headers.get("cache-control") || "";
	if (res.ok && res.type === "basic" && cc.includes("immutable")) {
		await cache.put(req, res.clone()).catch(() => {});
		void trim(cache);
	}
	return res;
}

async function staleWhileRevalidate(e, req) {
	const cache = await caches.open(STATIC);
	const hit = await cache.match(req);
	const fresh = fetch(req)
		.then(async (res) => {
			if (res.ok && res.type === "basic")
				await cache.put(req, res.clone()).catch(() => {});
			return res;
		})
		.catch(() => null);
	if (hit) {
		e.waitUntil(fresh);
		return hit;
	}
	return (await fresh) || Response.error();
}

async function networkFirst(e, req) {
	const cache = await caches.open(PAGES);
	try {
		const res = (await e.preloadResponse) || (await fetch(req));
		if (res.ok && res.type === "basic" && !res.redirected)
			e.waitUntil(cache.put(req, res.clone()).catch(() => {}));
		return res;
	} catch {
		return (
			(await cache.match(req, { ignoreSearch: true })) ||
			(await cache.match("/")) ||
			Response.error()
		);
	}
}

async function trim(cache) {
	const keys = await cache.keys();
	const over = keys.length - STATIC_MAX;
	for (let i = 0; i < over; i++) await cache.delete(keys[i]);
}

// Push payload (apps/runner/src/notify.ts): { title, body, url, tag }.
self.addEventListener("push", (e) => {
	let data = {};
	try {
		data = e.data ? e.data.json() : {};
	} catch {
		data = { body: e.data ? e.data.text() : "" };
	}
	const title = data.title || "Apostasy";
	e.waitUntil(
		self.registration.showNotification(title, {
			body: data.body || "",
			icon: "/icon.svg",
			badge: "/icon.svg",
			tag: data.tag || "apostasy",
			renotify: Boolean(data.tag),
			data: { url: data.url || "/" },
		}),
	);
});

// Tapping a notification focuses an open window of the app, or opens one, at the payload's url.
self.addEventListener("notificationclick", (e) => {
	e.notification.close();
	const target = new URL(e.notification.data?.url || "/", self.location.origin)
		.href;
	e.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((list) => {
				for (const c of list) {
					if (new URL(c.url).origin === self.location.origin && "focus" in c) {
						if ("navigate" in c && c.url !== target)
							return c.focus().then(() => c.navigate(target));
						return c.focus();
					}
				}
				return self.clients.openWindow(target);
			}),
	);
});
