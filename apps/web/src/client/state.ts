"use client";

// One source of game state for every screen: GET /api/state polled once (every 5 s while the
// page is visible, paused while hidden, refreshed at once on focus), shared through
// <GameStateProvider>. Screens read it with useGameState() instead of polling on their own.
import {
	createContext,
	createElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	GameState,
	OnboardingResponse,
	OnboardingStep,
	OnboardingUpdate,
	UnlockId,
} from "@/game/unlocks.ts";
import { type Api, useApi } from "./api.ts";

export type {
	GameState,
	OnboardingResponse,
	OnboardingStep,
	OnboardingUpdate,
	UnlockDef,
	UnlockId,
	UnlockNeed,
} from "@/game/unlocks.ts";
export {
	nextUnlock,
	ONBOARDING_STEPS,
	UNLOCK_IDS,
	UNLOCKS,
} from "@/game/unlocks.ts";

/** How often the state is read while the page is visible. */
export const STATE_POLL_MS = 5000;

/** GET /api/state. */
export const fetchGameState = (api: Api): Promise<GameState> =>
	api.call<GameState>("/api/state");

/** POST /api/onboarding. */
export const postOnboarding = (
	api: Api,
	update: OnboardingUpdate,
): Promise<OnboardingResponse> =>
	api.call<OnboardingResponse>("/api/onboarding", {
		method: "POST",
		body: JSON.stringify(update),
	});

export interface GameStateValue {
	/** Null until the first read lands (or while every read fails). */
	state: GameState | null;
	/** The last read failed (state keeps its previous value). */
	error: unknown;
	/** Read now. Concurrent calls share one request. */
	refresh: () => Promise<GameState | null>;
	/** Mark fresh unlocks as shown. */
	ack: (ids: UnlockId[]) => Promise<void>;
	/** Move onboarding to a step (null clears it). */
	setStep: (step: OnboardingStep | null) => Promise<void>;
	/** End onboarding. */
	finish: () => Promise<void>;
}

const noop = async () => {};
const INERT: GameStateValue = {
	state: null,
	error: null,
	refresh: async () => null,
	ack: noop,
	setStep: noop,
	finish: noop,
};

const GameStateContext = createContext<GameStateValue | null>(null);

/**
 * The shared game state. Outside a <GameStateProvider> it is inert (state null, actions do
 * nothing), so a screen rendered on its own still mounts.
 */
export function useGameState(): GameStateValue {
	return useContext(GameStateContext) ?? INERT;
}

/** True once `id` is open. False while the state is still loading. */
export function useUnlocked(id: UnlockId): boolean {
	return useGameState().state?.unlocks[id] ?? false;
}

/**
 * Polls GET /api/state for its subtree. Mount it once, inside the signed-in shell.
 * `enabled = false` stops reading (e.g. before sign-in).
 */
export function GameStateProvider({
	children,
	enabled = true,
}: {
	children: ReactNode;
	enabled?: boolean;
}) {
	// Held in a ref so a new client identity (e.g. wallets loading) does not restart the poll.
	const api = useApi();
	const apiRef = useRef(api);
	useEffect(() => {
		apiRef.current = api;
	}, [api]);
	const [state, setState] = useState<GameState | null>(null);
	const [error, setError] = useState<unknown>(null);
	const inflight = useRef<Promise<GameState | null> | null>(null);
	// Local edits made after a read started win over that read (no flicker back).
	const editSeq = useRef(0);
	const alive = useRef(true);

	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);

	const refresh = useCallback((): Promise<GameState | null> => {
		if (inflight.current) return inflight.current;
		const seq = editSeq.current;
		const p = fetchGameState(apiRef.current)
			.then((s) => {
				if (alive.current && seq === editSeq.current) {
					setState(s);
					setError(null);
				}
				return s;
			})
			.catch((e: unknown) => {
				if (alive.current) setError(e);
				return null;
			})
			.finally(() => {
				inflight.current = null;
			});
		inflight.current = p;
		return p;
	}, []);

	// One poll: runs while visible, pauses while hidden, reads at once on focus or return.
	useEffect(() => {
		if (!enabled) return;
		let timer: ReturnType<typeof setInterval> | null = null;
		const stop = () => {
			if (timer) clearInterval(timer);
			timer = null;
		};
		const start = () => {
			stop();
			void refresh();
			timer = setInterval(() => void refresh(), STATE_POLL_MS);
		};
		const onVisibility = () => {
			if (document.hidden) stop();
			else start();
		};
		const onFocus = () => {
			if (!document.hidden) void refresh();
		};
		if (!document.hidden) start();
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("focus", onFocus);
		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("focus", onFocus);
		};
	}, [enabled, refresh]);

	/** Apply a local edit now, send it, then take the server's answer. */
	const update = useCallback(
		async (
			body: OnboardingUpdate,
			local: (s: GameState) => GameState,
		): Promise<void> => {
			editSeq.current++;
			setState((s) => (s ? local(s) : s));
			try {
				const res = await postOnboarding(apiRef.current, body);
				editSeq.current++;
				if (alive.current)
					setState((s) =>
						s ? { ...s, onboarding: res.onboarding, fresh: res.fresh } : s,
					);
			} catch (e) {
				if (alive.current) setError(e);
				void refresh();
			}
		},
		[refresh],
	);

	const ack = useCallback(
		(ids: UnlockId[]) =>
			ids.length === 0
				? Promise.resolve()
				: update({ ack: ids }, (s) => ({
						...s,
						fresh: s.fresh.filter((id) => !ids.includes(id)),
					})),
		[update],
	);

	const setStep = useCallback(
		(step: OnboardingStep | null) =>
			update({ step }, (s) => ({
				...s,
				onboarding: { ...s.onboarding, step },
			})),
		[update],
	);

	const finish = useCallback(
		() =>
			update({ done: true }, (s) => ({
				...s,
				onboarding: { step: null, done: true },
			})),
		[update],
	);

	const value = useMemo<GameStateValue>(
		() => ({ state, error, refresh, ack, setStep, finish }),
		[state, error, refresh, ack, setStep, finish],
	);

	return createElement(GameStateContext.Provider, { value }, children);
}
