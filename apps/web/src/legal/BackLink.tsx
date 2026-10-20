"use client";

import { legal } from "@/lexicon/legal.ts";
import s from "./legal.module.css";

/** Where Back goes when there is nothing of ours to go back to (opened from a link or a new tab). */
const FALLBACK = "/play";

/** True when the previous history entry is one of our own pages. */
function cameFromUs(): boolean {
	// Navigation API (Chromium, Safari 26+): canGoBack only counts this origin's entries.
	const nav = (window as Window & { navigation?: { canGoBack?: boolean } })
		.navigation;
	if (typeof nav?.canGoBack === "boolean") return nav.canGoBack;
	try {
		return (
			window.history.length > 1 &&
			!!document.referrer &&
			new URL(document.referrer).origin === window.location.origin
		);
	} catch {
		return false;
	}
}

/**
 * "Back": returns to the page the reader came from (the landing page, the title screen, the
 * colophon...) through history, so scroll and state survive; otherwise opens the game. A real
 * link, so it works before hydration and with modifier keys.
 */
export function BackLink() {
	return (
		<a
			href={FALLBACK}
			className={s.back}
			onClick={(e) => {
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
					return;
				if (!cameFromUs()) return;
				e.preventDefault();
				window.history.back();
			}}
		>
			<span aria-hidden="true">←</span> {legal.page.back}
		</a>
	);
}
