import { arenaAbi } from "@arena/chain";
import { encodeConfig } from "@arena/strategies";
import { encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Runtime } from "./runtime.ts";
import { sleep } from "./tasks.ts";

const ATTESTATION_TTL = 3_600n;

/**
 * Registers and confirms every house agent: the agent's own account sends registerAgent with
 * the registrar's attestation, then its owner account sends confirmAgent. Both first ops also
 * deploy the account. Idempotent: re-running only sends what the chain doesn't show yet.
 */
export async function setupHouse(rt: Runtime) {
	const { net, house, tasks } = rt;
	const arena = net.deployment.arena;
	const registrar = privateKeyToAccount(net.roles.registrar);

	let checked = false;
	for (;;) {
		const states = await Promise.all(
			house.map((m) =>
				net.publicClient.readContract({
					address: arena,
					abi: arenaAbi,
					functionName: "agents",
					args: [m.agent.account],
				}),
			),
		);
		if (!checked) {
			// Spend guard: each Fragment still to set up is up to two account-deploying ops (~2× a move).
			const pending = states.filter((st) => !st[2]).length;
			if (!rt.sender.budget.canAfford(pending * 2 * 2)) {
				throw new Error(
					`budget: ${pending} Fragments to set up; ${rt.sender.budget.summary()}`,
				);
			}
			checked = true;
		}
		let done = 0;
		for (const [i, m] of house.entries()) {
			const [owner, , confirmed] = states[i] as readonly [
				string,
				bigint,
				boolean,
				...unknown[],
			];
			if (confirmed) {
				done++;
				continue;
			}
			if (owner === "0x0000000000000000000000000000000000000000") {
				tasks.run(`register:${i}`, m.agent.account, async () => {
					const deadline =
						BigInt(Math.floor(Date.now() / 1000)) + ATTESTATION_TTL;
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
						message: {
							agent: m.agent.account,
							owner: m.owner.account,
							deadline,
						},
					});
					return rt.sender.send(m.agent, `register #${i}`, {
						to: arena,
						data: encodeFunctionData({
							abi: arenaAbi,
							functionName: "registerAgent",
							args: [
								m.owner.account,
								encodeConfig(m.config),
								deadline,
								attestation,
							],
						}),
					});
				});
			} else {
				tasks.run(`confirm:${i}`, m.owner.account, () =>
					rt.sender.send(m.owner, `confirm #${i}`, {
						to: arena,
						data: encodeFunctionData({
							abi: arenaAbi,
							functionName: "confirmAgent",
							args: [m.agent.account],
						}),
					}),
				);
			}
		}
		if (done === house.length) break;
		await sleep(3_000);
	}
	await tasks.drain();
	console.log(`house ready: ${house.length} agents confirmed`);
	console.log(rt.sender.budget.summary());
}
