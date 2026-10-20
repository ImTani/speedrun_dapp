"use client";

/**
 * Choose the Aspect: one mask at a time, big, on a lit rose of its own glass.
 * Swipe the rose (or tap the arrows, or a mask in the strip below) to try
 * another. The rose is one lit window (one WebGL context) that turns and
 * changes its glass; only the masks slide. Follows the motion.dev swipe gallery pattern: a keyed slide in
 * AnimatePresence, drag="x" with zero constraints, paginate on swipe power.
 */
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useId, useState } from "react";
import { buzz } from "@/audio";
import { L } from "@/lexicon";
import { coachAct } from "@/ui/coach/signal";
import { RoseWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { pressableSoft, spring } from "@/ui/motion";
import { Rubric } from "@/ui/type";
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
		buzz(8);
		onPick(wrap(aspect + d), d);
		coachAct("mask");
	};
	const end = (_: unknown, { offset, velocity }: PanInfo) => {
		const power = offset.x * Math.abs(velocity.x);
		if (power < -SWIPE || offset.x < -90) go(1);
		else if (power > SWIPE || offset.x > 90) go(-1);
	};
	const liveId = useId();
	// The rose turns one petal per mask, the way the mask slides.
	const [wheel, setWheel] = useState({ aspect, turn: 0 });
	if (wheel.aspect !== aspect)
		setWheel({ aspect, turn: wheel.turn - (dir || 1) * 30 });

	return (
		<div className={s.carousel}>
			<div className={s.stageRow}>
				<motion.button
					type="button"
					className={s.arrow}
					aria-label={L.bind.prevMask}
					onClick={() => go(-1)}
					{...pressableSoft}
				>
					<Chevron flip />
				</motion.button>
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
				<motion.button
					type="button"
					className={s.arrow}
					aria-label={L.bind.nextMask}
					onClick={() => go(1)}
					{...pressableSoft}
				>
					<Chevron />
				</motion.button>
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
						<Rubric rule="both" className={s.aspectMask ?? ""}>
							{a.mask}
						</Rubric>
						<p className={s.temperament}>{a.blurb}</p>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className={s.strip}>
				{L.aspects.map((x, i) => (
					<motion.button
						key={x.key}
						type="button"
						className={s.chip}
						data-on={i === aspect ? "1" : "0"}
						aria-label={`${x.name}, ${x.mask}`}
						aria-pressed={i === aspect}
						onClick={() => {
							if (i !== aspect) {
								buzz(8);
								onPick(i, i > aspect ? 1 : -1);
								coachAct("mask");
							}
						}}
						{...pressableSoft}
					>
						<Mask aspect={i} size={34} shadow={false} />
					</motion.button>
				))}
			</div>
			<p className={s.swipeHint}>{L.bind.swipe}</p>
		</div>
	);
}

function Chevron({ flip = false }: { flip?: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			aria-hidden="true"
			style={flip ? { transform: "scaleX(-1)" } : undefined}
		>
			<path
				d="M8 3 L18 12 L8 21"
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
