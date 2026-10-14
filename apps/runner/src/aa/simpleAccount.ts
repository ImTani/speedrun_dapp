import {
	type Account,
	type Address,
	concat,
	encodeFunctionData,
	type Hex,
	type PublicClient,
	pad,
	parseAbi,
	toHex,
	type WalletClient,
} from "viem";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";

/** eth-infinitism v0.7 SimpleAccountFactory / SimpleAccount — what SmoothSend deploys on C-Chain. */
export const simpleAccountFactoryAbi = parseAbi([
	"function createAccount(address owner, uint256 salt) returns (address)",
	"function getAddress(address owner, uint256 salt) view returns (address)",
]);
export const simpleAccountAbi = parseAbi([
	"function execute(address dest, uint256 value, bytes func)",
	"function executeBatch(address[] dest, uint256[] value, bytes[] func)",
]);

export interface PackedUserOperation {
	sender: Address;
	nonce: bigint;
	initCode: Hex;
	callData: Hex;
	accountGasLimits: Hex;
	preVerificationGas: bigint;
	gasFees: Hex;
	paymasterAndData: Hex;
	signature: Hex;
}

export interface GasLimits {
	verificationGasLimit: bigint;
	callGasLimit: bigint;
	preVerificationGas: bigint;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
}

const pack128 = (high: bigint, low: bigint): Hex =>
	concat([pad(toHex(high), { size: 16 }), pad(toHex(low), { size: 16 })]);

export async function predictAccount(
	client: PublicClient,
	factory: Address,
	owner: Address,
	salt = 0n,
): Promise<Address> {
	return client.readContract({
		address: factory,
		abi: simpleAccountFactoryAbi,
		functionName: "getAddress",
		args: [owner, salt],
	});
}

export function executeCall(to: Address, data: Hex, value = 0n): Hex {
	return encodeFunctionData({
		abi: simpleAccountAbi,
		functionName: "execute",
		args: [to, value, data],
	});
}

/**
 * Builds and signs a v0.7 PackedUserOperation for a SimpleAccount owned by `owner`.
 * SimpleAccount v0.7 validates `ECDSA.recover(toEthSignedMessageHash(userOpHash))`, i.e. an EIP-191
 * signature over the raw 32-byte hash — this is the exact behaviour C8 needs Privy to reproduce.
 */
export async function buildUserOp(params: {
	client: PublicClient;
	owner: Account & { signMessage: NonNullable<Account["signMessage"]> };
	sender: Address;
	factory: Address;
	callData: Hex;
	gas: GasLimits;
	salt?: bigint;
}): Promise<PackedUserOperation> {
	const { client, owner, sender, factory, callData, gas, salt = 0n } = params;
	const deployed = (await client.getCode({ address: sender }))?.length ?? 0;
	const initCode: Hex =
		deployed > 2
			? "0x"
			: concat([
					factory,
					encodeFunctionData({
						abi: simpleAccountFactoryAbi,
						functionName: "createAccount",
						args: [owner.address, salt],
					}),
				]);
	const nonce = await client.readContract({
		address: entryPoint07Address,
		abi: entryPoint07Abi,
		functionName: "getNonce",
		args: [sender, 0n],
	});
	const op: PackedUserOperation = {
		sender,
		nonce,
		initCode,
		callData,
		accountGasLimits: pack128(gas.verificationGasLimit, gas.callGasLimit),
		preVerificationGas: gas.preVerificationGas,
		gasFees: pack128(gas.maxPriorityFeePerGas, gas.maxFeePerGas),
		paymasterAndData: "0x",
		signature: "0x",
	};
	const hash = await client.readContract({
		address: entryPoint07Address,
		abi: entryPoint07Abi,
		functionName: "getUserOpHash",
		args: [op],
	});
	op.signature = await owner.signMessage({ message: { raw: hash } });
	return op;
}

export interface HandleOpsResult {
	txHash: Hex;
	/** Gas of the whole bundle transaction, including the 21k intrinsic cost and calldata. */
	txGasUsed: bigint;
	/** EntryPoint's `actualGasUsed` from UserOperationEvent — what the op is charged for. */
	actualGasUsed: bigint;
	success: boolean;
}

/** Acts as a one-op bundler: calls EntryPoint.handleOps directly from `bundler`. */
export async function handleOps(
	client: PublicClient,
	bundler: WalletClient & { account: Account },
	op: PackedUserOperation,
): Promise<HandleOpsResult> {
	const txHash = await bundler.writeContract({
		address: entryPoint07Address,
		abi: entryPoint07Abi,
		functionName: "handleOps",
		args: [[op], bundler.account.address],
		account: bundler.account,
		chain: bundler.chain ?? null,
		gas: 8_000_000n,
	});
	const receipt = await client.waitForTransactionReceipt({ hash: txHash });
	const logs = await client.getContractEvents({
		address: entryPoint07Address,
		abi: entryPoint07Abi,
		eventName: "UserOperationEvent",
		blockHash: receipt.blockHash,
	});
	const event = logs.find((l) => l.transactionHash === txHash);
	if (!event)
		throw new Error(
			`no UserOperationEvent in ${txHash} (status ${receipt.status})`,
		);
	return {
		txHash,
		txGasUsed: receipt.gasUsed,
		actualGasUsed: event.args.actualGasUsed ?? 0n,
		success: event.args.success ?? false,
	};
}
