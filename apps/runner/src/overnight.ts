/**
 * Unattended Conclave run: scheduled Gatherings until the spend guard says stop, then exit.
 *
 *   tsx src/overnight.ts --net avalanche --house 13 --k 3 --budget-usd 8 --avax-usd 9.84
 *     [--every-min 45] [--max-hours 10] [--max-errors 5] [--conc 4]
 *
 * Every transaction is a game action: house setup (idempotent), then Gatherings on a fixed
 * schedule (open, start/finalize each toll, each Fragment's sealed choice and its unveiling,
 * close). Stops when the next Gathering wouldn't fit the budget, when SmoothSend reports the
 * credits are spent, after too many consecutive errors, or at the wall-clock cap. Writes a
 * report to apps/runner/.data/<net>-overnight.json and exits; nothing is left running.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runBout } from "./bout.ts";
import { ROOT } from "./config.ts";
import { createRuntime } from "./runtime.ts";
import { setupHouse } from "./setup.ts";
import { sleep } from "./tasks.ts";

const { values } = parseArgs({
	args: process.argv.slice(2).filter((a) => a !== "--"),
	options: {
		net: { type: "string", default: "avalanche" },
		house: { type: "string", default: "13" },
		k: { type: "string", default: "3" },
		conc: { type: "string", default: "4" },
		"budget-usd": { type: "string" },
		"avax-usd": { type: "string" },
		"every-min": { type: "string", default: "45" },
		"max-hours": { type: "string", default: "10" },
		"max-errors": { type: "string", default: "5" },
	},
});

const houseSize = Number(values.house);
const everyMs = Number(values["every-min"]) * 60_000;
const deadline = Date.now() + Number(values["max-hours"]) * 3_600_000;
const maxErrors = Number(values["max-errors"]);
const reportFile = resolve(
	ROOT,
	`apps/runner/.data/${values.net}-overnight.json`,
);

const rt = await createRuntime({
	network: values.net,
	houseSize,
	concurrency: Number(values.conc),
	budgetUsd: values["budget-usd"] ? Number(values["budget-usd"]) : undefined,
	avaxUsd: values["avax-usd"] ? Number(values["avax-usd"]) : undefined,
});

const report = {
	network: values.net,
	startedAt: new Date().toISOString(),
	endedAt: "",
	stopReason: "",
	gatherings: [] as { boutId: string; startedAt: string; seconds: number }[],
	errors: [] as string[],
	ops: rt.sender.stats,
	spend: "",
};
const save = () => {
	report.spend = rt.sender.budget.summary();
	mkdirSync(dirname(reportFile), { recursive: true });
	writeFileSync(reportFile, JSON.stringify(report, null, 2));
};

let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
	process.on(sig, () => {
		console.log(`${sig}: finishing the current step, then stopping`);
		stopping = true;
	});
}

const stamp = () => new Date().toISOString().slice(11, 19);

async function main() {
	await setupHouse(rt); // no-op once all house Fragments are confirmed
	let errors = 0;
	while (!stopping) {
		if (Date.now() > deadline) return "wall-clock cap reached";
		const t0 = Date.now();
		try {
			console.log(
				`${stamp()} Gathering ${report.gatherings.length + 1} opening`,
			);
			const boutId = await runBout(rt, {
				size: houseSize,
				movesPerMatch: Number(values.k),
				matches: 1,
			});
			report.gatherings.push({
				boutId: boutId.toString(),
				startedAt: new Date(t0).toISOString(),
				seconds: Math.round((Date.now() - t0) / 1000),
			});
			errors = 0;
			save();
		} catch (e) {
			const msg = (e as Error).message ?? String(e);
			if (msg.startsWith("budget:")) return `budget reached (${msg})`;
			if (/402|insufficient credit|credits/i.test(msg))
				return `SmoothSend credits exhausted (${msg})`;
			errors++;
			report.errors.push(`${new Date().toISOString()} ${msg.slice(0, 300)}`);
			save();
			console.error(`${stamp()} error ${errors}/${maxErrors}: ${msg}`);
			if (errors >= maxErrors)
				return `stopped after ${errors} consecutive errors`;
			await sleep(60_000);
			continue;
		}
		// The next Gathering on the schedule: one every `everyMs`, measured from this one's start.
		const wait = Math.max(0, t0 + everyMs - Date.now());
		console.log(
			`${stamp()} next Gathering in ${Math.round(wait / 60_000)} min (${rt.sender.budget.summary()})`,
		);
		const until = Date.now() + wait;
		while (!stopping && Date.now() < until) await sleep(5_000);
	}
	return "stopped by signal";
}

report.stopReason = await main().catch((e) => `fatal: ${(e as Error).message}`);
await rt.tasks.drain();
report.endedAt = new Date().toISOString();
save();
console.log(`${stamp()} done: ${report.stopReason}`);
console.log(`gatherings: ${report.gatherings.length}; ${report.spend}`);
process.exit(0);
