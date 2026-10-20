"use client";

/**
 * Colophon: the credits, as the last leaf of the book. A sheet that rises from
 * below. Lists every licensed hand in the cathedral (masks, carvings, letters)
 * and links the full roll of sources (CC BY requires the in-app credit).
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { SOUND_CREDITS } from "@/audio";
import { audio } from "@/lexicon/audio";
import { shell } from "@/lexicon/shell";
import { ATTRIBUTION_PATH, MASK_CREDITS } from "@/ui/masks/credits";
import { pressable, scrim, sheet } from "@/ui/motion/presets";
import s from "./title.module.css";

const C = shell.colophon;

export function Colophon({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const headId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) return;
		const back = document.activeElement as HTMLElement | null;
		closeRef.current?.focus({ preventScroll: true });
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			back?.focus?.({ preventScroll: true });
		};
	}, [open, onClose]);

	const sections: { head: string; lines: readonly string[] }[] = [
		{ head: C.masks, lines: MASK_CREDITS },
		{ head: C.carvings, lines: [C.carvingsLine] },
		{ head: C.letters, lines: [C.lettersLine] },
		{ head: audio.creditsHead, lines: SOUND_CREDITS },
	];

	return (
		<AnimatePresence>
			{open && (
				<div className={s.colophonLayer} key="colophon">
					<motion.div
						className={s.scrim}
						variants={scrim}
						initial="hidden"
						animate="shown"
						exit="gone"
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.section
						className={s.leaf}
						role="dialog"
						aria-modal="true"
						aria-labelledby={headId}
						variants={sheet}
						initial="hidden"
						animate="shown"
						exit="gone"
					>
						<div className={s.leafInner}>
							<h2 id={headId} className={s.leafHead}>
								{C.heading}
							</h2>
							{sections.map((sec) => (
								<section key={sec.head} className={s.leafSection}>
									<h3 className={s.leafRubric}>{sec.head}</h3>
									{sec.lines.map((l) => (
										<p key={l} className={`${s.leafLine} selectable`}>
											{l}
										</p>
									))}
								</section>
							))}
							<a
								className={s.leafRoll}
								href={ATTRIBUTION_PATH}
								target="_blank"
								rel="noopener"
							>
								{C.roll}
							</a>
							<motion.button
								ref={closeRef}
								type="button"
								className={s.leafClose}
								onClick={onClose}
								{...pressable}
							>
								{C.close}
							</motion.button>
						</div>
					</motion.section>
				</div>
			)}
		</AnimatePresence>
	);
}
