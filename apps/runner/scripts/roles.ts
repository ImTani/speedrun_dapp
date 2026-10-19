/**
 * Role keys for a network, kept in <repo>/.secrets/<network>-roles.json (gitignored), created on first run.
 *
 *   pnpm --filter @arena/runner roles -- fuji
 *
 * - operatorOwner: owns the runner's SimpleAccount. That smart account is Arena's operator and the Badges
 *   minter (it sends every bout op through SmoothSend).
 * - registrar: signs the EIP-712 registration attestations off-chain; it never sends a transaction.
 *
 * Prints the addresses the deploy script needs; never prints a private key.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { predictSimpleAccountAddress } from "@smoothsend/sdk/avax";
import { createPublicClient, type Hex, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { NETWORKS, ROOT } from "../src/config.ts";

const net = (process.argv.slice(2).find((a) => a !== "--") ??
	"fuji") as keyof typeof NETWORKS;
const cfg = NETWORKS[net];
if (!cfg) throw new Error(`unknown network ${net}`);

const file = resolve(ROOT, `.secrets/${net}-roles.json`);
type Roles = { operatorOwner: Hex; registrar: Hex };
let roles: Roles;
if (existsSync(file)) roles = JSON.parse(readFileSync(file, "utf8"));
else {
	roles = {
		operatorOwner: generatePrivateKey(),
		registrar: generatePrivateKey(),
	};
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(roles, null, 2));
}

const publicClient = createPublicClient({
	chain: cfg.chain,
	transport: http(process.env[cfg.rpcEnv] || undefined),
});
const operatorOwner = privateKeyToAccount(roles.operatorOwner).address;
const operator = await predictSimpleAccountAddress({
	publicClient: publicClient as never,
	factory: cfg.factory,
	owner: operatorOwner,
});
console.log(
	JSON.stringify(
		{
			network: net,
			operatorOwner,
			operator,
			registrar: privateKeyToAccount(roles.registrar).address,
		},
		null,
		2,
	),
);
