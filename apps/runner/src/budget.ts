import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ROOT } from "./config.ts";

/** SmoothSend bills each mainnet op MAX(gas cost in USD × 1.5, $0.01) (docs: billing). */
const MARKUP = 1.5;
const FLOOR_USD = 0.01;
/** Used for projections until the ledger has real ops: ~214k gas at 5 gwei, AVAX ≈ $9.75. */
const DEFAULT_OP_USD = 0.016;

interface Entry {
	t: string;
	label: string;
	gasUsed: string;
	gasCostWei: string;
}

/**
 * Append-only record of every landed op's actual gas cost, in apps/runner/.data/<network>-spend.jsonl
 * (gitignored), with a hard budget. The runner checks `canAfford` before anything that commits it to
 * a run of ops (opening a Gathering, registering Fragments) so it never starts what it can't finish.
 */
export class Budget {
	private readonly file: string;
	private entries: Entry[];

	constructor(
		network: string,
		private readonly opts: { budgetUsd?: number; avaxUsd: number },
	) {
		this.file = resolve(ROOT, `apps/runner/.data/${network}-spend.jsonl`);
		this.entries = existsSync(this.file)
			? readFileSync(this.file, "utf8")
					.split("\n")
					.filter(Boolean)
					.map((l) => JSON.parse(l) as Entry)
			: [];
	}

	billedUsd(gasCostWei: bigint) {
		const usd = (Number(gasCostWei) / 1e18) * this.opts.avaxUsd * MARKUP;
		return Math.max(usd, FLOOR_USD);
	}

	record(label: string, gasUsed: bigint, gasCostWei: bigint) {
		const e: Entry = {
			t: new Date().toISOString(),
			label,
			gasUsed: gasUsed.toString(),
			gasCostWei: gasCostWei.toString(),
		};
		mkdirSync(dirname(this.file), { recursive: true });
		appendFileSync(this.file, `${JSON.stringify(e)}\n`);
		this.entries.push(e);
	}

	get spentUsd() {
		return this.entries.reduce(
			(t, e) => t + this.billedUsd(BigInt(e.gasCostWei)),
			0,
		);
	}

	/** Average billed cost of the ops recorded so far (default before any land). */
	get opUsd() {
		return this.entries.length
			? this.spentUsd / this.entries.length
			: DEFAULT_OP_USD;
	}

	get remainingUsd() {
		return this.opts.budgetUsd === undefined
			? Number.POSITIVE_INFINITY
			: this.opts.budgetUsd - this.spentUsd;
	}

	/** `ops` ordinary ops' worth (heavier ops count as several). */
	canAfford(ops: number) {
		return ops * this.opUsd <= this.remainingUsd;
	}

	summary() {
		const budget =
			this.opts.budgetUsd === undefined
				? "no cap"
				: `$${this.remainingUsd.toFixed(2)} left of $${this.opts.budgetUsd}`;
		return `spent $${this.spentUsd.toFixed(3)} over ${this.entries.length} ops (avg $${this.opUsd.toFixed(4)}), ${budget}`;
	}
}
