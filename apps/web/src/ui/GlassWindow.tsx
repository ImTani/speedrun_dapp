"use client";

import type { ReactNode } from "react";

// Each Aspect's glass tint (the glass is the only saturated colour in the world).
export const ASPECT_GLASS = [
	["#e8c46a", "#f3e6c8", "#c9a24e"],
	["#8e1218", "#c7262c", "#4a0a0e"],
	["#2c5fa8", "#c9ccd4", "#1d3f8f"],
	["#6b3b2a", "#a3172f", "#3a1f15"],
	["#176a4f", "#d9951f", "#a3172f"],
	["#1d3f8f", "#e2d6bf", "#2b6f6a"],
	["#5b2a7a", "#d9951f", "#176a4f"],
] as const;

/** A lit, arched stained-glass window drawn in SVG; children sit centred in the glass. */
export function GlassWindow({
	aspect,
	children,
	dim = false,
	height = 340,
}: {
	aspect: number;
	children?: ReactNode;
	dim?: boolean;
	height?: number;
}) {
	const [a, b, c] = ASPECT_GLASS[aspect] ?? ASPECT_GLASS[6];
	const panes = [
		"M40 300 L40 150 L100 150 L100 300Z",
		"M100 300 L100 150 L160 150 L160 300Z",
		"M40 150 Q40 60 100 30 L100 150Z",
		"M100 30 Q160 60 160 150 L100 150Z",
		"M40 300 L100 220 L160 300Z",
	];
	const fills = [a, c, b, a, c];
	return (
		<div className={`glass-window${dim ? " dim" : ""}`} style={{ height }}>
			<svg
				viewBox="0 0 200 320"
				preserveAspectRatio="xMidYMid meet"
				aria-hidden="true"
			>
				<defs>
					<radialGradient id="gw-light" cx="50%" cy="40%" r="60%">
						<stop offset="0" stopColor="#fff6dc" stopOpacity=".85" />
						<stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
					</radialGradient>
					<filter id="gw-blur">
						<feGaussianBlur stdDeviation="8" />
					</filter>
				</defs>
				<path
					d="M30 310 L30 150 Q30 40 100 14 Q170 40 170 150 L170 310Z"
					fill="#0b0807"
				/>
				<g className="gw-glow" filter="url(#gw-blur)" opacity=".55">
					{panes.map((d, i) => (
						<path key={d} d={d} fill={fills[i]} />
					))}
				</g>
				{panes.map((d, i) => (
					<path key={d} d={d} fill={fills[i]} opacity=".9" />
				))}
				<path
					d="M40 300 L40 150 Q40 60 100 30 Q160 60 160 150 L160 300Z"
					fill="url(#gw-light)"
					className="gw-flicker"
				/>
				<path
					d="M40 300 L40 150 Q40 60 100 30 Q160 60 160 150 L160 300Z M40 150 H160 M100 30 V220 M40 300 L100 220 L160 300 M40 225 H70 M130 225 H160 M60 85 L100 150 L140 85"
					fill="none"
					stroke="#0b0807"
					strokeWidth="5"
					strokeLinejoin="round"
				/>
				<path
					d="M30 310 L30 150 Q30 40 100 14 Q170 40 170 150 L170 310Z"
					fill="none"
					stroke="#3a2c22"
					strokeWidth="6"
				/>
				<path
					d="M30 310 L30 150 Q30 40 100 14 Q170 40 170 150 L170 310Z"
					fill="none"
					stroke="#0b0807"
					strokeWidth="2"
				/>
			</svg>
			<div className="glass-window-center">{children}</div>
		</div>
	);
}
