"use client";

// Web push: "tell me when a Gathering opens". enable() must run from a tap (browsers only show
// the permission prompt for a user gesture). The runner sends the pushes (apps/runner/src/notify.ts).
import { useCallback, useEffect, useState } from "react";
import type { Api } from "./api.ts";

/** unsupported: no push here (on iOS, until the app is on the Home Screen); denied: blocked. */
export type PushState = "unsupported" | "denied" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function supported(): boolean {
	return (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window &&
		PUBLIC_KEY.length > 0
	);
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
	const b64 = (b64url + "=".repeat((4 - (b64url.length % 4)) % 4))
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const raw = atob(b64);
	const out = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
	const existing = await navigator.serviceWorker.getRegistration();
	if (!existing) await navigator.serviceWorker.register("/sw.js");
	return navigator.serviceWorker.ready;
}

/** Current state without prompting. */
export async function pushState(): Promise<PushState> {
	if (!supported()) return "unsupported";
	if (Notification.permission === "denied") return "denied";
	const reg = await navigator.serviceWorker.getRegistration();
	const sub = await reg?.pushManager.getSubscription();
	return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Ask permission, subscribe and register with the server. Call from a tap. */
export async function enable(api: Api): Promise<PushState> {
	if (!supported()) return "unsupported";
	const permission = await Notification.requestPermission();
	if (permission === "denied") return "denied";
	if (permission !== "granted") return "off";
	const reg = await registration();
	const sub =
		(await reg.pushManager.getSubscription()) ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: keyBytes(PUBLIC_KEY),
		}));
	await api.call("/api/push/subscribe", {
		method: "POST",
		body: JSON.stringify({ subscription: sub.toJSON() }),
	});
	return "on";
}

/** Unsubscribe this browser and tell the server to forget it. */
export async function disable(api: Api): Promise<PushState> {
	if (!supported()) return "unsupported";
	const reg = await navigator.serviceWorker.getRegistration();
	const sub = await reg?.pushManager.getSubscription();
	if (sub) {
		await api
			.call("/api/push/subscribe", {
				method: "DELETE",
				body: JSON.stringify({ endpoint: sub.endpoint }),
			})
			.catch(() => {});
		await sub.unsubscribe();
	}
	return Notification.permission === "denied" ? "denied" : "off";
}

/** State plus tap handlers for a notifications toggle. `failed` is set when enabling threw. */
export function usePush(api: Api) {
	const [state, setState] = useState<PushState | null>(null);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let live = true;
		pushState()
			.then((s) => live && setState(s))
			.catch(() => live && setState("unsupported"));
		return () => {
			live = false;
		};
	}, []);

	const run = useCallback(
		async (fn: (api: Api) => Promise<PushState>) => {
			setBusy(true);
			setFailed(false);
			try {
				setState(await fn(api));
			} catch {
				setFailed(true);
			} finally {
				setBusy(false);
			}
		},
		[api],
	);

	return {
		state,
		busy,
		failed,
		enable: () => run(enable),
		disable: () => run(disable),
	};
}
