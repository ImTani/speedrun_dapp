/**
 * Marks engine: mints the Marks the web app queued (table `marks`, apps/web/src/server/marks.ts) as
 * soulbound Badges. One Badges.mintBatch per player per tick, sent by the operator account (it holds
 * MINTER_ROLE). The operator also runs Gatherings, so this goes through rt.tasks: it never sends
 * while the operator has an op in flight, and Gathering ops skip a tick while a mint is in flight.
 */
import { type Address, encodeFunctionData, getAddress, parseAbi } from "viem";
// The catalog is shared with the web app (pure data, no imports).
import { markDef, markId } from "../../web/src/game/marks.ts";
import { CHAIN_ID, sql } from "./db.ts";
import type { Runtime } from "./runtime.ts";

const badgesAbi = parseAbi([
	"function mintBatch(address to, uint256[] ids)",
	"function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
	"function totalSupply(uint256 id) view returns (uint256)",
]);

const MAX_ATTEMPTS = 5;
const MAX_IDS = 16;

interface QueuedRow {
	id: string;
	kind: number;
	tier: number;
	account: string;
}

/** One tick: picks the oldest player with queued Marks and mints them in one op. */
export async function marksTick(rt: Runtime) {
	const { net, operator, sender, tasks } = rt;
	if (sender.busy.has(operator.account)) return;
	const badges = net.deployment.badges;
	const rows = (await sql`select m.id::text as id, m.kind, m.tier, p.account
		from marks m join players p on p.privy_id = m.privy_id
		where m.chain_id = ${CHAIN_ID} and m.status = 'queued' and m.attempts < ${MAX_ATTEMPTS}
		order by m.queued_at, m.id limit 200`) as QueuedRow[];
	const first = rows[0];
	if (!first) return;
	const account = getAddress(first.account) as Address;
	const batch = rows
		.filter((r) => getAddress(r.account) === account)
		.slice(0, MAX_IDS)
		.map((r) => ({ ...r, tokenId: markId(Number(r.kind), Number(r.tier)) }));

	// Already held (an earlier op landed but the row wasn't updated): settle without sending.
	const balances = await net.publicClient.readContract({
		address: badges,
		abi: badgesAbi,
		functionName: "balanceOfBatch",
		args: [batch.map(() => account), batch.map((b) => b.tokenId)],
	});
	const held = batch.filter((_, i) => (balances[i] ?? 0n) > 0n);
	if (held.length) {
		await sql`update marks set status = 'minted', minted_at = now(), error = null
			where id = any(${held.map((h) => h.id)}::bigint[])`;
	}
	// A Stigma someone else already holds on-chain can't be minted again; drop the claim.
	const toMint: typeof batch = [];
	for (const b of batch) {
		if (held.includes(b)) continue;
		if (markDef(Number(b.kind))?.unique) {
			const supply = await net.publicClient.readContract({
				address: badges,
				abi: badgesAbi,
				functionName: "totalSupply",
				args: [b.tokenId],
			});
			if (supply > 0n) {
				await sql`delete from marks where id = ${b.id}`;
				continue;
			}
		}
		toMint.push(b);
	}
	if (!toMint.length) return;

	const ids = toMint.map((b) => b.id);
	tasks.run(`marks:${account}`, operator.account, async () => {
		const res = await sender.send(
			operator,
			`mint ${toMint.length} marks to ${account.slice(0, 8)}`,
			{
				to: badges,
				data: encodeFunctionData({
					abi: badgesAbi,
					functionName: "mintBatch",
					args: [account, toMint.map((b) => b.tokenId)],
				}),
			},
		);
		if (res.ok && res.success !== false) {
			await sql`update marks set status = 'minted', minted_at = now(), tx = ${res.tx ?? null},
				error = null where id = any(${ids}::bigint[])`;
		} else {
			await sql`update marks set attempts = attempts + 1,
				error = ${(res.error ?? "reverted").slice(0, 200)} where id = any(${ids}::bigint[])`;
		}
		return res;
	});
}
