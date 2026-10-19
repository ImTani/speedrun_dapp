"use client";

/**
 * A way that is not yet open: a chained, wax-sealed door in the nave wall, and
 * one line of what lies behind it. Something stirs at the grille; light leaks
 * under the leaf. Touch the door and the chains rattle.
 */
import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { shell } from "@/lexicon/shell";
import { Colophon } from "@/screens/title/Colophon";
import { svgURL } from "@/screens/title/ink";
import { haptic, useShake } from "@/ui/motion/impact";
import { spring } from "@/ui/motion/presets";
import { Rubric } from "@/ui/type/Rubric";
import {
	CX,
	DOOR_H,
	DOOR_W,
	doorSVG,
	GRILLE,
	grillePath,
	SILL,
	wallSVG,
} from "./door";
import s from "./sealed.module.css";

export type SealedWhich = "spire" | "reliquary" | "vestry";

/** What waits behind each grille. */
const BEHIND: Record<SealedWhich, "eyes" | "gold" | "moon"> = {
	spire: "eyes",
	reliquary: "gold",
	vestry: "moon",
};

let wallCache: string | null = null;

export function Sealed({ which }: { which: SealedWhich }) {
	const copy = shell.sealed[which];
	const door = useMemo(() => svgURL(doorSVG(which)), [which]);
	const wall = useMemo(() => {
		wallCache ??= svgURL(wallSVG());
		return wallCache;
	}, []);
	const shaker = useShake<HTMLDivElement>();
	const reduce = useReducedMotion();
	const [colophon, setColophon] = useState(false);

	const rattle = () => {
		haptic([12, 40, 10]);
		shaker.shake({ amp: 5, duration: 0.4, twist: 0.6, steps: 11 });
	};

	return (
		<section className={s.sealed}>
			{/* biome-ignore lint/performance/noImgElement: a generated SVG drawing, not a photo */}
			<img className={s.wall} src={wall} alt="" draggable={false} />
			<div className={s.content}>
				<motion.div
					className={s.doorWrap}
					initial={{ opacity: 0, y: 18, scale: 0.97 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ ...spring.settle, opacity: { duration: 0.5 } }}
				>
					<div ref={shaker.ref} className={s.doorShake}>
						<motion.button
							type="button"
							className={s.door}
							aria-label={`${copy.name}. ${shell.sealed.tag}.`}
							onClick={rattle}
							whileTap={{ scale: 0.985 }}
							transition={spring.press}
						>
							<Behind kind={BEHIND[which]} reduce={!!reduce} />
							{/* biome-ignore lint/performance/noImgElement: a generated SVG drawing, not a photo */}
							<img className={s.doorImg} src={door} alt="" draggable={false} />
							<Leak reduce={!!reduce} />
						</motion.button>
					</div>
				</motion.div>

				<motion.div
					className={s.copy}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring.settle, delay: 0.18 }}
				>
					<Rubric tone="blood" rule="both" size="xs">
						{shell.sealed.tag}
					</Rubric>
					<h1 className={s.name}>{copy.name}</h1>
					<p className={s.line}>{copy.line}</p>
					{which === "vestry" && (
						<button
							type="button"
							className={s.colophonLink}
							onClick={() => setColophon(true)}
						>
							{shell.colophon.open}
						</button>
					)}
				</motion.div>
			</div>
			{which === "vestry" && (
				<Colophon open={colophon} onClose={() => setColophon(false)} />
			)}
		</section>
	);
}

/** The dark behind the grille, and what waits in it. Sits under the door image. */
function Behind({
	kind,
	reduce,
}: {
	kind: "eyes" | "gold" | "moon";
	reduce: boolean;
}) {
	const id = useId().replace(/[^\w-]/g, "");
	const glow = kind === "gold" ? "#f2c25a" : "#c9ccd4";
	const loop = { repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } as const;
	return (
		<svg
			className={s.layer}
			viewBox={`0 0 ${DOOR_W} ${DOOR_H}`}
			aria-hidden="true"
		>
			<defs>
				<radialGradient id={`${id}g`} cx="0.5" cy="0.6" r="0.6">
					<stop offset="0" stopColor={glow} stopOpacity="0.9" />
					<stop offset="1" stopColor={glow} stopOpacity="0" />
				</radialGradient>
				<radialGradient id={`${id}e`} cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor="#fff1c8" />
					<stop offset="0.35" stopColor="#ff6a4a" />
					<stop offset="1" stopColor="#7a1c0e" stopOpacity="0" />
				</radialGradient>
			</defs>
			<path d={grillePath} fill="#050403" />
			{kind === "eyes" ? (
				<motion.g
					initial={{ opacity: 0 }}
					animate={
						reduce
							? { opacity: 0.8 }
							: {
									opacity: [0, 0, 1, 1, 0.05, 1, 1, 0],
									x: [0, 0, 0, 0, 0, 0, 3, 3],
								}
					}
					transition={{
						duration: 9,
						times: [0, 0.35, 0.42, 0.62, 0.64, 0.67, 0.85, 0.92],
						...loop,
					}}
				>
					{[-7.5, 7.5].map((dx) => (
						<g key={dx}>
							<circle
								cx={CX + dx}
								cy={GRILLE.spring + 3}
								r="7"
								fill={`url(#${id}e)`}
								opacity="0.65"
							/>
							<ellipse
								cx={CX + dx}
								cy={GRILLE.spring + 3}
								rx="2.6"
								ry="1.7"
								fill="#ffd9a0"
							/>
						</g>
					))}
				</motion.g>
			) : (
				<motion.path
					d={grillePath}
					fill={`url(#${id}g)`}
					animate={
						reduce
							? { opacity: 0.7 }
							: { opacity: [0.45, 0.9, 0.6, 0.85, 0.45] }
					}
					transition={{ duration: kind === "gold" ? 4.5 : 8, ...loop }}
				/>
			)}
		</svg>
	);
}

/** Light leaking under the leaf, guttering. Sits above the door image. */
function Leak({ reduce }: { reduce: boolean }) {
	const id = useId().replace(/[^\w-]/g, "");
	return (
		<svg
			className={s.layer}
			viewBox={`0 0 ${DOOR_W} ${DOOR_H}`}
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#ff9a4a" stopOpacity="0" />
					<stop offset="0.3" stopColor="#ffc46a" />
					<stop offset="0.7" stopColor="#ffc46a" />
					<stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
				</linearGradient>
				<radialGradient id={`${id}p`} cx="0.5" cy="0" r="1">
					<stop offset="0" stopColor="#ffb25a" stopOpacity="0.4" />
					<stop offset="1" stopColor="#ffb25a" stopOpacity="0" />
				</radialGradient>
			</defs>
			<motion.g
				style={{ mixBlendMode: "screen" }}
				animate={reduce ? {} : { opacity: [0.7, 1, 0.8, 0.95, 0.65, 0.7] }}
				transition={{
					duration: 3.4,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			>
				<rect
					x={SILL.x0}
					y={SILL.y - 2.5}
					width={SILL.x1 - SILL.x0}
					height="3"
					fill={`url(#${id}l)`}
				/>
				<ellipse
					cx={CX}
					cy={SILL.y + 1}
					rx={(SILL.x1 - SILL.x0) * 0.62}
					ry="20"
					fill={`url(#${id}p)`}
				/>
			</motion.g>
		</svg>
	);
}
