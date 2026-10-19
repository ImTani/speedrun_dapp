// Minimal service worker: installable PWA, network-first passthrough, and web push.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
	if (e.request.method !== "GET") return;
	e.respondWith(
		fetch(e.request).catch(() =>
			caches.match(e.request).then((r) => r || Response.error()),
		),
	);
});

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
