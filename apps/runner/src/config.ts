import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type Address,
	createPublicClient,
	type Hex,
	http,
	type PublicClient,
} from "viem";
import { avalanche, avalancheFuji, type Chain } from "viem/chains";

export const ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);
if (existsSync(resolve(ROOT, ".env")))
	process.loadEnvFile(resolve(ROOT, ".env"));

/**
 * SmoothSend's gateway only serves bundler methods (eth_sendUserOperation and friends), so chain
 * reads go to a normal RPC: the *_RPC_URL env var if set, otherwise the public Avalanche endpoint.
 */
export const NETWORKS = {
	fuji: {
		chain: avalancheFuji,
		sdkNetwork: "testnet",
		factory: "0x55326f005a0959F75496cdd692505fFB520972f5" as Address,
		apiKeyEnv: "SMOOTHSEND_SK_FUJI",
		rpcEnv: "FUJI_RPC_URL",
	},
	avalanche: {
		chain: avalanche,
		sdkNetwork: "mainnet",
		factory: "0x863b8E15D37Abf33d5177108f6a07D541a698D25" as Address,
		apiKeyEnv: "SMOOTHSEND_SK_MAINNET",
		rpcEnv: "AVALANCHE_RPC_URL",
	},
} as const;
export type NetworkName = keyof typeof NETWORKS;

export interface Deployment {
	owner: Address;
	operator: Address;
	registrar: Address;
	arena: Address;
	badges: Address;
	block: number;
}

export interface Roles {
	operatorOwner: Hex;
	registrar: Hex;
}

export interface Network {
	name: NetworkName;
	chain: Chain;
	sdkNetwork: "testnet" | "mainnet";
	factory: Address;
	apiKey: string;
	publicClient: PublicClient;
	deployment: Deployment;
	roles: Roles;
}

export function loadNetwork(name: string): Network {
	if (!(name in NETWORKS)) throw new Error(`unknown network ${name}`);
	const net = NETWORKS[name as NetworkName];
	const apiKey = process.env[net.apiKeyEnv];
	if (!apiKey) throw new Error(`${net.apiKeyEnv} missing from .env`);
	const deploymentFile = resolve(
		ROOT,
		`contracts/deployments/${net.chain.id}.json`,
	);
	const rolesFile = resolve(ROOT, `.secrets/${name}-roles.json`);
	const publicClient: PublicClient = createPublicClient({
		chain: net.chain,
		transport: http(process.env[net.rpcEnv] || undefined, {
			retryCount: 5,
			retryDelay: 400,
		}),
		batch: { multicall: true },
	});
	return {
		name: name as NetworkName,
		chain: net.chain,
		sdkNetwork: net.sdkNetwork,
		factory: net.factory,
		apiKey,
		publicClient,
		deployment: JSON.parse(readFileSync(deploymentFile, "utf8")) as Deployment,
		roles: JSON.parse(readFileSync(rolesFile, "utf8")) as Roles,
	};
}
