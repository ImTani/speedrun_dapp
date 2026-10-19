"use client";

import { L } from "@/lexicon";

export function Sealed({ which }: { which: "spire" | "reliquary" | "vestry" }) {
	const copy = L.sealed[which];
	return (
		<section className="screen sealed">
			<svg className="sealed-door" viewBox="0 0 200 260" aria-hidden="true">
				<path
					d="M20 250 V110 Q20 20 100 10 Q180 20 180 110 V250Z"
					fill="#1a1210"
					stroke="#0b0807"
					strokeWidth="5"
				/>
				<path d="M100 14 V250" stroke="#0b0807" strokeWidth="4" />
				{[70, 120, 170, 220].map((y) => (
					<path key={y} d={`M24 ${y} H176`} stroke="#3a2c22" strokeWidth="6" />
				))}
				<path
					d="M30 140 L170 170 M30 170 L170 140"
					stroke="#5a4a3a"
					strokeWidth="7"
					strokeLinecap="round"
				/>
				<circle
					cx="100"
					cy="155"
					r="20"
					fill="#8e1218"
					stroke="#0b0807"
					strokeWidth="4"
				/>
				<path d="M92 155 h16 M100 147 v16" stroke="#0b0807" strokeWidth="3" />
			</svg>
			<h1 className="lettering">{copy.name}</h1>
			<p className="prose">{copy.text}</p>
			<p className="sealed-tag">{L.sealed.footer}</p>
		</section>
	);
}
