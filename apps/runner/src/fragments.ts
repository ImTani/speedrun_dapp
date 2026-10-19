import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { arenaAbi } from "@arena/chain";
import { decodeConfig, encodeConfig } from "@arena/strategies";
import { type Address, encodeFunctionData, getAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ROOT } from "./config.ts";
import { CHAIN_ID, sql } from "./db.ts";
import { houseName } from "./names.ts";
import type { HouseMember, Runtime } from "./runtime.ts";

const ATTESTATION_TTL = 3_600n;
const MAX_ATTEMPTS = 4;
const ZERO = "0x0000000000000000000000000000000000000000";

interface KeyEntry {
	agentKey: Hex;
	seed: Hex;
}
type Keystore = Record<string, KeyEntry>;

/** Player Fragment keys, keyed by lowercase owner account. Never logged. */
const FILE = resolve(ROOT, ".secrets/fuji-fragments.json");
const loadKeys = (): Keystore =>
	existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
function keyFor(owner: string): KeyEntry {
	const ks = loadKeys();
	const k = owner.toLowerCase();
	let e = ks[k];
	if (!e) {
		e = { agentKey: generatePrivateKey(), seed: generatePrivateKey() };
		ks[k] = e;
		mkdirSync(dirname(FILE), { recursive: true });
		writeFileSync(FILE, JSON.stringify(ks, null, 2));
	}
	return e;
}

interface Row {
	id: string;
	owner_account: string;
	agent: string | null;
	config: string;
	status: string;
}

/** Upserts one confirmed fragments row per house member (house = true). */
export async function syncHouse(rt: Runtime) {
	for (const m of rt.house) {
		await sql`insert into fragments (chain_id, owner_account, agent, config, name, house, status, registered_at, confirmed_at)
			values (${CHAIN_ID}, ${m.owner.account}, ${m.agent.account}, ${encodeConfig(m.config).toString()},
				${houseName(m.index)}, true, 'confirmed', now(), now())
			on conflict (chain_id, owner_account) do update set agent = excluded.agent, config = excluded.config,
				house = true, status = 'confirmed'`;
	}
	console.log(`house synced: ${rt.house.length} Fragments`);
}

let nextIndex = 1000;
/** Adds registered/confirmed player Fragments with local keys to the roster (front, so they're picked first). */
async function loadPlayers(rt: Runtime) {
	const rows =
		(await sql`select id, owner_account, agent, config, status from fragments
		where chain_id = ${CHAIN_ID} and house = false and status in ('registered', 'confirmed')
		and agent is not null`) as Row[];
	const ks = loadKeys();
	const added: HouseMember[] = [];
	for (const r of rows) {
		const e = ks[r.owner_account.toLowerCase()];
		if (!e) continue;
		const agent = getAddress(r.agent as string);
		if (rt.byAccount.has(agent)) continue;
		const signer = await rt.sender.signer(e.agentKey);
		if (signer.account !== agent) continue;
		const m: HouseMember = {
			index: nextIndex++,
			agent: signer,
			owner: signer, // unused by runBout
			agentKey: e.agentKey,
			ownerKey: e.agentKey,
			seed: e.seed,
			config: decodeConfig(BigInt(r.config)),
		};
		rt.byAccount.set(agent, m);
		added.push(m);
	}
	if (added.length) {
		rt.house.unshift(...added);
		console.log(`players: +${added.length} Fragments in the roster`);
	}
}

/** Registers requested player Fragments: the agent account sends registerAgent with the registrar's attestation. */
export async function fragmentsTick(rt: Runtime) {
	const { net, tasks } = rt;
	const arena = net.deployment.arena;
	const registrar = privateKeyToAccount(net.roles.registrar);
	const rows =
		(await sql`select id, owner_account, agent, config, status from fragments
		where chain_id = ${CHAIN_ID} and status = 'requested'`) as Row[];
	for (const r of rows) {
		const owner = getAddress(r.owner_account) as Address;
		const signer = await rt.sender.signer(keyFor(owner).agentKey);
		const key = `fragment:${r.id}`;
		const st = (await net.publicClient.readContract({
			address: arena,
			abi: arenaAbi,
			functionName: "agents",
			args: [signer.account],
		})) as unknown as readonly [Address, ...unknown[]];
		if (st[0] !== ZERO) {
			await sql`update fragments set status = 'registered', agent = ${signer.account},
				registered_at = now(), error = null where id = ${r.id}`;
			console.log(`fragment ${r.id}: registered`);
			continue;
		}
		// The last attempt marks the row failed itself (below).
		if (tasks.attemptsOf(key) >= MAX_ATTEMPTS) continue;
		tasks.run(key, signer.account, async () => {
			const deadline = BigInt(Math.floor(Date.now() / 1000)) + ATTESTATION_TTL;
			const attestation = await registrar.signTypedData({
				domain: {
					name: "Arena",
					version: "1",
					chainId: net.chain.id,
					verifyingContract: arena,
				},
				types: {
					Register: [
						{ name: "agent", type: "address" },
						{ name: "owner", type: "address" },
						{ name: "deadline", type: "uint256" },
					],
				},
				primaryType: "Register",
				message: { agent: signer.account, owner, deadline },
			});
			const res = await rt.sender.send(signer, `register fragment ${r.id}`, {
				to: arena,
				data: encodeFunctionData({
					abi: arenaAbi,
					functionName: "registerAgent",
					args: [owner, BigInt(r.config), deadline, attestation],
				}),
			});
			if (res.ok && res.success !== false) {
				await sql`update fragments set status = 'registered', agent = ${signer.account},
					registered_at = now(), error = null where id = ${r.id}`;
			} else if (tasks.attemptsOf(key) >= MAX_ATTEMPTS) {
				await sql`update fragments set status = 'failed',
					error = ${(res.error ?? "reverted").slice(0, 200)} where id = ${r.id}`;
			}
			return res;
		});
	}
	await loadPlayers(rt);
}
