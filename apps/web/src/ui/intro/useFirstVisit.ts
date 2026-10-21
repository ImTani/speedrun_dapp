"use client";

/**
 * When to show a tab's first-visit card: once per tab on this device (localStorage), and only
 * when nothing else is teaching. It waits while onboarding runs, while a coach mark is up, while
 * a just-opened mechanic on this tab still has its coach to come, and while any sheet or
 * celebration is over the screen, then shows on the first quiet check.
 *
 *   const [show, dismiss] = useFirstVisit("spire");
 *
 * In development `?intro` in the address shows every card again (for review captures); the
 * /preview harness shows none unless `?intro` is there.
 */
import { useCallback, useEffect, useState } from "react";
import { type GameState, type UnlockId, useGameState } from "@/client/state";
import type { IntroTab } from "@/lexicon/codex";
import coach from "@/ui/coach/coach.module.css";

/** Listed with the other `apostasy.*` keys; cleared with them on account deletion. */
export const INTRO_KEY = "apostasy.intro.seen";

/** Let the screen land before checking. */
const SETTLE_MS = 1100;
/** How often to look again while something else is teaching. */
const CHECK_MS = 700;

/** The tab each mechanic is first met on (as onboarding/firstActions HOME). */
const HOME: Record<UnlockId, IntroTab> = {
	fragment: "fragment",
	gathering: "gathering",
	vigil: "fragment",
	retune: "fragment",
	marks: "fragment",
	spire: "spire",
	reliquary: "reliquary",
	vestry: "vestry",
};

function readSeen(): Set<string> {
	try {
		const raw = window.localStorage.getItem(INTRO_KEY);
		const list: unknown = raw ? JSON.parse(raw) : [];
		return new Set(
			Array.isArray(list)
				? list.filter((x): x is string => typeof x === "string")
				: [],
		);
	} catch {
		return new Set();
	}
}

function markSeen(tab: IntroTab) {
	try {
		const seen = readSeen();
		seen.add(tab);
		window.localStorage.setItem(INTRO_KEY, JSON.stringify([...seen]));
	} catch {}
}

const dev = process.env.NODE_ENV !== "production";
const hasIntroParam = () =>
	new URLSearchParams(window.location.search).has("intro");
/** Development: `?intro` shows every card again, seen or not. */
const forced = () => dev && hasIntroParam();
/** The preview harness keeps its captures clean: cards only when `?intro` asks for them. */
const muted = () =>
	dev && window.location.pathname.startsWith("/preview") && !hasIntroParam();

/** Something on this tab is still to be taught by the onboarding or an unlock's coach. */
function teaching(tab: IntroTab, state: GameState | null): boolean {
	if (!state) return false;
	if (!state.onboarding.done) return true;
	return state.fresh.some((id) => {
		if (HOME[id] !== tab) return false;
		// The Vigil's coach waits for something to collect; don't wait on it here.
		if (id === "vigil") {
			const v = state.profile?.vigil;
			return !!v && (v.ash > 0 || v.resonance > 0);
		}
		return true;
	});
}

/** Anything over the screen right now: a coach mark, a sheet or dialog, a celebration. */
function covered(): boolean {
	const marks = coach.root ? `.${CSS.escape(coach.root)}` : null;
	return (
		(!!marks && !!document.querySelector(marks)) ||
		!!document.querySelector('[aria-modal="true"]')
	);
}

export function useFirstVisit(
	tab: IntroTab,
	/** False holds the card back (e.g. the screen is still loading). */
	ready = true,
): [boolean, () => void] {
	const { state } = useGameState();
	const [show, setShow] = useState(false);
	const [done, setDone] = useState(false);
	const busy = teaching(tab, state);

	useEffect(() => {
		if (done || show || !ready || busy) return;
		if (muted() || (!forced() && readSeen().has(tab))) {
			setDone(true);
			return;
		}
		let t: ReturnType<typeof setTimeout>;
		const look = () => {
			if (document.hidden || covered()) {
				t = setTimeout(look, CHECK_MS);
				return;
			}
			markSeen(tab);
			setShow(true);
		};
		t = setTimeout(look, SETTLE_MS);
		return () => clearTimeout(t);
	}, [tab, ready, busy, done, show]);

	const dismiss = useCallback(() => {
		setShow(false);
		setDone(true);
	}, []);

	return [show, dismiss];
}
