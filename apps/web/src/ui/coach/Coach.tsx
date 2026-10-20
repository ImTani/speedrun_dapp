"use client";

/**
 * A coach mark: dims the screen around one real element, rings it, and sets one short line
 * beside it. It advances when the player does the thing (taps the target, or a screen sends
 * coachAct(id) for swipes and typing), never on a "next" button. The veil passes touches
 * through, so it never traps anyone; Skip (or Escape) dismisses. Skip rides with the line, on
 * the side away from the opening, so it never sits over the screen's own corner controls. Follows the target as the
 * layout moves; reduced motion drops the pulse and the glide. Doing the thing rings a soft
 * two-note chime (unless the caller strikes its own sound: chime={false}).
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { buzz, HAPTIC, play, series, useSfx } from "@/audio";
import { onboarding as T } from "@/lexicon/onboarding";
import { spring } from "@/ui/motion";
import s from "./coach.module.css";
import { onCoachAct } from "./signal";
import { useAnchor } from "./useAnchor";

const PAD = 8;
/** Room the line and its Skip need below the target before they flip above. */
const LINE_ROOM = 136;
/** Keep the line and Skip this far inside the top and bottom of the screen. */
const EDGE = 8;

export function Coach({
	target,
	text,
	onDone,
	onSkip,
	act,
	tap = true,
	round = false,
	above = false,
	chime = true,
	onShown,
}: {
	/** data-coach id of the element to spotlight (or a CSS selector). */
	target: string;
	/** One short line. */
	text: string;
	/** The player performed the action. */
	onDone: () => void;
	/** The player dismissed the coach. Defaults to onDone. */
	onSkip?: () => void;
	/** coachAct() id that completes it. Defaults to `target`. */
	act?: string;
	/** Whether a tap on the target completes it. */
	tap?: boolean;
	/** Ring the target in a circle instead of a rounded box. */
	round?: boolean;
	/** Put the line above the target when it fits (e.g. to keep a caption below it readable). */
	above?: boolean;
	/** A soft chime when the player does the thing. Off when the caller plays its own sound. */
	chime?: boolean;
	/** Once, when the target is first found on screen (for an entrance: a ring, a sound). */
	onShown?: (el: HTMLElement) => void;
}) {
	const { el, box } = useAnchor(target);
	const reduce = useReducedMotion() ?? false;
	const done = useRef(false);
	const cb = useRef({ onDone, onSkip, onShown, chime });
	cb.current = { onDone, onSkip, onShown, chime };
	useSfx();

	const finish = useCallback((skipped: boolean) => {
		if (done.current) return;
		done.current = true;
		if (skipped) (cb.current.onSkip ?? cb.current.onDone)();
		else {
			if (cb.current.chime)
				series("light", 2, { every: 95, rise: 0.26, volume: 1.2 });
			cb.current.onDone();
		}
	}, []);

	// The entrance, once: the first time the target shows.
	const shown = useRef(false);
	useEffect(() => {
		if (!el || shown.current) return;
		shown.current = true;
		cb.current.onShown?.(el);
	}, [el]);

	// Signals from screens (swipes, typing, picks).
	useEffect(() => {
		const id = act ?? target;
		return onCoachAct((x) => {
			if (x === id) finish(false);
		});
	}, [act, target, finish]);

	// A tap on the target itself. Captured so it counts even if the target stops propagation;
	// completed after the tap's own handler has run.
	useEffect(() => {
		if (!tap || !el) return;
		const onClick = (e: Event) => {
			if (e.target instanceof Node && el.contains(e.target))
				setTimeout(() => finish(false), 0);
		};
		document.addEventListener("click", onClick, true);
		return () => document.removeEventListener("click", onClick, true);
	}, [tap, el, finish]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") finish(true);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [finish]);

	if (typeof document === "undefined") return null;

	const hole = box
		? {
				x: box.x - PAD,
				y: box.y - PAD,
				width: box.w + PAD * 2,
				height: box.h + PAD * 2,
			}
		: null;
	const vh = typeof window === "undefined" ? 800 : window.innerHeight;
	const vw = typeof window === "undefined" ? 400 : window.innerWidth;
	const roomBelow = hole ? vh - (hole.y + hole.height) > LINE_ROOM : true;
	const roomAbove = hole ? hole.y > LINE_ROOM : false;
	const below = above && roomAbove ? false : roomBelow;
	// Keep the whole line on screen: its centre stays half a line from either edge.
	const half = Math.min(140, (vw - 32) / 2);
	const lineX = hole
		? Math.min(Math.max(hole.x + hole.width / 2, 16 + half), vw - 16 - half)
		: vw / 2;
	// Never off screen: a target too tall for either side lets the line overlap its edge instead.
	const lineY = hole
		? below
			? Math.min(hole.y + hole.height + 14, vh - LINE_ROOM - EDGE)
			: Math.max(hole.y - 14, LINE_ROOM + EDGE)
		: 0;
	const glide = reduce ? { duration: 0 } : spring.snappy;

	return createPortal(
		<AnimatePresence>
			{hole ? (
				<motion.div
					key="coach"
					className={s.root}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, transition: { duration: 0.18 } }}
					transition={{ duration: reduce ? 0.12 : 0.28 }}
				>
					<motion.span
						className={s.hole}
						data-round={round || undefined}
						initial={false}
						animate={hole}
						transition={glide}
						aria-hidden="true"
					>
						{reduce ? null : <span className={s.pulse} />}
					</motion.span>
					<motion.div
						className={s.line}
						data-below={below || undefined}
						initial={false}
						animate={{ left: lineX, top: lineY }}
						transition={glide}
					>
						<p role="status">
							<motion.span
								className={s.lineInner}
								initial={reduce ? false : { opacity: 0, y: below ? -6 : 6 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring.settle, delay: 0.1 }}
							>
								{text}
							</motion.span>
						</p>
						<button
							type="button"
							className={s.skip}
							onClick={() => {
								play("tap");
								buzz(HAPTIC.tab);
								finish(true);
							}}
						>
							{T.skip}
						</button>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
}
