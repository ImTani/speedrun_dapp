"use client";

// Between duels: the waiting word (no Gathering), the seals of this toll while the masked choose,
// and the last few rites, written on the floor.
import { AnimatePresence, motion } from "motion/react";
import { gathering as T } from "@/lexicon/gathering.ts";
import { rise, tween } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import css from "./gathering.module.css";
import type { FeedItem } from "./model.ts";
import { type SealMark, Seals } from "./Seals.tsx";

export function Lower({
	show,
	top,
	bottom,
	active,
	feed,
	seals,
	toll,
}: {
	show: boolean;
	/** The open floor, in box px from the top and from the bottom. */
	top: number;
	bottom: number;
	/** A Gathering is under way. */
	active: boolean;
	feed: FeedItem[];
	/** One mark per Fragment while the masked seal their choices (sealing phase only). */
	seals: SealMark[] | null;
	toll: number;
}) {
	return (
		<AnimatePresence>
			{show && (
				<motion.div
					key="lower"
					className={css.lower}
					style={{ top, bottom }}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0, transition: tween.in }}
					exit={{ opacity: 0, transition: { duration: 0.16 } }}
				>
					{!active && (
						<div className={css.waiting}>
							<p className={css.waitingTitle}>{T.waiting}</p>
						</div>
					)}
					{seals && seals.length > 0 && <Seals toll={toll} marks={seals} />}
					<section className={css.feed} aria-label={T.feedTitle}>
						<Rubric size="xs" tone="dim" rule="both">
							{T.feedTitle}
						</Rubric>
						<ul className={css.feedList}>
							<AnimatePresence initial={false}>
								{feed.length === 0 ? (
									<motion.li
										key="quiet"
										className={css.feedItem}
										variants={rise}
										initial="hidden"
										animate="shown"
										exit="gone"
									>
										{T.quiet}
									</motion.li>
								) : (
									feed.map((f, i) => (
										<motion.li
											layout="position"
											key={f.k}
											className={css.feedItem}
											data-tone={f.tone}
											data-mine={f.mine ? "true" : "false"}
											variants={rise}
											initial="hidden"
											animate="shown"
											exit="gone"
											data-age={Math.min(i, 3)}
										>
											<span>{f.text}</span>
										</motion.li>
									))
								)}
							</AnimatePresence>
						</ul>
					</section>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
