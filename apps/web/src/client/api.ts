"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { createWalletClient, custom, type Hex } from "viem";

export type FragmentStatus =
	| "requested"
	| "registered"
	| "confirmed"
	| "failed";

export interface FragmentRow {
	id: number;
	status: FragmentStatus;
	agent: string | null;
	config: string;
	name: string;
	error: string | null;
}

export interface Me {
	account: string | null;
	fragment: FragmentRow | null;
	boutActive: boolean;
}

export interface StandingRow {
	agent: string;
	name: string;
	aspect: number;
	light: number;
	duels: number;
}

export interface GatheringEvent {
	block: number;
	logIndex: number;
	tx: string;
	name: string;
	gathering: string | null;
	round: number | null;
	agent: string | null;
	data: Record<string, unknown>;
}

export interface GatheringState {
	active: boolean;
	gathering: null | {
		id: string;
		round: number;
		rounds: number;
		movesPerMatch: number;
		phase: "commit" | "reveal" | "between";
		commitDeadline: number;
		revealDeadline: number;
		participants: { agent: string; name: string; aspect: number }[];
	};
	events: GatheringEvent[];
}

export type PlayerAction =
	| { action: "confirm" }
	| { action: "retune"; config: string };

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

async function parse<T>(res: Response): Promise<T> {
	const body = (await res.json().catch(() => ({}))) as { error?: string };
	if (!res.ok)
		throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
	return body as T;
}

/** Unauthenticated reads (usable outside Privy context too). */
export const publicApi = {
	gathering: () =>
		fetch("/api/gathering", { cache: "no-store" }).then((r) =>
			parse<GatheringState>(r),
		),
	standings: () =>
		fetch("/api/standings", { cache: "no-store" }).then((r) =>
			parse<{ rows: StandingRow[] }>(r),
		),
	opStatus: (hash: string) =>
		fetch(`/api/op/status?hash=${encodeURIComponent(hash)}`, {
			cache: "no-store",
		}).then((r) =>
			parse<{ state: "pending" | "landed"; tx?: string; success?: boolean }>(r),
		),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useApi() {
	const { getAccessToken } = usePrivy();
	const { wallets } = useWallets();

	const authed = useCallback(
		async <T>(path: string, init: RequestInit = {}): Promise<T> => {
			const token = await getAccessToken();
			const headers = new Headers(init.headers);
			if (token) headers.set("Authorization", `Bearer ${token}`);
			if (init.body) headers.set("Content-Type", "application/json");
			return parse<T>(
				await fetch(path, { ...init, headers, cache: "no-store" }),
			);
		},
		[getAccessToken],
	);

	const signRaw = useCallback(
		async (hash: Hex): Promise<Hex> => {
			const wallet = wallets.find((w) => w.walletClientType === "privy");
			if (!wallet) throw new Error("no embedded wallet");
			const provider = await wallet.getEthereumProvider();
			const account = wallet.address as Hex;
			const client = createWalletClient({
				account,
				transport: custom(provider),
			});
			return client.signMessage({ account, message: { raw: hash } });
		},
		[wallets],
	);

	return useMemo(() => {
		const me = () => authed<Me>("/api/me");
		const createFragment = (name: string, config: string) =>
			authed<{ fragment: FragmentRow }>("/api/fragment", {
				method: "POST",
				body: JSON.stringify({ name, config }),
			});
		const prepare = (body: PlayerAction) =>
			authed<{ userOp: Record<string, unknown>; userOpHash: Hex }>(
				"/api/op/prepare",
				{
					method: "POST",
					body: JSON.stringify(body),
				},
			);
		const submit = (userOp: Record<string, unknown>, signature: Hex) =>
			authed<{ userOpHash: string }>("/api/op/submit", {
				method: "POST",
				body: JSON.stringify({ userOp, signature }),
			});

		/** prepare -> sign -> submit -> poll until landed (90s). Resolves true on success. */
		const runPlayerOp = async (action: PlayerAction): Promise<boolean> => {
			const { userOp, userOpHash } = await prepare(action);
			const signature = await signRaw(userOpHash);
			const { userOpHash: sent } = await submit(userOp, signature);
			const until = Date.now() + 90_000;
			while (Date.now() < until) {
				await sleep(2000);
				const s = await publicApi.opStatus(sent).catch(() => null);
				if (s?.state === "landed") return s.success !== false;
			}
			throw new Error("timeout");
		};

		return {
			me,
			createFragment,
			prepare,
			submit,
			signRaw,
			runPlayerOp,
			...publicApi,
		};
	}, [authed, signRaw]);
}
