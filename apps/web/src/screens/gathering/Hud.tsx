"use client";

// The banner over the vault: which toll of the bell, what the masked are doing, and how long remains.
import { AnimatePresence, motion } from "motion/react";
import { type Ref, useEffect, useState } from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import { easeIn, easeOut } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import css from "./gathering.module.css";
import { fmtClock } from "./model.ts";
import type { GatheringResponse } from "./types.ts";

type Phase = "commit" | "reveal" | "between" | "closed";

export function Hud({
	data,
	vision,
	ref,
}: {
	data: GatheringResponse | null;
	vision: boolean;
	ref?: Ref<HTMLDivElement>;
}) {
	const g = data?.gathering ?? null;
	const active = !!data?.active && !!g;
	const phase: Phase = active && g ? g.phase : "closed";
	const deadline =
		active && g
			? g.phase === "commit"
				? g.commitDeadline
				: g.phase === "reveal"
					? g.revealDeadline
					: 0
			: 0;
	const rounds = g?.rounds ?? 0;
	const current = g ? Math.min(g.round + 1, g.rounds) : 0;

	return (
		<div ref={ref} className={css.hud}>
			{active && rounds > 0 && (
				<div
					className={css.tollRow}
					role="img"
					aria-label={T.tollsAria(current, rounds)}
				>
					<span className={css.pips} aria-hidden="true">
						{Array.from({ length: rounds }, (_, i) => (
							<i
								// biome-ignore lint/suspicious/noArrayIndexKey: pips are positional
								key={i}
								className={css.pip}
								data-on={
									i + 1 < current ? "past" : i + 1 === current ? "now" : "no"
								}
							/>
						))}
					</span>
					<Rubric size="xs" tone="gilt">
						{T.toll(current, rounds)}
					</Rubric>
				</div>
			)}
			<AnimatePresence mode="wait" initial={false}>
				<motion.p
					key={phase}
					className={css.phase}
					initial={{ opacity: 0, y: 6 }}
					animate={{
						opacity: 1,
						y: 0,
						transition: { duration: 0.3, ease: easeOut },
					}}
					exit={{
						opacity: 0,
						y: -4,
						transition: { duration: 0.14, ease: easeIn },
					}}
				>
					{T.phase[phase]}
				</motion.p>
			</AnimatePresence>
			{deadline > 0 && phase !== "closed" && phase !== "between" && (
				<Countdown deadline={deadline} label={T.until[phase]} />
			)}
			{vision && <p className={css.vision}>{T.vision}</p>}
		</div>
	);
}

function Countdown({ deadline, label }: { deadline: number; label: string }) {
	const [now, setNow] = useState(() => Date.now() / 1000);
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now() / 1000), 1000);
		return () => clearInterval(id);
	}, []);
	const left = deadline - now;
	if (left <= 0) return null;
	return (
		<p className={css.clock}>
			<span className={css.clockNum}>{fmtClock(left)}</span>
			<span>{label}</span>
		</p>
	);
}
