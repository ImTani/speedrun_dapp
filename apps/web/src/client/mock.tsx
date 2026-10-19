"use client";

// Dev-only stand-in for the server and the Claimant's signing hand, used by app/preview.
// It answers through three doors so every screen sees the same fixture world:
//   1. ApiContext: useApi() returns this mock instead of the Privy-backed client.
//   2. setPublicReads(): publicApi.gathering/standings and readGathering/readStandings.
//   3. A window.fetch shim for /api/gathering, /api/standings, /api/me and /api/op/status,
//      so screens that still fetch those paths directly also see the fixtures.
//      Remove (3) once no screen fetches /api/* directly.

import { type ReactNode, useEffect, useState } from "react";
import {
	type Api,
	ApiContext,
	ApiError,
	type Me,
	setPublicReads,
} from "./api.ts";
import {
	createGatheringSource,
	fragmentRow,
	type GatheringStateName,
	initialMe,
	type MeState,
	mockStandings,
} from "./mockData.ts";

export interface MockState {
	/** What /api/me answers. Default "confirmed". */
	me?: MeState;
	/** What /api/gathering answers. Default "commit". */
	gathering?: GatheringStateName;
	/** Aspect (0..6) of the Claimant's own Fragment. Default 2 (Echo). */
	aspect?: number;
	/** How long runPlayerOp (sealing / re-carving) takes before it resolves. Default 2500 ms. */
	opDelayMs?: number;
	/** How a player op ends: "ok" resolves true, "fail" resolves false, "error" rejects. */
	opOutcome?: "ok" | "fail" | "error";
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const never = () => new Promise<never>(() => {});

function createMockApi(state: MockState): {
	api: Api;
	fetchShim: (path: string) => Promise<Response> | null;
} {
	const meState = state.me ?? "confirmed";
	const gState = state.gathering ?? "commit";
	const aspect = Math.max(0, Math.min(6, Math.trunc(state.aspect ?? 2)));
	const opDelay = state.opDelayMs ?? 2500;
	const outcome = state.opOutcome ?? "ok";

	let me: Me = initialMe(meState, aspect);
	const selfLight = meState === "confirmed-dark" ? -14 : 47;
	const source = createGatheringSource(gState, aspect, me.fragment != null);
	const readsDown = gState === "vision";

	const standingsNow = () => {
		const f = me.fragment;
		const self =
			f && f.status === "confirmed"
				? {
						name: f.name,
						aspect: Number(BigInt(f.config) & 0xffn),
						light: selfLight,
						duels: 9,
					}
				: undefined;
		return { rows: mockStandings(self) };
	};

	const meNow = async (): Promise<Me> => {
		await wait(250);
		if (meState === "loading") return never();
		if (meState === "unavailable") throw new ApiError(503, "unavailable");
		if (meState === "silent") throw new ApiError(500, "internal");
		return structuredClone(me);
	};

	const gathering = async () => {
		await wait(120);
		if (readsDown) throw new ApiError(503, "unavailable");
		return source.next();
	};
	const standings = async () => {
		await wait(120);
		if (readsDown) throw new ApiError(503, "unavailable");
		return standingsNow();
	};
	const opStatus = async (_hash: string) => ({
		state: "landed" as const,
		tx: `0x${"ab".repeat(32)}`,
		success: outcome !== "fail",
	});

	const api: Api = {
		me: meNow,
		createFragment: async (name, config) => {
			await wait(900);
			const asp = Number(BigInt(config) & 0xffn);
			me = {
				...me,
				fragment: { ...fragmentRow("requested", asp, name), config },
			};
			// the Fragment wakes a few seconds later and awaits the seal
			setTimeout(() => {
				if (me.fragment?.status === "requested")
					me = {
						...me,
						fragment: {
							...me.fragment,
							status: "registered",
							agent: fragmentRow("registered", asp).agent,
						},
					};
			}, 4000);
			return {
				fragment: structuredClone(me.fragment as NonNullable<Me["fragment"]>),
			};
		},
		prepare: async () => ({ userOp: {}, userOpHash: `0x${"11".repeat(32)}` }),
		submit: async () => ({ userOpHash: `0x${"22".repeat(32)}` }),
		signRaw: async () => `0x${"33".repeat(65)}`,
		runPlayerOp: async (action) => {
			await wait(opDelay);
			if (outcome === "error") throw new Error("mock op error");
			if (outcome === "fail") return false;
			const f = me.fragment;
			if (f && action.action === "confirm")
				me = { ...me, fragment: { ...f, status: "confirmed" } };
			if (f && action.action === "retune")
				me = { ...me, fragment: { ...f, config: action.config } };
			return true;
		},
		gathering,
		standings,
		opStatus,
	};

	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	const answer = (p: Promise<unknown>) =>
		p.then(
			(b) => json(b),
			(e) =>
				json(
					{ error: e instanceof Error ? e.message : "error" },
					e instanceof ApiError ? e.status : 500,
				),
		);
	const fetchShim = (path: string): Promise<Response> | null => {
		if (path === "/api/gathering") return answer(gathering());
		if (path === "/api/standings") return answer(standings());
		if (path === "/api/me") return answer(meNow());
		if (path === "/api/op/status") return answer(opStatus(""));
		return null;
	};

	return { api, fetchShim };
}

/**
 * Overrides useApi() (and the public reads) with a fixture world for its subtree.
 * Children mount only after the override is in place, so their first poll sees mocks.
 */
export function MockApiProvider({
	state,
	children,
}: {
	state: MockState;
	children: ReactNode;
}) {
	const [mock] = useState(() => createMockApi(state));
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setPublicReads({
			gathering: mock.api.gathering,
			standings: mock.api.standings,
		});
		const realFetch = window.fetch;
		const shimmed: typeof fetch = (input, init) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url;
			const u = new URL(url, window.location.href);
			const hit =
				u.origin === window.location.origin ? mock.fetchShim(u.pathname) : null;
			return hit ?? realFetch(input, init);
		};
		window.fetch = shimmed;
		setReady(true);
		return () => {
			setPublicReads(null);
			if (window.fetch === shimmed) window.fetch = realFetch;
		};
	}, [mock]);

	return (
		<ApiContext.Provider value={mock.api}>
			{ready ? children : null}
		</ApiContext.Provider>
	);
}
