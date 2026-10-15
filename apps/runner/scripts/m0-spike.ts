/**
 * M0 SmoothSend spike on Fuji: real sponsored UserOps through the SmoothSend gateway against the
 * dev Probe contract, one SimpleAccount per agent owner key, all on one sk_ key.
 *
 *   pnpm --filter @arena/runner m0 -- single          # gates 1–3: deploy-on-first-op, msg.sender, one key many signers
 *   pnpm --filter @arena/runner m0 -- burst [n=48] [conc=n]  # gate 4: n ops from n agents, conc in flight; counts 429s
 *   pnpm --filter @arena/runner m0 -- nonce           # gate 5: two ops from one account before the first lands
 *   pnpm --filter @arena/runner m0 -- status [n=48]   # what actually landed: deployed accounts and Probe pings
 *
 * Agent owner keys live in <repo>/.secrets/m0-agents.json (gitignored), created on first run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	createSmoothSendAvaxClient,
	predictSimpleAccountAddress,
} from "@smoothsend/sdk/avax";
import {
	type Address,
	createPublicClient,
	encodeFunctionData,
	type Hex,
	http,
	parseAbi,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
process.loadEnvFile(resolve(ROOT, ".env"));

const PROBE: Address = "0x09BA40555eF31c2402134bBE79210b2FFA0E83c9";
const FACTORY: Address = "0x55326f005a0959F75496cdd692505fFB520972f5";
const probeAbi = parseAbi([
	"function ping()",
	"function pings(address) view returns (uint256)",
]);
const PING: Hex = encodeFunctionData({ abi: probeAbi, functionName: "ping" });

const apiKey = process.env.SMOOTHSEND_SK_FUJI;
if (!apiKey) throw new Error("SMOOTHSEND_SK_FUJI missing from .env");
const publicClient = createPublicClient({
	chain: avalancheFuji,
	transport: http(process.env.FUJI_RPC_URL || undefined),
});

const KEYS = resolve(ROOT, ".secrets/m0-agents.json");
function agentKeys(n: number): Hex[] {
	const keys: Hex[] = existsSync(KEYS)
		? JSON.parse(readFileSync(KEYS, "utf8"))
		: [];
	if (keys.length < n) {
		while (keys.length < n) keys.push(generatePrivateKey());
		mkdirSync(dirname(KEYS), { recursive: true });
		writeFileSync(KEYS, JSON.stringify(keys, null, 2));
	}
	return keys.slice(0, n);
}

function agent(pk: Hex) {
	const owner = privateKeyToAccount(pk);
	const client = createSmoothSendAvaxClient({
		apiKey: apiKey as string,
		network: "testnet",
		publicClient: publicClient as never,
		ownerAddress: owner.address,
		accountFactory: FACTORY,
		// SimpleAccount v0.7 checks an EIP-191 signature over the userOpHash.
		signUserOpHash: ({ hash }) => owner.signMessage({ message: { raw: hash } }),
	});
	const account = () =>
		predictSimpleAccountAddress({
			publicClient: publicClient as never,
			factory: FACTORY,
			owner: owner.address,
		});
	const ping = () =>
		client.submitCall({
			call: { to: PROBE, data: PING },
			waitForReceipt: true,
		});
	return { owner: owner.address, client, account, ping };
}

const pings = (a: Address) =>
	publicClient.readContract({
		address: PROBE,
		abi: probeAbi,
		functionName: "pings",
		args: [a],
	});
const deployed = async (a: Address) =>
	((await publicClient.getCode({ address: a })) ?? "0x") !== "0x";

type Outcome = {
	ok: boolean;
	ms: number;
	status?: number | undefined;
	error?: string;
	tx?: string | undefined;
	success?: boolean | undefined;
};
async function timed(
	fn: () => Promise<{
		transactionHash?: string | undefined;
		receipt: { success?: boolean | undefined } | null;
	}>,
): Promise<Outcome> {
	const t = performance.now();
	try {
		const r = await fn();
		return {
			ok: true,
			ms: Math.round(performance.now() - t),
			tx: r.transactionHash,
			success: r.receipt?.success,
		};
	} catch (e) {
		const err = e as {
			status?: number;
			statusCode?: number;
			response?: { status?: number };
			message?: string;
		};
		return {
			ok: false,
			ms: Math.round(performance.now() - t),
			status: err.status ?? err.statusCode ?? err.response?.status,
			error: String(err.message ?? e).slice(0, 240),
		};
	}
}

async function single() {
	const [k0, k1] = agentKeys(2);
	for (const [i, pk] of [k0, k1].entries()) {
		const a = agent(pk as Hex);
		const acct = await a.account();
		const before = { deployed: await deployed(acct), pings: await pings(acct) };
		const out = await timed(a.ping);
		const after = { deployed: await deployed(acct), pings: await pings(acct) };
		console.log(
			JSON.stringify(
				{ agent: i, owner: a.owner, account: acct, before, after, out },
				(_, v) => (typeof v === "bigint" ? Number(v) : v),
			),
		);
		// Gate 2: the Probe saw the smart account, never the owner EOA.
		console.log(`  owner pings: ${await pings(a.owner)} (expect 0)`);
	}
}

async function burst(n: number, conc = n) {
	const agents = agentKeys(n).map(agent);
	const t = performance.now();
	// At most `conc` ops in flight at once, one per agent.
	const outs: Outcome[] = new Array(n);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(conc, n) }, async () => {
			while (next < n) {
				const i = next++;
				outs[i] = await timed((agents[i] as ReturnType<typeof agent>).ping);
			}
		}),
	);
	const wall = Math.round(performance.now() - t);
	const ok = outs.filter((o) => o.ok).length;
	const s429 = outs.filter(
		(o) => o.status === 429 || /429|rate/i.test(o.error ?? ""),
	).length;
	const ms = outs
		.filter((o) => o.ok)
		.map((o) => o.ms)
		.sort((x, y) => x - y);
	console.log(
		JSON.stringify({
			n,
			conc,
			ok,
			failed: n - ok,
			rateLimited: s429,
			wallMs: wall,
			p50: ms[Math.floor(ms.length / 2)],
			max: ms.at(-1),
		}),
	);
	const errors = [
		...new Set(
			outs.filter((o) => !o.ok).map((o) => `${o.status ?? "-"} ${o.error}`),
		),
	];
	for (const e of errors) console.log(`  error: ${e}`);
}

async function nonce() {
	const a = agent(agentKeys(1)[0] as Hex);
	const acct = await a.account();
	if (!(await deployed(acct))) await a.ping(); // collision test needs a deployed account
	const before = await pings(acct);
	const outs = await Promise.all([timed(a.ping), timed(a.ping)]);
	const after = await pings(acct);
	console.log(
		JSON.stringify({
			account: acct,
			before: Number(before),
			after: Number(after),
			outs,
		}),
	);
}

// What actually landed, independent of what the gateway reported.
async function status(n: number) {
	const rows = await Promise.all(
		agentKeys(n).map(async (pk) => {
			const a = await agent(pk).account();
			return { deployed: await deployed(a), pings: Number(await pings(a)) };
		}),
	);
	console.log(
		JSON.stringify({
			n,
			deployed: rows.filter((r) => r.deployed).length,
			totalPings: rows.reduce((t, r) => t + r.pings, 0),
			pings: rows.map((r) => r.pings).join(""),
		}),
	);
}

const [cmd = "single", arg] = process.argv.slice(2).filter((x) => x !== "--");
if (cmd === "single") await single();
else if (cmd === "burst")
	await burst(
		Number(arg ?? 48),
		Number(process.argv.at(-1) !== arg ? process.argv.at(-1) : (arg ?? 48)),
	);
else if (cmd === "nonce") await nonce();
else if (cmd === "status") await status(Number(arg ?? 48));
else throw new Error(`unknown command ${cmd}`);
