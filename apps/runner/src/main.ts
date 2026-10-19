/**
 * Arena runner.
 *
 *   pnpm --filter @arena/runner start -- setup  [--net fuji] [--house 25]
 *   pnpm --filter @arena/runner start -- bout   [--net fuji] [--house 25] [--size 25] [--k 5] [--matches 1] [--conc 4]
 *
 * Mainnet (--net avalanche) also requires --budget-usd and --avax-usd: the runner keeps a ledger of
 * every landed op's gas cost and won't start a Gathering or registrations the budget can't cover.
 *   pnpm --filter @arena/runner start -- report <boutId> [--net fuji]
 *   pnpm --filter @arena/runner start -- status [--net fuji]
 *
 * `bout` resumes the active bout if there is one, otherwise opens a new one, and exits when it closes.
 */
import { parseArgs } from "node:util";
import { arenaAbi } from "@arena/chain";
import { runBout } from "./bout.ts";
import { reportBout } from "./report.ts";
import { createRuntime } from "./runtime.ts";
import { setupHouse } from "./setup.ts";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2).filter((a) => a !== "--"),
	allowPositionals: true,
	options: {
		net: { type: "string", default: "fuji" },
		house: { type: "string", default: "25" },
		size: { type: "string" },
		k: { type: "string", default: "5" },
		matches: { type: "string", default: "1" },
		conc: { type: "string", default: "4" },
		"budget-usd": { type: "string" },
		"avax-usd": { type: "string" },
	},
});
const [cmd = "status", arg] = positionals;
const houseSize = Number(values.house);

const rt = await createRuntime({
	network: values.net,
	houseSize,
	concurrency: Number(values.conc),
	budgetUsd: values["budget-usd"] ? Number(values["budget-usd"]) : undefined,
	avaxUsd: values["avax-usd"] ? Number(values["avax-usd"]) : undefined,
});

if (cmd === "setup") {
	await setupHouse(rt);
} else if (cmd === "bout") {
	await runBout(rt, {
		size: Number(values.size ?? houseSize),
		movesPerMatch: Number(values.k),
		matches: Number(values.matches),
	});
} else if (cmd === "report") {
	if (!arg) throw new Error("usage: report <boutId>");
	await reportBout(rt, BigInt(arg));
} else if (cmd === "status") {
	const read = (functionName: "boutActive" | "boutCount") =>
		rt.net.publicClient.readContract({
			address: rt.net.deployment.arena,
			abi: arenaAbi,
			functionName,
		});
	const states = await Promise.all(
		rt.house.map((m) =>
			rt.net.publicClient.readContract({
				address: rt.net.deployment.arena,
				abi: arenaAbi,
				functionName: "agents",
				args: [m.agent.account],
			}),
		),
	);
	console.log(
		JSON.stringify({
			network: rt.net.name,
			arena: rt.net.deployment.arena,
			operator: rt.operator.account,
			boutCount: Number(await read("boutCount")),
			boutActive: await read("boutActive"),
			house: rt.house.length,
			registered: states.filter(
				(s) => s[0] !== "0x0000000000000000000000000000000000000000",
			).length,
			confirmed: states.filter((s) => s[2]).length,
			suspended: states.filter((s) => s[3]).length,
		}),
	);
} else {
	throw new Error(`unknown command ${cmd}`);
}
