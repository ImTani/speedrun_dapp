"use client";

/**
 * A tab's first-visit card: what this place is, and what to do here, in two sentences, with
 * the way to How to play. Shown once per tab (useFirstVisit), after any coach mark on the tab.
 * It rises above the tab bar over a light veil; one tap anywhere (or Got it, Escape, Back)
 * puts it away, so it never holds the screen for more than a tap.
 *
 *   <TabIntro tab="spire" />                 // anywhere in the tab's screen
 *   <TabIntro tab="spire" ready={!!state} /> // hold it back while the screen loads
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { type CodexSection, codex, type IntroTab } from "@/lexicon/codex";
import { useCodex } from "@/screens/codex";
import { SecondaryButton, TextButton } from "@/ui/controls";
import { card, scrim } from "@/ui/motion";
import { useBackToClose } from "@/ui/useBackToClose";
import { TabGlyph } from "./glyphs";
import s from "./intro.module.css";
import { useFirstVisit } from "./useFirstVisit";

const T = codex.intro;

/** Where "More in How to play" opens for each tab. */
const SECTION: Record<IntroTab, CodexSection> = {
	fragment: "fragment",
	gathering: "gathering",
	spire: "between",
	reliquary: "between",
	vestry: "between",
};

export function TabIntro({
	tab,
	ready = true,
}: {
	tab: IntroTab;
	ready?: boolean;
}) {
	const [show, dismiss] = useFirstVisit(tab, ready);
	const codexSheet = useCodex();
	const headId = useId();
	const lineId = useId();
	const okRef = useRef<HTMLButtonElement>(null);
	const C = T[tab];
	useBackToClose(show, dismiss);

	useEffect(() => {
		if (!show) return;
		const back = document.activeElement as HTMLElement | null;
		okRef.current?.focus({ preventScroll: true });
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			back?.focus?.({ preventScroll: true });
		};
	}, [show, dismiss]);

	if (typeof document === "undefined") return null;

	return (
		<>
			{createPortal(
				<AnimatePresence>
					{show && (
						<div className={s.layer} key="intro">
							<motion.div
								className={s.veil}
								variants={scrim}
								initial="hidden"
								animate="shown"
								exit="gone"
								onClick={dismiss}
								aria-hidden="true"
							/>
							<motion.section
								className={s.card}
								role="dialog"
								aria-labelledby={headId}
								aria-describedby={lineId}
								variants={card}
								initial="hidden"
								animate="shown"
								exit="gone"
							>
								<div className={s.cardHead}>
									<span className={s.cardIcon} aria-hidden="true">
										<TabGlyph tab={tab} size={26} />
									</span>
									<h2 id={headId} className={s.cardTitle}>
										{C.title}
									</h2>
								</div>
								<div id={lineId} className={s.cardBody}>
									<p className={s.what}>{C.what}</p>
									<p className={s.todo}>{C.todo}</p>
								</div>
								<div className={s.cardFoot}>
									<TextButton
										className={s.more}
										onClick={() => {
											dismiss();
											codexSheet.show(SECTION[tab], true);
										}}
									>
										{T.more}
									</TextButton>
									<SecondaryButton
										ref={okRef}
										inline
										size="md"
										className={s.ok}
										onClick={dismiss}
									>
										{T.ok}
									</SecondaryButton>
								</div>
							</motion.section>
						</div>
					)}
				</AnimatePresence>,
				document.body,
			)}
			{codexSheet.sheet}
		</>
	);
}
