import { ACCOUNT_FACTORY, arenaAbi, deploymentFor } from "@arena/chain";
import {
	type Address,
	createPublicClient,
	http,
	type PublicClient,
	parseAbi,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { rpcUrl } from "./env.ts";

export const CHAIN_ID = 43113;
export const deployment = deploymentFor(CHAIN_ID);
export const ARENA = deployment.arena;
export const FACTORY = ACCOUNT_FACTORY[CHAIN_ID] as Address;

let client: PublicClient | undefined;
export function publicClient(): PublicClient {
	client ??= createPublicClient({
		chain: avalancheFuji,
		transport: http(rpcUrl()),
	}) as PublicClient;
	return client;
}

const factoryAbi = parseAbi([
	"function getAddress(address owner, uint256 salt) view returns (address)",
]);

const accountCache = new Map<string, Address>();
/** The SimpleAccount (salt 0) owned by `eoa`, from SmoothSend's factory. */
export async function accountFor(eoa: Address): Promise<Address> {
	const hit = accountCache.get(eoa);
	if (hit) return hit;
	const account = await publicClient().readContract({
		address: FACTORY,
		abi: factoryAbi,
		functionName: "getAddress",
		args: [eoa, 0n],
	});
	accountCache.set(eoa, account);
	return account;
}

export async function boutActive(): Promise<boolean> {
	return publicClient().readContract({
		address: ARENA,
		abi: arenaAbi,
		functionName: "boutActive",
	});
}

export async function agentConfirmed(agent: Address): Promise<boolean> {
	const a = await publicClient().readContract({
		address: ARENA,
		abi: arenaAbi,
		functionName: "agents",
		args: [agent],
	});
	return a[2];
}

export async function boutCount(): Promise<bigint> {
	return publicClient().readContract({
		address: ARENA,
		abi: arenaAbi,
		functionName: "boutCount",
	});
}

export async function boutInfo(id: bigint) {
	const [participants, movesPerMatch, matches, roundsPlayed, active] =
		await publicClient().readContract({
			address: ARENA,
			abi: arenaAbi,
			functionName: "boutInfo",
			args: [id],
		});
	return { participants, movesPerMatch, matches, roundsPlayed, active };
}

export async function roundInfo(id: bigint, round: bigint) {
	const [commitDeadline, revealDeadline, commits, started, finalized] =
		await publicClient().readContract({
			address: ARENA,
			abi: arenaAbi,
			functionName: "rounds",
			args: [id, round],
		});
	return { commitDeadline, revealDeadline, commits, started, finalized };
}
