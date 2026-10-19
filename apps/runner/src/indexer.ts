import { arenaAbi } from "@arena/chain";
import { decodeEventLog, type Log } from "viem";
import { CHAIN_ID, sql } from "./db.ts";
import type { Runtime } from "./runtime.ts";

const CHUNK = 100n;
const MAX_CHUNKS = 20;
const PARALLEL = 4;

const plain = (v: unknown): unknown =>
	typeof v === "bigint"
		? v.toString()
		: Array.isArray(v)
			? v.map(plain)
			: v && typeof v === "object"
				? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
				: v;

/** One indexer tick: scans up to MAX_CHUNKS×100 blocks of Arena logs into arena_events. */
export async function indexTick(rt: Runtime) {
	const client = rt.net.publicClient;
	const arena = rt.net.deployment.arena;
	const st =
		(await sql`select last_block from indexer_state where chain_id = ${CHAIN_ID}`) as {
			last_block: string;
		}[];
	const from = st[0]
		? BigInt(st[0].last_block) + 1n
		: BigInt(rt.net.deployment.block);
	const latest = (await client.getBlockNumber()) - 1n;
	if (latest < from) return;
	const ranges: [bigint, bigint][] = [];
	for (let a = from; a <= latest && ranges.length < MAX_CHUNKS; a += CHUNK) {
		const b = a + CHUNK - 1n;
		ranges.push([a, b > latest ? latest : b]);
	}
	const logs: Log[] = [];
	for (let i = 0; i < ranges.length; i += PARALLEL) {
		const batch = await Promise.all(
			ranges
				.slice(i, i + PARALLEL)
				.map(([fromBlock, toBlock]) =>
					client.getLogs({ address: arena, fromBlock, toBlock }),
				),
		);
		for (const l of batch) logs.push(...l);
	}
	for (const log of logs) {
		let ev: { eventName: string; args: unknown };
		try {
			ev = decodeEventLog({
				abi: arenaAbi,
				data: log.data,
				topics: log.topics,
			}) as never;
		} catch {
			continue;
		}
		const args = (ev.args ?? {}) as Record<string, unknown>;
		const gathering = args.boutId === undefined ? null : String(args.boutId);
		const round = args.round === undefined ? null : Number(args.round);
		const agent = typeof args.agent === "string" ? args.agent : null;
		await sql`insert into arena_events (chain_id, block, log_index, tx, name, gathering, round, agent, data)
			values (${CHAIN_ID}, ${String(log.blockNumber)}, ${log.logIndex}, ${log.transactionHash},
				${ev.eventName}, ${gathering}, ${round}, ${agent}, ${JSON.stringify(plain(args))}::jsonb)
			on conflict do nothing`;
	}
	const last = (ranges.at(-1) as [bigint, bigint])[1];
	await sql`insert into indexer_state (chain_id, last_block) values (${CHAIN_ID}, ${String(last)})
		on conflict (chain_id) do update set last_block = excluded.last_block`;
	if (logs.length)
		console.log(`indexer: ${logs.length} events through block ${last}`);
}
