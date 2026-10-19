"use client";

import { useEffect, useState } from "react";
import { L } from "@/lexicon";

type MaskApi = { mask: (aspect: string, width?: number) => string };
let loaded: Promise<MaskApi | null> | null = null;

function loadMasks(): Promise<MaskApi | null> {
	loaded ??= import("@/scene/masks.js")
		.then(
			(m) =>
				(m.MASK as MaskApi | undefined) ??
				(window as unknown as { MASK?: MaskApi }).MASK ??
				null,
		)
		.catch(() => null);
	return loaded;
}

const FALLBACK_FILL = [
	"#f1e9da",
	"#c9a24e",
	"#c9ccd4",
	"#6b3b2a",
	"#a3172f",
	"#e2d6bf",
	"#3b2a4a",
];

/** An Aspect mask (index 0-6). Uses the ported scene masks, else a plain drawn fallback. */
export function Mask({
	aspect,
	width = 60,
}: {
	aspect: number;
	width?: number;
}) {
	const key = L.aspects[aspect]?.key ?? "madness";
	const [svg, setSvg] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		loadMasks().then((api) => {
			if (live && api) setSvg(api.mask(key, width));
		});
		return () => {
			live = false;
		};
	}, [key, width]);
	if (svg)
		return (
			// biome-ignore lint/security/noDangerouslySetInnerHtml: static SVG markup from our own scene module
			<span className="mask-svg" dangerouslySetInnerHTML={{ __html: svg }} />
		);
	return (
		<svg
			width={width}
			height={Math.round((width * 84) / 100)}
			viewBox="0 0 100 84"
			aria-hidden="true"
		>
			<path
				d="M8 34 Q28 14 50 20 Q72 14 92 34 Q88 56 64 58 Q56 58 50 50 Q44 58 36 58 Q12 56 8 34Z"
				fill={FALLBACK_FILL[aspect] ?? "#888"}
				stroke="#0b0807"
				strokeWidth="2.4"
			/>
			<path
				d="M24 36 Q32 28 40 36 Q32 40 24 36Z M60 36 Q68 28 76 36 Q68 40 60 36Z"
				fill="#0b0807"
			/>
		</svg>
	);
}
