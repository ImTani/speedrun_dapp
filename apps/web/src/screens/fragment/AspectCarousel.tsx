"use client";

/**
 * Choose the Aspect: one mask at a time, big, on a lit rose of its own glass.
 * Swipe the rose (or tap the arrows, or a mask in the strip below) to try
 * another. Follows the motion.dev swipe gallery pattern: a keyed slide in
 * AnimatePresence, drag="x" with zero constraints, paginate on swipe power.
 */
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useId } from "react";
import { L } from "@/lexicon";
import { ASPECT_GLASS } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { haptic, pressableSoft, spring } from "@/ui/motion";
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
		haptic(8);
		onPick(wrap(aspect + d), d);
	};
	const end = (_: unknown, { offset, velocity }: PanInfo) => {
		const power = offset.x * Math.abs(velocity.x);
		if (power < -SWIPE || offset.x < -90) go(1);
		else if (power > SWIPE || offset.x > 90) go(-1);
	};
	const liveId = useId();

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
				<div className={s.roseBox}>
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
							<Rose aspect={aspect} />
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
								haptic(8);
								onPick(i, i > aspect ? 1 : -1);
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

/** A small rose window in the Aspect's glass, lit from behind. */
function Rose({ aspect }: { aspect: number }) {
	const [a, b, c] = ASPECT_GLASS[aspect] ?? ASPECT_GLASS[6];
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const petals = 12;
	const ring = Array.from({ length: petals }, (_, i) => {
		const a0 = (i / petals) * Math.PI * 2 - Math.PI / 2;
		const a1 = ((i + 1) / petals) * Math.PI * 2 - Math.PI / 2;
		const p = (r: number, t: number) =>
			`${(100 + Math.cos(t) * r).toFixed(1)} ${(100 + Math.sin(t) * r).toFixed(1)}`;
		return {
			outer: `M${p(62, a0)} L${p(94, a0)} A94 94 0 0 1 ${p(94, a1)} L${p(62, a1)} A62 62 0 0 0 ${p(62, a0)}Z`,
			inner: `M100 100 L${p(62, a0)} A62 62 0 0 1 ${p(62, a1)}Z`,
		};
	});
	return (
		<svg viewBox="0 0 200 200" className={s.rose} aria-hidden="true">
			<defs>
				<radialGradient id={`${id}l`} cx="50%" cy="44%" r="55%">
					<stop offset="0" stopColor="#fff6dc" stopOpacity=".75" />
					<stop offset=".5" stopColor="#fff6dc" stopOpacity=".15" />
					<stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
				</radialGradient>
				<filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation="9" />
				</filter>
			</defs>
			<g filter={`url(#${id}g)`} opacity=".7">
				{ring.map((r, i) => (
					<path key={r.outer} d={r.outer} fill={i % 2 ? b : a} />
				))}
			</g>
			<circle cx="100" cy="100" r="98" fill="#0b0807" />
			{ring.map((r, i) => (
				<path
					key={r.outer}
					d={r.outer}
					fill={i % 3 === 0 ? c : i % 2 ? b : a}
					opacity=".9"
				/>
			))}
			{ring.map((r, i) => (
				<path key={r.inner} d={r.inner} fill={i % 2 ? a : c} opacity=".55" />
			))}
			<circle cx="100" cy="100" r="98" fill={`url(#${id}l)`} />
			<g fill="none" stroke="#0b0807" strokeLinejoin="round">
				{ring.map((r) => (
					<path key={r.outer} d={r.outer} strokeWidth="3.5" />
				))}
				<circle cx="100" cy="100" r="62" strokeWidth="4" />
				<circle cx="100" cy="100" r="96" strokeWidth="6" />
			</g>
			<circle
				cx="100"
				cy="100"
				r="99"
				fill="none"
				stroke="#c9a24f"
				strokeWidth="1.2"
				opacity=".6"
			/>
			{/* Darken the centre so the mask reads against the glass. */}
			<circle cx="100" cy="100" r="58" fill="#0b0807" opacity=".42" />
		</svg>
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
