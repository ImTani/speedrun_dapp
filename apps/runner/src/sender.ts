import {
	createSmoothSendAvaxClient,
	hashUserOperationAvax,
	type SmoothSendAvaxClient,
	SmoothSendAvaxSubmitter,
} from "@smoothsend/sdk/avax";
import { type Address, type Hex, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { predictAccount } from "./aa/simpleAccount.ts";
import type { Network } from "./config.ts";

export interface Signer {
	/** EOA that signs UserOps; never sends a transaction itself. */
	owner: Address;
	/** The SimpleAccount it owns: the address contracts see as msg.sender. */
	account: Address;
	client: SmoothSendAvaxClient;
	signHash: (hash: Hex) => Promise<Hex>;
}

/** The SDK's private draft builder (nonce, initCode, fees); see submitWithCallGas. */
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

export interface SendResult {
	ok: boolean;
	ms: number;
	userOpHash?: string;
	tx?: string | undefined;
	/** False when the UserOp landed but its call reverted. */
	success?: boolean | undefined;
	error?: string;
}

/**
 * Sends sponsored UserOps through SmoothSend with two limits learned in M0:
 * - at most one op in flight per account (a second concurrent op from one account can be silently
 *   dropped by the bundler), and
 * - a small global cap, because the bundler's own transaction nonce races under concurrency.
 * The gateway also sometimes accepts an op that never lands (M2 setup: 6 of 60). Landed ops took
 * about 11 s at p50, so an op with no receipt after RECEIPT_TIMEOUT_MS is reported as dropped.
 * Nothing here retries: callers re-read chain state and send again whatever hasn't landed.
 */
const RECEIPT_TIMEOUT_MS = 60_000;
const RECEIPT_POLL_MS = 1_500;

export class Sender {
	readonly busy = new Set<Address>();
	readonly stats = {
		sent: 0,
		ok: 0,
		reverted: 0,
		failed: 0,
		dropped: 0,
		wouldRevert: 0,
	};
	readonly errors = new Map<string, number>();
	private active = 0;
	private readonly waiting: (() => void)[] = [];

	constructor(
		private readonly net: Network,
		private readonly concurrency: number,
	) {}

	async signer(privateKey: Hex): Promise<Signer> {
		const owner = privateKeyToAccount(privateKey);
		const account = await predictAccount(
			this.net.publicClient,
			this.net.factory,
			owner.address,
		);
		// SimpleAccount v0.7 checks an EIP-191 signature over the userOpHash.
		const signHash = (hash: Hex) =>
			owner.signMessage({ message: { raw: hash } });
		const client = createSmoothSendAvaxClient({
			apiKey: this.net.apiKey,
			network: this.net.sdkNetwork,
			publicClient: this.net.publicClient as never,
			ownerAddress: owner.address,
			accountFactory: this.net.factory,
			signUserOpHash: ({ hash }) => signHash(hash as Hex),
		});
		return { owner: owner.address, account, client, signHash };
	}

	/**
	 * The gateway's gas estimate gave openBout(25 agents) a callGasLimit of 240k against ~870k needed,
	 * so the op landed and reverted out of gas. The SDK exposes no override, so this repeats
	 * SmoothSendAvaxSubmitter.submitSponsoredUserOperation with callGasLimit raised to `callGas`
	 * before the paymaster signs. It leans on the SDK's private buildDraft; re-check on SDK upgrades.
	 */
	private async submitWithCallGas(
		signer: Signer,
		call: { to: Address; data: Hex },
		callGas: bigint,
	): Promise<string> {
		const sub = signer.client.submitter;
		const built = await (signer.client as unknown as DraftBuilder).buildDraft(
			[call],
			{},
		);
		const draft = { ...built.userOp, signature: "0x" };
		const gas = await sub.estimateUserOperationGas(
			draft as never,
			built.entryPoint,
		);
		const estimated = BigInt(gas.callGasLimit);
		let op = SmoothSendAvaxSubmitter.applyGasEstimate(draft as never, {
			...gas,
			callGasLimit: toHex(estimated > callGas ? estimated : callGas),
		});
		const pm = await sub.paymasterSign({
			mode: "developer-sponsored",
			userOp: op,
		} as never);
		op = SmoothSendAvaxSubmitter.applyPaymasterAndData(op, pm.paymasterAndData);
		const hash = hashUserOperationAvax({
			chainId: built.chainId,
			entryPointAddress: built.entryPoint,
			userOperation: op,
		});
		op = { ...op, signature: await signer.signHash(hash as Hex) };
		return sub.sendUserOperation(op, built.entryPoint);
	}

	/**
	 * Sizes callGasLimit from a direct eth_estimateGas of the call from the smart account's address
	 * (plus headroom for SimpleAccount.execute), instead of trusting the gateway's estimate. A call
	 * that would revert is reported and not sent, so timing races don't cost a sponsored op.
	 */
	async send(
		signer: Signer,
		label: string,
		call: { to: Address; data: Hex },
	): Promise<SendResult> {
		if (this.busy.has(signer.account)) {
			throw new Error(
				`${label}: ${signer.account} already has an op in flight`,
			);
		}
		this.busy.add(signer.account);
		await this.acquire();
		const t = performance.now();
		this.stats.sent++;
		let out: SendResult;
		try {
			let direct: bigint;
			try {
				direct = await this.net.publicClient.estimateGas({
					account: signer.account,
					to: call.to,
					data: call.data,
				});
			} catch (e) {
				this.stats.wouldRevert++;
				const reason =
					(e as { shortMessage?: string }).shortMessage ?? String(e);
				throw new WouldRevert(reason.replace(/\s+/g, " ").slice(0, 160));
			}
			// estimateGas includes the 21k intrinsic cost, which the inner call doesn't pay.
			const callGas = (direct * 12n) / 10n + 30_000n;
			const userOpHash = await this.submitWithCallGas(signer, call, callGas);
			const receipt = await signer.client.submitter.waitForUserOperationReceipt(
				userOpHash,
				{ pollMs: RECEIPT_POLL_MS, timeoutMs: RECEIPT_TIMEOUT_MS },
			);
			const ms = Math.round(performance.now() - t);
			if (!receipt) {
				out = { ok: false, ms, userOpHash, error: "dropped: no receipt" };
				this.stats.dropped++;
			} else {
				out = {
					ok: true,
					ms,
					userOpHash,
					tx: receipt.receipt?.transactionHash,
					success: receipt.success,
				};
				if (out.success === false) this.stats.reverted++;
				else this.stats.ok++;
			}
		} catch (e) {
			const error = String((e as Error).message ?? e)
				.replace(/\s+/g, " ")
				.slice(0, 200);
			out = { ok: false, ms: Math.round(performance.now() - t), error };
			if (!(e instanceof WouldRevert)) this.stats.failed++;
			const key = error.slice(0, 90);
			this.errors.set(key, (this.errors.get(key) ?? 0) + 1);
		} finally {
			this.release();
			this.busy.delete(signer.account);
		}
		const status = !out.ok
			? `${out.error?.startsWith("would revert") ? "SKIP" : "FAIL"} ${out.error}`
			: out.success === false
				? `REVERTED ${out.tx}`
				: `ok ${out.tx}`;
		console.log(
			`${new Date().toISOString().slice(11, 19)} ${label} ${(out.ms / 1000).toFixed(1)}s ${status}`,
		);
		return out;
	}

	private async acquire() {
		if (this.active < this.concurrency) {
			this.active++;
			return;
		}
		await new Promise<void>((r) => this.waiting.push(r));
	}

	private release() {
		const next = this.waiting.shift();
		if (next) next();
		else this.active--;
	}
}

class WouldRevert extends Error {
	constructor(reason: string) {
		super(`would revert: ${reason}`);
	}
}
