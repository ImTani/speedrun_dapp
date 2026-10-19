"use client";

/**
 * Blood-red sealing wax. "poured": a glossy molten blob waiting for a signet.
 * "pressed": the Aspect's mask stamped into it. "cracked": the seal did not take.
 */
import { motion } from "motion/react";
import { useId, useMemo } from "react";
import { Mask } from "@/ui/Mask";
import s from "./fragment.module.css";

export type WaxState = "poured" | "pressed" | "cracked" | "cold";

/** An irregular wax outline (deterministic per seed) in a 100 x 100 box. */
function blob(seed: number, r = 41, wobble = 1) {
	const pts: string[] = [];
	const n = 40;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const k =
			1 +
			wobble *
				(0.045 * Math.sin(5 * a + seed) +
					0.03 * Math.sin(9 * a + seed * 2.3) +
					0.018 * Math.sin(14 * a + seed * 0.7));
		pts.push(
			`${(50 + Math.cos(a) * r * k).toFixed(2)} ${(50 + Math.sin(a) * r * k).toFixed(2)}`,
		);
	}
	return `M${pts.join(" L")}Z`;
}

export function WaxSeal({
	aspect,
	state,
	size = 132,
	seed = 3,
}: {
	aspect: number;
	state: WaxState;
	size?: number;
	seed?: number;
}) {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const outer = useMemo(() => blob(seed, 44, 1.6), [seed]);
	const inner = useMemo(() => blob(seed + 4, 31, 0.5), [seed]);
	const pressed = state === "pressed" || state === "cracked";
	return (
		<span
			className={s.wax}
			data-state={state}
			style={{ width: size, height: size }}
		>
			<svg viewBox="0 0 100 100" aria-hidden="true" className={s.waxSvg}>
				<defs>
					<radialGradient id={`${id}w`} cx="38%" cy="32%" r="72%">
						<stop offset="0" stopColor="#b3242a" />
						<stop offset=".35" stopColor="#8a1218" />
						<stop offset=".8" stopColor="#560a0f" />
						<stop offset="1" stopColor="#2e0507" />
					</radialGradient>
					<radialGradient id={`${id}d`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#4a080c" />
						<stop offset=".78" stopColor="#6e0e14" />
						<stop offset="1" stopColor="#a3171e" />
					</radialGradient>
					<filter id={`${id}r`} x="-10%" y="-10%" width="120%" height="120%">
						<feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="b" />
						<feSpecularLighting
							in="b"
							surfaceScale="3"
							specularConstant=".75"
							specularExponent="24"
							lightingColor="#ffd9c8"
							result="sp"
						>
							<feDistantLight azimuth="225" elevation="48" />
						</feSpecularLighting>
						<feComposite in="sp" in2="SourceAlpha" operator="in" result="spm" />
						<feComposite
							in="SourceGraphic"
							in2="spm"
							operator="arithmetic"
							k1="0"
							k2="1"
							k3=".32"
							k4="0"
						/>
					</filter>
				</defs>
				{/* Drip shadow on the stone. */}
				<ellipse cx="52" cy="58" rx="44" ry="40" fill="#000" opacity=".45" />
				<g filter={`url(#${id}r)`}>
					<path d={outer} fill={`url(#${id}w)`} />
					{pressed ? (
						<path d={inner} fill={`url(#${id}d)`} />
					) : (
						<path d={inner} fill="#9a161c" opacity=".3" />
					)}
				</g>
				<path
					d={outer}
					fill="none"
					stroke="#2a0507"
					strokeWidth="1.6"
					opacity=".9"
				/>
				{pressed ? (
					<path
						d={inner}
						fill="none"
						stroke="#2a0507"
						strokeWidth="1.2"
						opacity=".7"
					/>
				) : (
					<ellipse
						cx="37"
						cy="31"
						rx="11"
						ry="6"
						fill="#ffd9c8"
						opacity=".16"
						transform="rotate(-28 37 31)"
					/>
				)}
				{state === "cracked" ? (
					<motion.path
						d="M50 8 L46 30 L54 42 L44 58 L52 72 L47 92 M54 42 L72 46 L86 40 M44 58 L26 62 L12 56"
						fill="none"
						stroke="#1a0304"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
					/>
				) : null}
			</svg>
			{pressed ? (
				<motion.span
					className={s.waxImprint}
					initial={{ opacity: 0, scale: 1.08 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.35 }}
				>
					<Mask
						aspect={aspect}
						size={Math.round(size * 0.46)}
						variant="ink"
						shadow={false}
					/>
				</motion.span>
			) : null}
		</span>
	);
}

/** The brass signet that comes down onto the wax. */
export function Signet({
	aspect,
	size = 132,
}: {
	aspect: number;
	size?: number;
}) {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	return (
		<span className={s.signet} style={{ width: size, height: size }}>
			<svg viewBox="0 0 100 100" aria-hidden="true" className={s.waxSvg}>
				<defs>
					<radialGradient id={`${id}b`} cx="40%" cy="32%" r="70%">
						<stop offset="0" stopColor="#f5dfa0" />
						<stop offset=".4" stopColor="#c9a24f" />
						<stop offset="1" stopColor="#5a4632" />
					</radialGradient>
				</defs>
				<circle
					cx="50"
					cy="50"
					r="34"
					fill={`url(#${id}b)`}
					stroke="#0b0807"
					strokeWidth="3"
				/>
				<circle
					cx="50"
					cy="50"
					r="28"
					fill="none"
					stroke="#5a4632"
					strokeWidth="1.5"
				/>
			</svg>
			<span className={s.waxImprint}>
				<Mask
					aspect={aspect}
					size={Math.round(size * 0.38)}
					variant="gilded"
					shadow={false}
				/>
			</span>
		</span>
	);
}
