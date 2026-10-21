/**
 * One-off: index a network's Arena events into Postgres and sync its house Fragment rows, without
 * sending any transaction. Used to backfill the mainnet Conclave for /api/stats.
 *
 *   tsx scripts/backfill.ts --net avalanche --house 13
 */
import { parseArgs } from "node:util";
import { sql } from "../src/db.ts";
import { syncHouse } from "../src/fragments.ts";
import { indexTick } from "../src/indexer.ts";
import { createRuntime } from "../src/runtime.ts";

const { values } = parseArgs({
	args: process.argv.slice(2).filter((a) => a !== "--"),
	options: {
		net: { type: "string", default: "avalanche" },
		house: { type: "string", default: "13" },
	},
});
// Mainnet runtimes require a budget; nothing here sends an op, so a token value is fine.
const rt = await createRuntime({
	network: values.net,
	houseSize: Number(values.house),
	concurrency: 1,
	budgetUsd: 0.01,
	avaxUsd: 1,
});
await syncHouse(rt);
const chain = rt.net.chain.id;
for (;;) {
	await indexTick(rt);
	const [st] =
		(await sql`select last_block from indexer_state where chain_id = ${chain}`) as {
			last_block: string;
		}[];
	const latest = await rt.net.publicClient.getBlockNumber();
	const left = latest - 1n - BigInt(st?.last_block ?? 0);
	console.log(`indexed to ${st?.last_block}, ${left} blocks left`);
	if (left <= 2n) break;
}
const counts =
	await sql`select name, count(*)::int as n from arena_events where chain_id = ${chain} group by name order by n desc`;
console.log(JSON.stringify(counts));
process.exit(0);
