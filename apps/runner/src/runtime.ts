import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Budget } from "./budget.ts";
import { loadNetwork, type Network } from "./config.ts";
import { type HouseAgent, loadHouse } from "./house.ts";
import { Sender, type Signer } from "./sender.ts";
import { Tasks } from "./tasks.ts";

export interface HouseMember extends HouseAgent {
	index: number;
	agent: Signer;
	owner: Signer;
}

export interface Runtime {
	net: Network;
	sender: Sender;
	tasks: Tasks;
	operator: Signer;
	house: HouseMember[];
	byAccount: Map<Address, HouseMember>;
}

export async function createRuntime(opts: {
	network: string;
	houseSize: number;
	concurrency: number;
	budgetUsd?: number | undefined;
	avaxUsd?: number | undefined;
}): Promise<Runtime> {
	const net = loadNetwork(opts.network);
	if (net.sdkNetwork === "mainnet" && (!opts.budgetUsd || !opts.avaxUsd)) {
		throw new Error("mainnet needs --budget-usd and --avax-usd (spend guard)");
	}
	const budget = new Budget(opts.network, {
		...(opts.budgetUsd === undefined ? {} : { budgetUsd: opts.budgetUsd }),
		avaxUsd: opts.avaxUsd ?? 10,
	});
	const sender = new Sender(net, opts.concurrency, budget);
	const operator = await sender.signer(net.roles.operatorOwner);
	if (operator.account !== net.deployment.operator) {
		throw new Error(
			`operator key controls ${operator.account}, but Arena's operator is ${net.deployment.operator}`,
		);
	}
	const registrar = privateKeyToAccount(net.roles.registrar).address;
	if (registrar !== net.deployment.registrar) {
		throw new Error(`registrar key ${registrar} does not match deployment`);
	}
	const house = await Promise.all(
		loadHouse(opts.network, opts.houseSize).map(async (h, index) => ({
			...h,
			index,
			agent: await sender.signer(h.agentKey),
			owner: await sender.signer(h.ownerKey),
		})),
	);
	return {
		net,
		sender,
		tasks: new Tasks(sender),
		operator,
		house,
		byAccount: new Map(house.map((m) => [m.agent.account, m])),
	};
}
