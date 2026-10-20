"use client";

import { useEffect, useRef } from "react";

/**
 * Back closes the sheet. While `open`, a history entry stands for the sheet, so Android's back
 * button (and the browser's) closes it instead of leaving the app. Closing it any other way
 * (its button, the scrim, Escape) takes the entry back off.
 *
 * The entry keeps the router's own state (Next.js syncs native pushState), and is removed a tick
 * after close only if it is still the current one: a remount (React's dev double effect) or a
 * link followed from inside the sheet never steps the reader back a page.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
	const close = useRef(onClose);
	close.current = onClose;

	useEffect(() => {
		if (!open) return;
		const mark = `sheet-${Math.random().toString(36).slice(2)}`;
		const base = (window.history.state ?? {}) as Record<string, unknown>;
		window.history.pushState({ ...base, __sheet: mark }, "");
		let popped = false;
		const onPop = () => {
			popped = true;
			close.current();
		};
		window.addEventListener("popstate", onPop);
		return () => {
			window.removeEventListener("popstate", onPop);
			if (popped) return;
			setTimeout(() => {
				const st = window.history.state as { __sheet?: string } | null;
				if (st?.__sheet === mark) window.history.back();
			}, 0);
		};
	}, [open]);
}
