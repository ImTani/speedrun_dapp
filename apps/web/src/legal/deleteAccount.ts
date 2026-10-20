import type { Api } from "@/client/api.ts";

export interface DeleteAccountResult {
	deleted: true;
	/** What this does not delete: public on-chain records and the Privy sign-in account. */
	kept: ("on_chain_records" | "privy_account")[];
	privy: { help: string; email: string };
}

/** DELETE /api/account: removes the signed-in player's off-chain data. Rejects with ApiError. */
export function deleteAccount(
	api: Pick<Api, "call">,
): Promise<DeleteAccountResult> {
	return api.call<DeleteAccountResult>("/api/account", { method: "DELETE" });
}

/** This device's own copies of game data: settings, hints and pending claims. Best effort. */
export function clearLocalGameData(): void {
	try {
		const doomed: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (
				k &&
				(k.startsWith("apostasy") ||
					k.startsWith("arena.") ||
					k.startsWith("vestry."))
			)
				doomed.push(k);
		}
		for (const k of doomed) localStorage.removeItem(k);
	} catch {}
}

/** Unsubscribes this browser from game notifications. Best effort; never throws. */
export async function unsubscribePush(): Promise<void> {
	try {
		if (!("serviceWorker" in navigator)) return;
		const reg = await navigator.serviceWorker.getRegistration();
		const sub = await reg?.pushManager.getSubscription();
		await sub?.unsubscribe();
	} catch {}
}
