/**
 * The premise in one picture: a rose window of the seven Aspects' glass around a lit eye,
 * three of its panes knocked loose and falling away. Inline SVG (art in code), decorative.
 */
import { ASPECT_GLASS } from "@/ui/GlassWindow";

const N = ASPECT_GLASS.length;
const R = 46;
const r = 14;
const C = 60;

const at = (rad: number, a: number) =>
	`${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`;
const angle = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2;

function wedge(i: number) {
	const a0 = angle(i);
	const a1 = angle(i + 1);
	return `M${at(r, a0)} L${at(R, a0)} A${R} ${R} 0 0 1 ${at(R, a1)} L${at(r, a1)} A${r} ${r} 0 0 0 ${at(r, a0)} Z`;
}

/** Panes knocked loose: how far they fall outward (px) and how much they turn (deg). */
const LOOSE: Record<number, [number, number]> = {
	1: [9, 16],
	3: [13, -20],
	5: [10, 24],
};

export function ShatteredRose({ size = 112 }: { size?: number }) {
	return (
		<svg
			viewBox="-8 -8 136 136"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<circle cx={C} cy={C} r="52" fill="#0b0807" />
			<circle
				cx={C}
				cy={C}
				r="50"
				fill="none"
				stroke="#5a4632"
				strokeWidth="2"
			/>
			{ASPECT_GLASS.map((g, i) => {
				const off = LOOSE[i];
				let transform: string | undefined;
				if (off) {
					// Out along the pane's own middle, turned about its own centre.
					const mid = (angle(i) + angle(i + 1)) / 2;
					const cx = C + 30 * Math.cos(mid);
					const cy = C + 30 * Math.sin(mid);
					const dx = off[0] * Math.cos(mid);
					const dy = off[0] * Math.sin(mid);
					transform = `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${off[1]} ${cx.toFixed(2)} ${cy.toFixed(2)})`;
				}
				return (
					<path
						// biome-ignore lint/suspicious/noArrayIndexKey: the panes are positional
						key={i}
						d={wedge(i)}
						fill={g[0]}
						fillOpacity={off ? 0.8 : 0.95}
						stroke="#0b0807"
						strokeWidth="3"
						strokeLinejoin="round"
						transform={transform}
					/>
				);
			})}
			<circle cx={C} cy={C} r="11" fill="#f3e6c8" />
			<circle
				cx={C}
				cy={C}
				r="11"
				fill="none"
				stroke="#0b0807"
				strokeWidth="3"
			/>
			<circle cx={C} cy={C} r="5" fill="#ffb27a" />
		</svg>
	);
}
