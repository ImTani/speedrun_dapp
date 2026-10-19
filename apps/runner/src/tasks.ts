import type { Address } from "viem";
import type { Sender, SendResult } from "./sender.ts";

/**
 * Fire-and-forget scheduling for idempotent chain actions. Each loop tick re-reads chain state and
 * asks for every action still missing; this skips the ones already in flight or cooling down.
 * After a success the key is held briefly so a lagging RPC node doesn't trigger a duplicate send;
 * after a failure it backs off exponentially.
 */
export class Tasks {
	private readonly inflight = new Set<string>();
	private readonly until = new Map<string, number>();
	private readonly attempts = new Map<string, number>();

	constructor(
		private readonly sender: Sender,
		private readonly settleMs = 8_000,
	) {}

	get pending() {
		return this.inflight.size;
	}

	attemptsOf(key: string) {
		return this.attempts.get(key) ?? 0;
	}

	run(key: string, account: Address, fn: () => Promise<SendResult>): boolean {
		if (this.inflight.has(key) || this.sender.busy.has(account)) return false;
		if ((this.until.get(key) ?? 0) > Date.now()) return false;
		this.inflight.add(key);
		const n = (this.attempts.get(key) ?? 0) + 1;
		this.attempts.set(key, n);
		fn()
			.then((r) => {
				const wait = r.ok
					? this.settleMs
					: Math.min(60_000, 4_000 * 2 ** (n - 1));
				this.until.set(key, Date.now() + wait);
			})
			.catch((e) => {
				console.error(`${key}: ${(e as Error).message}`);
				this.until.set(key, Date.now() + 10_000);
			})
			.finally(() => this.inflight.delete(key));
		return true;
	}

	/** Resolves once nothing is in flight (used before exiting). */
	async drain() {
		while (this.inflight.size > 0) await sleep(500);
	}
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
