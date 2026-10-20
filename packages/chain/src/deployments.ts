import type { Address } from "viem";
import fuji from "../../../contracts/deployments/43113.json" with {
	type: "json",
};

export interface Deployment {
	owner: Address;
	operator: Address;
	registrar: Address;
	arena: Address;
	badges: Address;
	block: number;
}

/** Deployed contracts by chain id: Fuji (daily game) and C-Chain mainnet (the Conclave). */
export const DEPLOYMENTS: Partial<Record<number, Deployment>> = {
	43113: fuji as Deployment,
	43114: mainnet as Deployment,
};

export function deploymentFor(chainId: number): Deployment {
	const d = DEPLOYMENTS[chainId];
	if (!d) throw new Error(`no Arena deployment for chain ${chainId}`);
	return d;
}

/** SmoothSend's SimpleAccountFactory (eth-infinitism v0.7) per chain. */
export const ACCOUNT_FACTORY: Record<number, Address> = {
	43113: "0x55326f005a0959F75496cdd692505fFB520972f5",
	43114: "0x863b8E15D37Abf33d5177108f6a07D541a698D25",
};
