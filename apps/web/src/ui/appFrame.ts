"use client";

/**
 * The game's frame and the soft keyboard.
 *
 * `useAppFrame()` (mounted once, in /play) marks <html> as the full-bleed app (globals.css locks
 * the document there; reading pages keep a normal scrolling document) and tracks the soft
 * keyboard through the visual viewport:
 *   html[data-kb]  a text field has focus and a keyboard covers part of the screen
 *   --kb           how much of the layout viewport the keyboard hides (iOS overlays it; Android,
 *                  with interactive-widget=resizes-content, shrinks the layout instead and this is 0)
 *
 * `useKeepAboveKeyboard(first, last)` keeps a field and its action both in sight while the
 * keyboard is up, scrolling the nearest scroll container.
 */
import { type RefObject, useEffect } from "react";

const NOT_TEXT = new Set([
	"button",
	"checkbox",
	"color",
	"file",
	"image",
	"radio",
	"range",
	"reset",
	"submit",
]);

/** A focused element that brings up the soft keyboard. */
function typing(el: Element | null): el is HTMLElement {
	if (el instanceof HTMLInputElement) return !NOT_TEXT.has(el.type);
	if (el instanceof HTMLTextAreaElement) return true;
	return el instanceof HTMLElement && el.isContentEditable;
}

/** Bottom of what the reader can actually see, in layout-viewport (client) coordinates. */
function visibleBottom(): number {
	const vv = window.visualViewport;
	return vv ? vv.offsetTop + vv.height : window.innerHeight;
}
function visibleTop(): number {
	return window.visualViewport?.offsetTop ?? 0;
}

export function useAppFrame() {
	useEffect(() => {
		const root = document.documentElement;
		root.classList.add("app-frame");
		const vv = window.visualViewport;
		// Tallest layout seen with no field focused, per width (so rotating resets it).
		let base = window.innerHeight;
		let baseW = window.innerWidth;
		let raf = 0;

		const update = () => {
			raf = 0;
			const ih = window.innerHeight;
			if (window.innerWidth !== baseW) {
				baseW = window.innerWidth;
				base = ih;
			}
			const focused = typing(document.activeElement);
			if (!focused) base = Math.max(base, ih);
			const occluded = vv ? Math.max(0, ih - (vv.offsetTop + vv.height)) : 0;
			// iOS: the visual viewport shrinks under a fixed layout. Android: the layout shrinks.
			const open = focused && (occluded > 80 || ih < base - 120);
			root.style.setProperty("--kb", `${open ? Math.round(occluded) : 0}px`);
			root.toggleAttribute("data-kb", open);
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		// focusout fires before the next element takes focus; read activeElement a frame later.
		update();
		vv?.addEventListener("resize", schedule);
		vv?.addEventListener("scroll", schedule);
		window.addEventListener("resize", schedule);
		document.addEventListener("focusin", schedule);
		document.addEventListener("focusout", schedule);
		return () => {
			cancelAnimationFrame(raf);
			vv?.removeEventListener("resize", schedule);
			vv?.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			document.removeEventListener("focusin", schedule);
			document.removeEventListener("focusout", schedule);
			root.classList.remove("app-frame");
			root.removeAttribute("data-kb");
			root.style.removeProperty("--kb");
		};
	}, []);
}

function scrollParent(el: HTMLElement): HTMLElement | null {
	for (let p = el.parentElement; p; p = p.parentElement) {
		const oy = getComputedStyle(p).overflowY;
		if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight)
			return p;
	}
	return null;
}

/**
 * While `first` (a text field) has focus, keep it and `last` (its action, below it) inside the
 * part of the screen the keyboard leaves: `last` is brought up to the keyboard's edge, but never
 * so far that `first` slides off the top.
 */
export function useKeepAboveKeyboard(
	first: RefObject<HTMLElement | null>,
	last: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		const field = first.current;
		if (!field) return;
		const vv = window.visualViewport;
		const timers: number[] = [];
		const fit = () => {
			if (document.activeElement !== field) return;
			const top = visibleTop() + 8;
			const bottom = visibleBottom() - 12;
			const f = field.getBoundingClientRect();
			const l = (last.current ?? field).getBoundingClientRect();
			let dy = 0;
			if (l.bottom > bottom) dy = Math.min(l.bottom - bottom, f.top - top);
			if (f.bottom > bottom) dy = Math.max(dy, f.bottom - bottom);
			if (f.top - dy < top) dy = f.top - top;
			if (Math.abs(dy) < 2) return;
			const box = scrollParent(field);
			if (box) box.scrollBy({ top: dy });
			else field.scrollIntoView({ block: "nearest" });
		};
		// Fit after the layout has answered: the keyboard animates in, and html[data-kb] moves
		// the action into the flow a frame after the viewport changes.
		const settle = () => {
			requestAnimationFrame(() => requestAnimationFrame(fit));
			timers.push(window.setTimeout(fit, 250));
		};
		const onFocus = () => {
			fit();
			for (const ms of [120, 320, 600]) timers.push(window.setTimeout(fit, ms));
		};
		const kb = new MutationObserver(settle);
		kb.observe(document.documentElement, { attributeFilter: ["data-kb"] });
		field.addEventListener("focus", onFocus);
		vv?.addEventListener("resize", settle);
		window.addEventListener("resize", settle);
		if (document.activeElement === field) onFocus();
		return () => {
			for (const t of timers) clearTimeout(t);
			kb.disconnect();
			field.removeEventListener("focus", onFocus);
			vv?.removeEventListener("resize", settle);
			window.removeEventListener("resize", settle);
		};
	}, [first, last]);
}
