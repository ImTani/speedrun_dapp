"use client";

/**
 * Find a coach target in the page and keep its box current. Event-driven (resize, scroll,
 * DOM changes) plus a slow poll for transform-only moves (tab slides, springs), and only
 * while a coach is mounted.
 */
import { useEffect, useState } from "react";
import { coachSelector } from "./signal";

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** The first matching element that is actually laid out (visible, non-zero size). */
export function findAnchor(target: string): HTMLElement | null {
	if (typeof document === "undefined") return null;
	let list: NodeListOf<HTMLElement>;
	try {
		list = document.querySelectorAll<HTMLElement>(coachSelector(target));
	} catch {
		return null;
	}
	for (const el of list) {
		const r = el.getBoundingClientRect();
		if (r.width > 0 && r.height > 0) return el;
	}
	return null;
}

const same = (a: Box | null, b: Box | null) =>
	a === b ||
	(!!a &&
		!!b &&
		Math.abs(a.x - b.x) < 0.5 &&
		Math.abs(a.y - b.y) < 0.5 &&
		Math.abs(a.w - b.w) < 0.5 &&
		Math.abs(a.h - b.h) < 0.5);

/** The target element and its viewport box, or nulls while it is not on screen. */
export function useAnchor(
	target: string | null,
	poll = 220,
	/** Re-render on every move (coach marks); false: only when it appears or goes. */
	track = true,
): { el: HTMLElement | null; box: Box | null } {
	const [found, setFound] = useState<{
		el: HTMLElement | null;
		box: Box | null;
	}>({ el: null, box: null });

	useEffect(() => {
		if (!target) {
			setFound({ el: null, box: null });
			return;
		}
		let raf = 0;
		let el: HTMLElement | null = null;
		let box: Box | null = null;
		const ro =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(() => schedule())
				: null;

		const measure = () => {
			raf = 0;
			const next = findAnchor(target);
			if (next !== el) {
				if (el) ro?.unobserve(el);
				if (next) ro?.observe(next);
			}
			const r = next?.getBoundingClientRect();
			const nb = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
			if (next !== el || (track && !same(nb, box))) {
				el = next;
				box = nb;
				setFound({ el, box });
			}
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(measure);
		};

		measure();
		const mo = new MutationObserver(schedule);
		mo.observe(document.body, { childList: true, subtree: true });
		window.addEventListener("resize", schedule);
		window.addEventListener("scroll", schedule, true);
		const t = setInterval(schedule, poll);
		return () => {
			cancelAnimationFrame(raf);
			clearInterval(t);
			mo.disconnect();
			ro?.disconnect();
			window.removeEventListener("resize", schedule);
			window.removeEventListener("scroll", schedule, true);
		};
	}, [target, poll, track]);

	return found;
}

/** True while an element matching `target` is laid out on screen. */
export function useAnchorPresent(target: string | null): boolean {
	return useAnchor(target, 400, false).el != null;
}
