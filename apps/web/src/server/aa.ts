import { arenaAbi } from "@arena/chain";
import {
	createSmoothSendAvaxClient,
	ENTRY_POINT_V07_ADDRESS,
	hashUserOperationAvax,
	type SmoothSendAvaxClient,
	SmoothSendAvaxSubmitter,
	type UserOperationAvax,
} from "@smoothsend/sdk/avax";
import {
	type Address,
	decodeFunctionData,
	erc20Abi,
	type Hex,
	isAddressEqual,
	parseAbi,
	toHex,
} from "viem";
import { packByAmount, treasuryAddress, USDC_FUJI } from "@/game/vestry.ts";
import { ARENA, accountFor, FACTORY, publicClient } from "./chain.ts";
import { env, HttpError } from "./env.ts";

const simpleAccountAbi = parseAbi([
	"function execute(address dest, uint256 value, bytes func)",
]);

/** The SDK's private draft builder (nonce, initCode, fees); mirrors apps/runner/src/sender.ts. */
interface DraftBuilder {
	buildDraft(
		calls: { to: Address; data: Hex }[],
		overrides: object,
	): Promise<{
		userOp: Record<string, unknown>;
		chainId: number;
		entryPoint: Address;
	}>;
}

function clientFor(eoa: Address): SmoothSendAvaxClient {
	return createSmoothSendAvaxClient({
		apiKey: env("SMOOTHSEND_SK_FUJI"),
		network: "testnet",
		publicClient: publicClient() as never,
		ownerAddress: eoa,
		accountFactory: FACTORY,
		signUserOpHash: () => {
			throw new Error("server never signs player ops");
		},
	});
}

/** Builds a sponsored UserOp for `call` from the player's SimpleAccount, ready for the player to sign. */
export async function prepareOp(
	eoa: Address,
	call: { to: Address; data: Hex },
): Promise<{ userOp: UserOperationAvax; userOpHash: string }> {
	const account = await accountFor(eoa);
	let direct: bigint;
	try {
		direct = await publicClient().estimateGas({
			account,
			to: call.to,
			data: call.data,
		});
	} catch {
		throw new HttpError(409, "would_revert");
	}
	const callGas = (direct * 11n) / 10n + 10_000n;
	const client = clientFor(eoa);
	const sub = client.submitter;
	const built = await (client as unknown as DraftBuilder).buildDraft(
		[call],
		{},
	);
	const draft = { ...built.userOp, signature: "0x" };
	const gas = await sub.estimateUserOperationGas(
		draft as never,
		built.entryPoint,
	);
	let op = SmoothSendAvaxSubmitter.applyGasEstimate(draft as never, {
		...gas,
		callGasLimit: toHex(callGas),
	});
	const pm = await sub.paymasterSign({
		mode: "developer-sponsored",
		userOp: op,
	} as never);
	op = SmoothSendAvaxSubmitter.applyPaymasterAndData(op, pm.paymasterAndData);
	const userOpHash = hashUserOperationAvax({
		chainId: built.chainId,
		entryPointAddress: built.entryPoint,
		userOperation: op,
	});
	return { userOp: op, userOpHash };
}

/**
 * Checks the op is the player's own confirmAgent/retune call on the Arena, or a Vestry payment:
 * USDC.transfer(treasury, a pack's price).
 */
export function checkOp(op: UserOperationAvax, account: Address): void {
	if (
		typeof op?.sender !== "string" ||
		typeof op.callData !== "string" ||
		!isAddressEqual(op.sender as Address, account)
	) {
		throw new HttpError(403, "forbidden_op");
	}
	try {
		const outer = decodeFunctionData({
			abi: simpleAccountAbi,
			data: op.callData as Hex,
		});
		const [dest, value, func] = outer.args;
		if (value !== 0n) throw new Error();
		if (isAddressEqual(dest, ARENA)) {
			const inner = decodeFunctionData({ abi: arenaAbi, data: func });
			if (
				inner.functionName !== "confirmAgent" &&
				inner.functionName !== "retune"
			)
				throw new Error();
		} else if (isAddressEqual(dest, USDC_FUJI)) {
			const inner = decodeFunctionData({ abi: erc20Abi, data: func });
			if (inner.functionName !== "transfer") throw new Error();
			const [to, amount] = inner.args;
			if (
				!isAddressEqual(to, treasuryAddress(process.env.VESTRY_TREASURY)) ||
				!packByAmount(amount)
			)
				throw new Error();
		} else {
			throw new Error();
		}
	} catch {
		throw new HttpError(403, "forbidden_op");
	}
}

/** Attaches the player's signature and hands the op to the bundler. */
export async function submitOp(
	eoa: Address,
	op: UserOperationAvax,
	signature: Hex,
): Promise<string> {
	const sub = clientFor(eoa).submitter;
	try {
		return await sub.sendUserOperation(
			{ ...op, signature },
			ENTRY_POINT_V07_ADDRESS,
		);
	} catch (e) {
		console.error(
			"[op/submit]",
			String((e as Error).message ?? e).slice(0, 200),
		);
		throw new HttpError(502, "submit_failed");
	}
}

export async function opStatus(
	hash: string,
): Promise<{ state: "pending" | "landed"; tx?: string; success?: boolean }> {
	const sub = clientFor("0x0000000000000000000000000000000000000001").submitter;
	const r = await sub.getUserOperationReceipt(hash);
	if (!r) return { state: "pending" };
	return {
		state: "landed",
		tx: r.receipt?.transactionHash,
		success: r.success,
	};
}
