"use client";

/**
 * Choose the Aspect: one mask at a time, big, on a lit rose of its own glass.
 * Swipe the rose (or tap the arrows, or a mask in the strip below) to try
 * another. The rose is one lit window (one WebGL context) that turns and
 * changes its glass; only the masks slide. Follows the motion.dev swipe gallery pattern: a keyed slide in
 * AnimatePresence, drag="x" with zero constraints, paginate on swipe power.
 */
import {
	AnimatePresence,
	motion,
	type PanInfo,
	useReducedMotion,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { buzz } from "@/audio";
import { L } from "@/lexicon";
import { coachAct } from "@/ui/coach/signal";
import { Chip, IconButton } from "@/ui/controls";
import { RoseWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { spring } from "@/ui/motion";
import s from "./fragment.module.css";

const N = L.aspects.length;
const wrap = (i: number) => ((i % N) + N) % N;
const SWIPE = 5200;

const slide = {
	enter: (d: number) => ({
		x: d > 0 ? "70%" : "-70%",
		opacity: 0,
		rotate: d * 8,
		scale: 0.82,
	}),
	center: { x: 0, opacity: 1, rotate: 0, scale: 1 },
	exit: (d: number) => ({
		x: d > 0 ? "-70%" : "70%",
		opacity: 0,
		rotate: d * -8,
		scale: 0.82,
	}),
};

export function AspectCarousel({
	aspect,
	dir,
	onPick,
}: {
	aspect: number;
	/** Direction of the last move (+1 next, -1 back), for the slide. */
	dir: number;
	onPick: (aspect: number, dir: number) => void;
}) {
	const a = L.aspects[aspect] ?? L.aspects[0];
	const go = (d: number) => {
		onPick(wrap(aspect + d), d);
		coachAct("mask");
	};
	// A swipe has no button to buzz for it.
	const end = (_: unknown, { offset, velocity }: PanInfo) => {
		const power = offset.x * Math.abs(velocity.x);
		if (power < -SWIPE || offset.x < -90) {
			buzz(8);
			go(1);
		} else if (power > SWIPE || offset.x > 90) {
			buzz(8);
			go(-1);
		}
	};
	const liveId = useId();
	// Narrow phones scroll the chip strip: keep the chosen chip in view as the rose turns.
	const strip = useRef<HTMLDivElement>(null);
	const reduce = useReducedMotion() ?? false;
	useEffect(() => {
		const el = strip.current;
		const chip = el?.children[aspect];
		if (!el || !chip || el.scrollWidth <= el.clientWidth) return;
		const box = el.getBoundingClientRect();
		const c = chip.getBoundingClientRect();
		const by =
			c.left < box.left + 8
				? c.left - box.left - 8
				: c.right > box.right - 8
					? c.right - box.right + 8
					: 0;
		if (by) el.scrollBy({ left: by, behavior: reduce ? "auto" : "smooth" });
	}, [aspect, reduce]);
	// The rose turns one petal per mask, the way the mask slides.
	const [wheel, setWheel] = useState({ aspect, turn: 0 });
	if (wheel.aspect !== aspect)
		setWheel({ aspect, turn: wheel.turn - (dir || 1) * 30 });

	return (
		<div className={s.carousel}>
			<div className={s.stageRow}>
				<IconButton
					icon="prev"
					label={L.bind.prevMask}
					className={s.arrow}
					haptic={8}
					onClick={() => go(-1)}
				/>
				<div className={s.roseBox} data-coach="mask">
					<RoseWindow
						aspect={aspect}
						turn={wheel.turn}
						style={{ position: "absolute", inset: 0 }}
					/>
					<span className={s.roseShade} aria-hidden="true" />
					<AnimatePresence initial={false} custom={dir} mode="popLayout">
						<motion.div
							key={aspect}
							className={s.roseSlide}
							custom={dir}
							variants={slide}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								x: spring.settle,
								rotate: spring.settle,
								scale: spring.settle,
								opacity: { duration: 0.18 },
							}}
							drag="x"
							dragConstraints={{ left: 0, right: 0 }}
							dragElastic={0.85}
							onDragEnd={end}
							style={{ touchAction: "pan-y" }}
							aria-describedby={liveId}
						>
							<motion.span
								className={s.roseMask}
								initial={{ scale: 0.9, y: 8 }}
								animate={{ scale: 1, y: 0 }}
								transition={{ ...spring.slam, delay: 0.05 }}
							>
								<Mask aspect={aspect} size={200} glow label />
							</motion.span>
						</motion.div>
					</AnimatePresence>
				</div>
				<IconButton
					icon="next"
					label={L.bind.nextMask}
					className={s.arrow}
					haptic={8}
					onClick={() => go(1)}
				/>
			</div>

			<div className={s.aspectText} id={liveId} aria-live="polite">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={aspect}
						initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
						transition={{ duration: 0.28 }}
					>
						<h2 className={s.aspectName}>{a.name}</h2>
						<p className={s.pickLine}>{a.blurb}</p>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className={s.strip} ref={strip}>
				{L.aspects.map((x, i) => (
					<Chip
						key={x.key}
						className={s.maskChip}
						selected={i === aspect}
						aria-label={`${x.name}, ${x.mask}`}
						haptic={8}
						onClick={() => {
							if (i !== aspect) {
								onPick(i, i > aspect ? 1 : -1);
								coachAct("mask");
							}
						}}
					>
						<Mask aspect={i} size={34} shadow={false} />
					</Chip>
				))}
			</div>
		</div>
	);
}
