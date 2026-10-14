/**
 * M0 cost gate, part 1: measure the gas of every op type the game sends, as real v0.7 UserOps
 * through the real EntryPoint + SimpleAccountFactory on an anvil fork of Fuji (free).
 *
 *   anvil --fork-url https://api.avax-test.network/ext/bc/C/rpc --chain-id 43113
 *   pnpm --filter @arena/runner gas-probe -- <out.json>
 *
 * Not measured here: SmoothSend's VerifyingPaymaster validation (no paymaster signer locally) —
 * part 2 of the gate confirms with real sponsored ops and the dashboard balance.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_KNOBS, encodeConfig, StrategyId } from "@arena/strategies";
import {
	type Abi,
	type Address,
	createPublicClient,
	createTestClient,
	createWalletClient,
	encodeAbiParameters,
	encodeFunctionData,
	type Hex,
	http,
	keccak256,
	parseEther,
	publicActions,
	walletActions,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import {
	buildUserOp,
	executeCall,
	type GasLimits,
	handleOps,
	predictAccount,
	simpleAccountFactoryAbi,
} from "../src/aa/simpleAccount.ts";

const RPC = process.env.PROBE_RPC ?? "http://127.0.0.1:8545";
const FACTORY: Address = "0x55326f005a0959F75496cdd692505fFB520972f5"; // SmoothSend Fuji factory
const ANVIL_KEYS = [
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
] as const;
const N = 24;
const K = 2;

const here = dirname(fileURLToPath(import.meta.url));
const artifact = (name: string) => {
	const json = JSON.parse(
		readFileSync(
			resolve(here, `../../../contracts/out/${name}.sol/${name}.json`),
			"utf8",
		),
	);
	return { abi: json.abi as Abi, bytecode: json.bytecode.object as Hex };
};

const transport = http(RPC);
const client = createPublicClient({ chain: avalancheFuji, transport });
const test = createTestClient({
	chain: avalancheFuji,
	mode: "anvil",
	transport,
})
	.extend(publicActions)
	.extend(walletActions);
const deployer = createWalletClient({
	chain: avalancheFuji,
	transport,
	account: privateKeyToAccount(ANVIL_KEYS[0]),
});
const bundler = createWalletClient({
	chain: avalancheFuji,
	transport,
	account: privateKeyToAccount(ANVIL_KEYS[1]),
});

const GAS: GasLimits = {
	verificationGasLimit: 600_000n,
	callGasLimit: 3_000_000n,
	preVerificationGas: 60_000n,
	maxPriorityFeePerGas: 1n,
	maxFeePerGas: 50_000_000_000n,
};

interface Sample {
	op: string;
	actualGasUsed: bigint;
	txGasUsed: bigint;
}
const samples: Sample[] = [];

type Signer = ReturnType<typeof privateKeyToAccount>;
interface Wallet {
	key: Signer;
	address: Address;
}

async function newWallet(predeploy: boolean): Promise<Wallet> {
	const key = privateKeyToAccount(generatePrivateKey());
	const address = await predictAccount(client, FACTORY, key.address);
	await test.setBalance({ address, value: parseEther("100") });
	if (predeploy) {
		const hash = await deployer.writeContract({
			address: FACTORY,
			abi: simpleAccountFactoryAbi,
			functionName: "createAccount",
			args: [key.address, 0n],
		});
		await client.waitForTransactionReceipt({ hash });
	}
	return { key, address };
}

/**
 * Bundler-style tight limits. EntryPoint v0.7 charges 10% of *unused* callGasLimit, so generous
 * limits inflate `actualGasUsed` (a first run with a flat 3M limit showed ~455k for a commit whose
 * bundle tx used ~147k). callGasLimit = estimate of the inner call from the account (minus the 21k
 * intrinsic) + headroom; preVerificationGas = per-tx intrinsic + calldata cost of the packed op
 * + fixed EntryPoint overhead, as a one-op bundle.
 */
async function tightGas(
	wallet: Wallet,
	to: Address,
	data: Hex,
	deployed: boolean,
): Promise<GasLimits> {
	const inner = await client.estimateGas({ account: wallet.address, to, data });
	const callGasLimit = ((inner - 21_000n) * 12n) / 10n + 15_000n;
	const calldataBytes = BigInt((data.length - 2) / 2 + 1_000); // op fields + signature, approx.
	const preVerificationGas = 21_000n + calldataBytes * 16n + 10_000n;
	return {
		...GAS,
		verificationGasLimit: deployed ? 100_000n : 400_000n,
		callGasLimit,
		preVerificationGas,
	};
}

async function send(
	label: string,
	wallet: Wallet,
	to: Address,
	data: Hex,
): Promise<void> {
	const deployed =
		((await client.getCode({ address: wallet.address }))?.length ?? 0) > 2;
	const op = await buildUserOp({
		client,
		owner: wallet.key,
		sender: wallet.address,
		factory: FACTORY,
		callData: executeCall(to, data),
		gas: process.env.PROBE_LOOSE
			? GAS
			: await tightGas(wallet, to, data, deployed),
	});
	const r = await handleOps(client, bundler, op);
	if (!r.success) throw new Error(`${label}: UserOp reverted (${r.txHash})`);
	samples.push({
		op: label,
		actualGasUsed: r.actualGasUsed,
		txGasUsed: r.txGasUsed,
	});
}

async function deploy(name: string, args: unknown[]): Promise<Address> {
	const { abi, bytecode } = artifact(name);
	const hash = await deployer.deployContract({ abi, bytecode, args });
	const receipt = await client.waitForTransactionReceipt({ hash });
	if (!receipt.contractAddress) throw new Error(`deploy ${name} failed`);
	return receipt.contractAddress;
}

async function main() {
	const out = process.argv[2] ?? "gas-probe.json";
	const arenaAbi = artifact("Arena").abi;
	const badgesAbi = artifact("Badges").abi;
	const call = (abi: Abi, functionName: string, args: unknown[]) =>
		encodeFunctionData({ abi, functionName, args });

	const registrar = privateKeyToAccount(generatePrivateKey());
	const operator = await newWallet(true);
	const arena = await deploy("Arena", [
		deployer.account.address,
		operator.address,
		registrar.address,
		60,
		60,
	]);
	const badges = await deploy("Badges", [
		deployer.account.address,
		operator.address,
		"https://example.invalid/{id}.json",
	]);

	const config = encodeConfig({
		strategy: StrategyId.TitForTat,
		knobs: DEFAULT_KNOBS,
	});
	const block = await client.getBlock();
	const deadline = block.timestamp + 3600n;

	// Registration + confirmation. Agent 0 / owner 0 deploy their account via initCode.
	const agents: Wallet[] = [];
	const owners: Wallet[] = [];
	for (let i = 0; i < N; i++) {
		const agent = await newWallet(i !== 0);
		const owner = await newWallet(i !== 0);
		const attestation = await registrar.signTypedData({
			domain: {
				name: "Arena",
				version: "1",
				chainId: avalancheFuji.id,
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
			message: { agent: agent.address, owner: owner.address, deadline },
		});
		await send(
			i === 0 ? "registerAgent + account deploy" : "registerAgent",
			agent,
			arena,
			call(arenaAbi, "registerAgent", [
				owner.address,
				config,
				deadline,
				attestation,
			]),
		);
		await send(
			i === 0 ? "confirmAgent + account deploy" : "confirmAgent",
			owner,
			arena,
			call(arenaAbi, "confirmAgent", [agent.address]),
		);
		agents.push(agent);
		owners.push(owner);
	}
	await send(
		"retune",
		owners[1] as Wallet,
		arena,
		call(arenaAbi, "retune", [config]),
	);

	const ids = agents.map((a) => a.address);
	await send(
		`openBout (N=${N})`,
		operator,
		arena,
		call(arenaAbi, "openBout", [ids, K, 1]),
	);
	const boutId = 1n;
	const salt = (i: number, round: number) =>
		keccak256(
			encodeAbiParameters(
				[{ type: "uint256" }, { type: "uint256" }],
				[BigInt(i), BigInt(round)],
			),
		);

	for (let round = 0; round < K; round++) {
		await send(
			round === 0 ? "startRound (new match, stores seed)" : "startRound",
			operator,
			arena,
			call(arenaAbi, "startRound", [boutId]),
		);
		const partner: number[] = [];
		for (let i = 0; i < N; i++) {
			const [p] = (await client.readContract({
				address: arena,
				abi: arenaAbi,
				functionName: "partnerOf",
				args: [boutId, BigInt(round), BigInt(i)],
			})) as [bigint, boolean];
			partner.push(Number(p));
		}
		const move = 0;
		for (let i = 0; i < N; i++) {
			const agent = agents[i] as Wallet;
			const commitment = keccak256(
				encodeAbiParameters(
					[
						{ type: "uint8" },
						{ type: "bytes32" },
						{ type: "address" },
						{ type: "uint256" },
						{ type: "uint256" },
					],
					[move, salt(i, round), agent.address, boutId, BigInt(round)],
				),
			);
			await send(
				"commit",
				agent,
				arena,
				call(arenaAbi, "commit", [
					boutId,
					BigInt(round),
					BigInt(i),
					commitment,
				]),
			);
		}
		// Round 1: two agents (one pair) withhold their reveal to exercise the forfeit path.
		const withheld =
			round === 1 ? new Set([0, partner[0] as number]) : new Set<number>();
		const revealed = new Set<number>();
		for (let i = 0; i < N; i++) {
			if (withheld.has(i)) continue;
			const second = revealed.has(partner[i] as number);
			await send(
				second ? "reveal (second of pair, scores)" : "reveal (first of pair)",
				agents[i] as Wallet,
				arena,
				call(arenaAbi, "reveal", [
					boutId,
					BigInt(round),
					BigInt(i),
					move,
					salt(i, round),
				]),
			);
			revealed.add(i);
		}
		if (withheld.size > 0) {
			await test.increaseTime({ seconds: 130 });
			await test.mine({ blocks: 1 });
		}
		await send(
			withheld.size > 0 ? "finalize (1 forfeit pair)" : "finalize (all scored)",
			operator,
			arena,
			call(arenaAbi, "finalize", [boutId, BigInt(round)]),
		);
	}
	await send(
		"closeBout",
		operator,
		arena,
		call(arenaAbi, "closeBout", [boutId]),
	);

	const badgeIds = [256n, 257n, 512n];
	await send(
		"Badges.mintBatch (1 id)",
		operator,
		badges,
		call(badgesAbi, "mintBatch", [owners[0]?.address, [768n]]),
	);
	await send(
		"Badges.mintBatch (3 ids)",
		operator,
		badges,
		call(badgesAbi, "mintBatch", [owners[1]?.address, badgeIds]),
	);

	// Aggregate: median per op label.
	const byOp = new Map<string, Sample[]>();
	for (const s of samples) byOp.set(s.op, [...(byOp.get(s.op) ?? []), s]);
	const median = (xs: bigint[]) =>
		[...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[
			Math.floor(xs.length / 2)
		] as bigint;
	const rows = [...byOp.entries()].map(([op, xs]) => ({
		op,
		count: xs.length,
		actualGasUsed: median(xs.map((x) => x.actualGasUsed)).toString(),
		txGasUsed: median(xs.map((x) => x.txGasUsed)).toString(),
	}));
	writeFileSync(
		out,
		`${JSON.stringify({ measuredAt: new Date().toISOString(), rpc: RPC, n: N, rows }, null, 2)}\n`,
	);
	console.table(rows);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
