// Visibility-aware polling for screens that read the server on a clock (the Gathering, its Ledger).
// One run at a time; the task says how long to wait before the next. Nothing runs while the page is
// hidden; coming back (or regaining focus) runs at once when the last run is older than `minGap`.
// A task that throws backs off, doubling the wait each time up to `maxBackoff`.
import { useEffect, useRef, useState } from "react";

const hidden = () => typeof document !== "undefined" && document.hidden;

export interface PollOptions {
	/** Longest wait after repeated failures (ms). */
	maxBackoff?: number;
	/** On return, skip the immediate run when the last one is younger than this (ms). */
	minGap?: number;
	/** False pauses the poll (no runs at all). */
	enabled?: boolean;
}

/**
 * Run `task` now, then again after the number of milliseconds it resolves to.
 * Returns `poke()`, which runs it now (e.g. after the player acts).
 */
export function usePoll(
	task: () => Promise<number>,
	{ maxBackoff = 60_000, minGap = 1_500, enabled = true }: PollOptions = {},
): () => void {
	const taskRef = useRef(task);
	taskRef.current = task;
	const pokeRef = useRef<() => void>(() => {});

	useEffect(() => {
		if (!enabled) return;
		let alive = true;
		let running = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let fails = 0;
		let lastRun = 0;
		let dueAt = 0;

		const schedule = (ms: number) => {
			clearTimeout(timer);
			dueAt = Date.now() + ms;
			if (!hidden()) timer = setTimeout(run, ms);
		};
		async function run() {
			if (!alive || running || hidden()) return;
			running = true;
			clearTimeout(timer);
			lastRun = Date.now();
			let wait: number;
			try {
				wait = await taskRef.current();
				fails = 0;
			} catch {
				fails += 1;
				wait = Math.min(maxBackoff, 2_000 * 2 ** fails);
			}
			running = false;
			if (alive) schedule(Math.max(250, wait));
		}
		const wake = () => {
			if (hidden()) {
				clearTimeout(timer);
				return;
			}
			if (running) return;
			const now = Date.now();
			if (now >= dueAt || now - lastRun >= minGap) void run();
			else schedule(dueAt - now);
		};

		pokeRef.current = () => void run();
		void run();
		document.addEventListener("visibilitychange", wake);
		window.addEventListener("focus", wake);
		window.addEventListener("pageshow", wake);
		return () => {
			alive = false;
			clearTimeout(timer);
			pokeRef.current = () => {};
			document.removeEventListener("visibilitychange", wake);
			window.removeEventListener("focus", wake);
			window.removeEventListener("pageshow", wake);
		};
	}, [enabled, maxBackoff, minGap]);

	return useRef(() => pokeRef.current()).current;
}

/**
 * The wall clock, ticking every `ms` while the page is visible. Stops while hidden and catches
 * up the moment the page is seen again.
 */
export function useVisibleNow(ms: number): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		let t: ReturnType<typeof setInterval> | undefined;
		const start = () => {
			clearInterval(t);
			t = undefined;
			if (hidden()) return;
			setNow(Date.now());
			t = setInterval(() => setNow(Date.now()), ms);
		};
		start();
		document.addEventListener("visibilitychange", start);
		return () => {
			clearInterval(t);
			document.removeEventListener("visibilitychange", start);
		};
	}, [ms]);
	return now;
}
