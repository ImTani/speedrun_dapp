"use client";

// The seals of this toll: while the masked choose, one wax seal per Fragment is pressed into the
// floor as its choice is sealed. Empty sockets wait for the rest.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import { spring } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import css from "./gathering.module.css";
import { aspectGlyph, aspectName, type Who } from "./model.ts";

export interface SealMark {
	who: Who;
	sealed: boolean;
}

export function Seals({ toll, marks }: { toll: number; marks: SealMark[] }) {
	const reduce = useReducedMotion();
	const n = marks.filter((m) => m.sealed).length;
	return (
		<section className={css.seals} aria-label={T.sealsTitle(toll)}>
			<Rubric size="xs" tone="dim" rule="both">
				{T.sealsTitle(toll)}
			</Rubric>
			<ul className={css.sealRow}>
				{marks.map((m, i) => (
					<li
						key={m.who.agent}
						className={css.seal}
						data-sealed={m.sealed ? "true" : "false"}
						data-mine={m.who.mine ? "true" : "false"}
						style={
							{ "--aspect-glyph": aspectGlyph(m.who.aspect) } as CSSProperties
						}
						aria-label={T.sealOf(
							m.who.name,
							aspectName(m.who.aspect),
							m.sealed,
						)}
					>
						<span className={css.socket} aria-hidden="true" />
						<AnimatePresence>
							{m.sealed && (
								// The wax drops onto the socket and spreads: a quick stamp, staggered.
								<motion.span
									key="wax"
									className={css.wax}
									aria-hidden="true"
									initial={
										reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, y: -6 }
									}
									animate={{
										opacity: 1,
										scale: 1,
										y: 0,
										transition: {
											...spring.slam,
											delay: reduce ? 0 : 0.15 + i * 0.07,
											opacity: { duration: 0.12, delay: 0.15 + i * 0.07 },
										},
									}}
									exit={{ opacity: 0, transition: { duration: 0.2 } }}
								/>
							)}
						</AnimatePresence>
						<span className={css.glyph} aria-hidden="true" />
					</li>
				))}
			</ul>
			<p className={css.sealCount} aria-live="polite">
				{T.sealsCount(n, marks.length)}
			</p>
		</section>
	);
}
