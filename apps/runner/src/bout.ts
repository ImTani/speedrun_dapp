import { arenaAbi } from "@arena/chain";
import {
	type AgentConfig,
	decide,
	decodeConfig,
	Move,
	pairings,
	type Turn,
} from "@arena/strategies";
import { type Address, encodeFunctionData, type Hex } from "viem";
import { commitmentFor, saltFor } from "./house.ts";
import type { HouseMember, Runtime } from "./runtime.ts";
import { sleep } from "./tasks.ts";

interface Entry {
	commitment: Hex;
	move: number;
	revealed: boolean;
	scored: boolean;
}
const ZERO32 = `0x${"0".repeat(64)}`;

/**
 * Drives one bout to completion: opens one if none is active, otherwise resumes the active bout.
 * Holds no state of its own. Every tick re-reads the chain and sends whatever is missing (a start,
 * commits, reveals, a finalize, the close), so a runner killed at any point picks up where the chain
 * says it is. Moves and salts are recomputed from each agent's seed and the on-chain history.
 */
export async function runBout(
	rt: Runtime,
	opts: { size: number; movesPerMatch: number; matches: number },
) {
	const { net, tasks, operator, sender } = rt;
	const arena = net.deployment.arena;
	const client = net.publicClient;
	// biome-ignore lint/suspicious/noExplicitAny: thin wrapper over a typed ABI
	const read = (functionName: any, args: readonly unknown[] = []) =>
		client.readContract({
			address: arena,
			abi: arenaAbi,
			functionName,
			args,
		} as never) as Promise<unknown>;
	const operatorCall = (label: string, data: Hex) =>
		sender.send(operator, label, { to: arena, data });

	const configs = new Map<Address, AgentConfig>();
	const readEntries = async (boutId: bigint, round: bigint, n: number) => {
		const rows = (await Promise.all(
			Array.from({ length: n }, (_, i) =>
				read("entries", [boutId, round, BigInt(i)]),
			),
		)) as [Hex, number, boolean, boolean][];
		return rows.map(([commitment, move, revealed, scored]) => ({
			commitment,
			move,
			revealed,
			scored,
		}));
	};
	const configOf = async (agent: Address) => {
		let c = configs.get(agent);
		if (!c) {
			const row = (await read("agents", [agent])) as [Address, bigint];
			c = decodeConfig(row[1]);
			configs.set(agent, c);
		}
		return c;
	};

	/** The move this agent plays in `round`, from its config, seed and the match so far. */
	const planMove = async (
		m: HouseMember,
		boutId: bigint,
		round: bigint,
		idx: number,
		partner: number,
		k: bigint,
	) => {
		const matchIndex = round / k;
		const moveIndex = Number(round - matchIndex * k);
		const [[myMoves, myMask], [theirMoves, theirMask]] = (await Promise.all([
			read("matchHistory", [boutId, round, BigInt(idx)]),
			read("matchHistory", [boutId, round, BigInt(partner)]),
		])) as [[number, number], [number, number]];
		// Bit j: move j of this match. A missed reveal reads as a defection to the other side.
		const moveAt = (moves: number, mask: number, j: number): Move =>
			(mask >> j) & 1 && !((moves >> j) & 1) ? Move.Cooperate : Move.Defect;
		const history: Turn[] = Array.from({ length: moveIndex }, (_, j) => ({
			mine: moveAt(myMoves, myMask, j),
			theirs: moveAt(theirMoves, theirMask, j),
		}));
		const move = decide({
			config: await configOf(m.agent.account),
			history,
			seed: m.seed,
			ctx: { boutId, matchIndex, moveIndex: round - matchIndex * k },
		});
		const salt = saltFor(m.seed, boutId, round);
		return {
			move,
			salt,
			commitment: commitmentFor(move, salt, m.agent.account, boutId, round),
		};
	};

	let sawActive = false;
	let lastLine = "";
	const started = Date.now();
	let boutId = 0n;

	for (;;) {
		const [active, count, block] = await Promise.all([
			read("boutActive") as Promise<boolean>,
			read("boutCount") as Promise<bigint>,
			client.getBlock(),
		]);
		const now = block.timestamp;

		if (!active) {
			if (sawActive) break;
			const states = (await Promise.all(
				rt.house.map((m) => read("agents", [m.agent.account])),
			)) as [Address, bigint, boolean, boolean][];
			const eligible = rt.house
				.filter((_, i) => states[i]?.[2] && !states[i]?.[3])
				.slice(0, opts.size)
				.map((m) => m.agent.account);
			if (eligible.length < 2) {
				throw new Error(
					`only ${eligible.length} eligible house agents; run setup first`,
				);
			}
			// Spend guard: a Gathering is paired·2·k·M moves, 2 + 2·k·M lifecycle ops, and openBout
			// (which costs several ops' worth with many participants).
			const rounds = opts.movesPerMatch * opts.matches;
			const paired = eligible.length - (eligible.length % 2);
			const ops =
				paired * 2 * rounds + 2 + 2 * rounds + Math.ceil(eligible.length / 4);
			if (!sender.budget.canAfford(ops)) {
				throw new Error(
					`budget: a ${eligible.length}-agent Gathering needs ~${ops} ops; ${sender.budget.summary()}`,
				);
			}
			tasks.run(`open:${count + 1n}`, operator.account, () =>
				operatorCall(
					`openBout(${eligible.length} agents, k=${opts.movesPerMatch}, M=${opts.matches})`,
					encodeFunctionData({
						abi: arenaAbi,
						functionName: "openBout",
						args: [eligible, opts.movesPerMatch, opts.matches],
					}),
				),
			);
			await sleep(3_000);
			continue;
		}
		sawActive = true;
		boutId = count;

		const [participants, kRaw, matches, roundsPlayed] = (await read(
			"boutInfo",
			[boutId],
		)) as [Address[], number, number, number, boolean];
		const n = participants.length;
		const k = BigInt(kRaw);
		const total = kRaw * matches;

		if (roundsPlayed >= total) {
			tasks.run(`close:${boutId}`, operator.account, () =>
				operatorCall(
					`closeBout(${boutId})`,
					encodeFunctionData({
						abi: arenaAbi,
						functionName: "closeBout",
						args: [boutId],
					}),
				),
			);
			await sleep(3_000);
			continue;
		}

		const round = BigInt(roundsPlayed);
		const [commitDeadline, revealDeadline, commits, roundStarted] = (await read(
			"rounds",
			[boutId, round],
		)) as [bigint, bigint, number, boolean, boolean];

		if (!roundStarted) {
			tasks.run(`start:${boutId}:${round}`, operator.account, () =>
				operatorCall(
					`startRound(bout ${boutId}, round ${round})`,
					encodeFunctionData({
						abi: arenaAbi,
						functionName: "startRound",
						args: [boutId],
					}),
				),
			);
			await sleep(3_000);
			continue;
		}

		const seed = (await read("matchSeed", [boutId, round / k])) as Hex;
		const partner = pairings(seed, n);
		const entries = await readEntries(boutId, round, n);
		const paired = n - (n % 2);
		const commitOpen = now <= commitDeadline;
		const revealOpen = now > commitDeadline || commits === paired;
		const revealLive = revealOpen && now <= revealDeadline;

		let revealed = 0;
		let scored = 0;
		for (let idx = 0; idx < n; idx++) {
			const p = partner[idx];
			const e = entries[idx] as Entry;
			if (p === null || p === undefined) continue;
			if (e.revealed) revealed++;
			if (e.scored) scored++;
			const m = rt.byAccount.get(participants[idx] as Address);
			if (!m) continue; // not a house agent; its owner's runner plays it
			if (e.commitment === ZERO32) {
				if (!commitOpen) continue;
				tasks.run(
					`commit:${boutId}:${round}:${idx}`,
					m.agent.account,
					async () => {
						const plan = await planMove(m, boutId, round, idx, p, k);
						return sender.send(m.agent, `commit  r${round} #${m.index}`, {
							to: arena,
							data: encodeFunctionData({
								abi: arenaAbi,
								functionName: "commit",
								args: [boutId, round, BigInt(idx), plan.commitment],
							}),
						});
					},
				);
			} else if (!e.revealed && revealLive) {
				tasks.run(
					`reveal:${boutId}:${round}:${idx}`,
					m.agent.account,
					async () => {
						const plan = await planMove(m, boutId, round, idx, p, k);
						// Arena stores the first 24 bytes of the commitment.
						if (plan.commitment.slice(0, 50) !== e.commitment.slice(0, 50)) {
							throw new Error(
								`#${m.index} r${round}: recomputed commitment differs from chain; not revealing`,
							);
						}
						// Headroom for the scoring path: the partner may reveal between estimate and send.
						return sender.send(
							m.agent,
							`reveal  r${round} #${m.index} ${plan.move === Move.Cooperate ? "C" : "D"}`,
							{
								to: arena,
								data: encodeFunctionData({
									abi: arenaAbi,
									functionName: "reveal",
									args: [boutId, round, BigInt(idx), plan.move, plan.salt],
								}),
							},
							{ extraGas: 40_000n },
						);
					},
				);
			}
		}

		if (scored === paired || now > revealDeadline) {
			tasks.run(`finalize:${boutId}:${round}`, operator.account, () =>
				operatorCall(
					`finalize(bout ${boutId}, round ${round})`,
					encodeFunctionData({
						abi: arenaAbi,
						functionName: "finalize",
						args: [boutId, round],
					}),
				),
			);
		}

		const line = `bout ${boutId} round ${round + 1n}/${total}: committed ${commits}/${paired}, revealed ${revealed}, scored ${scored}`;
		if (line !== lastLine) {
			const s = sender.stats;
			console.log(
				`-- ${line} | ops ok ${s.ok} reverted ${s.reverted} failed ${s.failed} dropped ${s.dropped} skipped ${s.wouldRevert} | ${Math.round((Date.now() - started) / 1000)}s`,
			);
			lastLine = line;
		}
		await sleep(3_000);
	}

	await tasks.drain();
	const s = sender.stats;
	console.log(
		`bout ${boutId} closed in ${Math.round((Date.now() - started) / 1000)}s this session: sent ${s.sent}, ok ${s.ok}, reverted ${s.reverted}, failed ${s.failed}, dropped ${s.dropped}, skipped ${s.wouldRevert}`,
	);
	for (const [e, c] of sender.errors) console.log(`  ${c}x ${e}`);
	console.log(sender.budget.summary());
	return boutId;
}
