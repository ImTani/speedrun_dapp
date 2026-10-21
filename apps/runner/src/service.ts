/**
 * Long-lived Arena service: registers player Fragments, indexes Arena events into Neon, runs
 * Gatherings back to back with house and player Fragments, mints queued Marks, and sends a web push
 * when a Gathering opens.
 *
 *   pnpm --filter @arena/runner service -- [--net fuji] [--house 25] [--k 5] [--matches 1] [--conc 4] [--gap-min 0] [--max-size 60] [--until <ISO time>]
 *
 * --until: stop for good at that time. It finishes the Gathering in progress, then exits 0. Started
 * after it, the service exits 0 at once, so a Docker `--restart on-failure` container stays down.
 * SIGINT/SIGTERM exit 143 instead, so the same container comes back after a host reboot.
 *
 * Docker (build from the repo root; secrets are mounted at runtime, never baked into the image):
 *   docker build -f apps/runner/Dockerfile -t arena-runner .
 *   docker run -d --restart unless-stopped --name arena-runner \
 *     -v /path/to/.env:/app/.env:ro -v /path/to/.secrets:/app/.secrets arena-runner
 */
import { parseArgs } from "node:util";
import { arenaAbi } from "@arena/chain";
import { runBout } from "./bout.ts";
import "./db.ts";
import { fragmentsTick, syncHouse } from "./fragments.ts";
import { indexTick } from "./indexer.ts";
import { marksTick } from "./marks.ts";
import { notifyTick } from "./notify.ts";
import { createRuntime } from "./runtime.ts";
import { sleep } from "./tasks.ts";

const { values } = parseArgs({
	args: process.argv.slice(2).filter((a) => a !== "--"),
	options: {
		net: { type: "string", default: "fuji" },
		house: { type: "string", default: "25" },
		k: { type: "string", default: "5" },
		matches: { type: "string", default: "1" },
		conc: { type: "string", default: "4" },
		"gap-min": { type: "string", default: "0" },
		"max-size": { type: "string", default: "60" },
		until: { type: "string" },
	},
});

const until = values.until
	? Date.parse(values.until)
	: Number.POSITIVE_INFINITY;
if (Number.isNaN(until))
	throw new Error(`--until: not a date: ${values.until}`);
if (Date.now() >= until) {
	console.log(`past --until ${values.until}; not starting`);
	process.exit(0);
}

const rt = await createRuntime({
	network: values.net,
	houseSize: Number(values.house),
	concurrency: Number(values.conc),
});
await syncHouse(rt);

let stopping = false;
const every = (name: string, ms: number, fn: () => Promise<void>) => {
	let busy = false;
	return setInterval(async () => {
		if (busy || stopping) return;
		busy = true;
		try {
			await fn();
		} catch (e) {
			console.error(
				`${name}: ${String((e as Error).message ?? e).slice(0, 200)}`,
			);
		} finally {
			busy = false;
		}
	}, ms);
};
await fragmentsTick(rt).catch((e) =>
	console.error(`fragments: ${(e as Error).message}`),
);
const timers = [
	every("indexer", 5_000, () => indexTick(rt)),
	every("fragments", 10_000, () => fragmentsTick(rt)),
	every("marks", 60_000, () => marksTick(rt)),
	every("notify", 10_000, () => notifyTick()),
];

const shutdown = async (code: number) => {
	if (stopping) process.exit(1);
	stopping = true;
	console.log("shutting down: no new work; waiting for in-flight ops");
	for (const t of timers) clearInterval(t);
	await rt.tasks.drain();
	process.exit(code);
};
process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

const arena = rt.net.deployment.arena;
const client = rt.net.publicClient;
const gapMs = Number(values["gap-min"]) * 60_000;
let lastClose = 0;
while (!stopping) {
	if (Date.now() >= until) {
		console.log(`reached --until ${values.until}`);
		await shutdown(0);
	}
	try {
		const active = await client.readContract({
			address: arena,
			abi: arenaAbi,
			functionName: "boutActive",
		});
		if (!active && Date.now() - lastClose < gapMs) {
			await sleep(5_000);
			continue;
		}
		const states = (await Promise.all(
			rt.house.map((m) =>
				client.readContract({
					address: arena,
					abi: arenaAbi,
					functionName: "agents",
					args: [m.agent.account],
				}),
			),
		)) as unknown as [string, bigint, boolean, boolean][];
		const eligible = states.filter((s) => s[2] && !s[3]).length;
		const size = Math.min(eligible, Number(values["max-size"]));
		console.log(
			`gathering: ${active ? "resuming" : "opening"} (${size} Fragments)`,
		);
		await runBout(rt, {
			size,
			movesPerMatch: Number(values.k),
			matches: Number(values.matches),
		});
		lastClose = Date.now();
		console.log(rt.sender.budget.summary());
	} catch (e) {
		console.error(
			`scheduler: ${String((e as Error).message ?? e).slice(0, 300)}; backing off 30s`,
		);
		await sleep(30_000);
	}
}
