import { arenaAbi } from "@arena/chain";
import { decodeConfig, StrategyId } from "@arena/strategies";
import type { Address } from "viem";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import type { Runtime } from "./runtime.ts";

// The public Avalanche RPC rejects eth_getLogs spans over 100 blocks.
const CHUNK = 100n;
const PARALLEL = 8;

/** Runs `fetch` over [from, to] in CHUNK-sized spans, PARALLEL at a time, results in block order. */
async function chunked<T>(
	from: bigint,
	to: bigint,
	fetch: (from: bigint, to: bigint) => Promise<T[]>,
): Promise<T[]> {
	const spans: [bigint, bigint][] = [];
	for (let f = from; f <= to; f += CHUNK) {
		spans.push([f, f + CHUNK - 1n < to ? f + CHUNK - 1n : to]);
	}
	const out: T[][] = [];
	for (let i = 0; i < spans.length; i += PARALLEL) {
		out.push(
			...(await Promise.all(
				spans.slice(i, i + PARALLEL).map(([f, t]) => fetch(f, t)),
			)),
		);
	}
	return out.flat();
}

const STRATEGY_NAME = Object.fromEntries(
	Object.entries(StrategyId).map(([k, v]) => [v, k]),
);

/**
 * What a bout actually put on chain, read from logs rather than from the runner's own counters:
 * UserOps (EntryPoint UserOperationEvent from the operator and participants between BoutOpened and
 * BoutClosed) and the on-chain transactions that carried them, reported separately (PLAN M2 gate).
 */
export async function reportBout(rt: Runtime, boutId: bigint) {
	const client = rt.net.publicClient;
	const arena = rt.net.deployment.arena;
	const latest = await client.getBlockNumber();

	// Walk back from the head, a window at a time, until BoutOpened for this bout turns up.
	const WINDOW = CHUNK * BigInt(PARALLEL);
	const deployBlock = BigInt(rt.net.deployment.block);
	let openBlock: bigint | undefined;
	let closeBlock: bigint | undefined;
	let openArgs:
		| { agents?: readonly Address[]; movesPerMatch?: number; matches?: number }
		| undefined;
	for (
		let to = latest;
		to >= deployBlock && openBlock === undefined;
		to -= WINDOW
	) {
		const from =
			to - WINDOW + 1n > deployBlock ? to - WINDOW + 1n : deployBlock;
		const [opened, closed] = await Promise.all(
			(["BoutOpened", "BoutClosed"] as const).map((eventName) =>
				chunked(from, to, (f, t) =>
					client.getContractEvents({
						address: arena,
						abi: arenaAbi,
						eventName,
						args: { boutId },
						fromBlock: f,
						toBlock: t,
					}),
				),
			),
		);
		closeBlock ??= closed?.[0]?.blockNumber ?? undefined;
		openBlock = opened?.[0]?.blockNumber ?? undefined;
		openArgs = (opened?.[0] as { args?: typeof openArgs } | undefined)?.args;
	}
	if (openBlock === undefined)
		throw new Error(`BoutOpened(${boutId}) not found`);
	const end = closeBlock ?? latest;

	// Arena's views only describe the latest bout, so the shape comes from BoutOpened.
	const participants = openArgs?.agents ?? [];
	const k = openArgs?.movesPerMatch ?? 0;
	const matches = openArgs?.matches ?? 0;
	const operator = rt.net.deployment.operator;
	const senders = [operator, ...participants];

	const ops: {
		sender: Address;
		tx: string;
		success: boolean;
		gas: bigint;
		cost: bigint;
	}[] = [];
	const logs = await chunked(openBlock, end, (f, t) =>
		client.getContractEvents({
			address: entryPoint07Address,
			abi: entryPoint07Abi,
			eventName: "UserOperationEvent",
			args: { sender: senders },
			fromBlock: f,
			toBlock: t,
		}),
	);
	for (const l of logs) {
		ops.push({
			sender: l.args.sender as Address,
			tx: l.transactionHash,
			success: l.args.success ?? false,
			gas: l.args.actualGasUsed ?? 0n,
			cost: l.args.actualGasCost ?? 0n,
		});
	}

	const n = participants.length;
	const paired = n - (n % 2);
	const rounds = k * matches;
	const expected = { agent: paired * 2 * rounds, lifecycle: 2 + 2 * rounds };
	const agentOps = ops.filter((o) => o.sender !== operator);
	const lifecycleOps = ops.filter((o) => o.sender === operator);
	const txs = new Map<string, number>();
	for (const o of ops) txs.set(o.tx, (txs.get(o.tx) ?? 0) + 1);
	const perTx = new Map<number, number>();
	for (const c of txs.values()) perTx.set(c, (perTx.get(c) ?? 0) + 1);
	const totalGas = ops.reduce((t, o) => t + o.gas, 0n);
	const totalCost = ops.reduce((t, o) => t + o.cost, 0n);

	// Points from PairScored, since storage only keeps the latest bout's totals.
	const scored = await chunked(openBlock, end, (f, t) =>
		client.getContractEvents({
			address: arena,
			abi: arenaAbi,
			eventName: "PairScored",
			args: { boutId },
			fromBlock: f,
			toBlock: t,
		}),
	);
	const byAgent = new Map<string, number>();
	for (const e of scored) {
		const a = e.args;
		for (const [who, pts] of [
			[a.agentA, a.pointsA],
			[a.agentB, a.pointsB],
		] as const) {
			if (who) byAgent.set(who, (byAgent.get(who) ?? 0) + Number(pts ?? 0));
		}
	}
	const points = participants.map((a) => byAgent.get(a) ?? 0);
	const configs = await Promise.all(
		participants.map((a) =>
			client.readContract({
				address: arena,
				abi: arenaAbi,
				functionName: "agents",
				args: [a],
			}),
		),
	);

	console.log(
		JSON.stringify(
			{
				boutId: Number(boutId),
				blocks: [Number(openBlock), Number(end)],
				closed: closeBlock !== undefined,
				shape: { agents: n, paired, movesPerMatch: k, matches },
				userOps: {
					total: ops.length,
					agent: agentOps.length,
					lifecycle: lifecycleOps.length,
					reverted: ops.filter((o) => !o.success).length,
					expected: { ...expected, total: expected.agent + expected.lifecycle },
				},
				transactions: {
					total: txs.size,
					opsPerTx: Object.fromEntries([...perTx].sort((a, b) => a[0] - b[0])),
				},
				gas: {
					totalActualGasUsed: Number(totalGas),
					avgPerOp: ops.length ? Number(totalGas / BigInt(ops.length)) : 0,
					totalActualGasCostAvax: Number(totalCost) / 1e18,
				},
			},
			null,
			2,
		),
	);
	const table = participants
		.map((a, i) => ({
			i,
			house: rt.byAccount.get(a)?.index ?? "-",
			strategy:
				STRATEGY_NAME[
					decodeConfig((configs[i] as readonly unknown[])[1] as bigint).strategy
				],
			points: Number(points[i]),
		}))
		.sort((x, y) => y.points - x.points);
	for (const r of table) {
		console.log(
			`  ${String(r.points).padStart(3)}  #${r.house}  ${r.strategy}`,
		);
	}
}
