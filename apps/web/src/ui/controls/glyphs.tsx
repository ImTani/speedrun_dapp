/**
 * The control family's small glyphs, all inline SVG on a 24 x 24 grid, drawn in
 * `currentColor` unless they are a seal (which carries its own colours).
 */
import { type ReactNode, useId } from "react";
import { SPEAKER_ICON } from "@/audio/credits";

/** Secondary bar's seal: a gilt-rimmed umber disc with the rose in gilt line. */
export function GiltSeal() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<circle cx="12" cy="12" r="11" fill="#0b0807" />
			<circle cx="12" cy="12" r="10" fill="#9a7a35" />
			<circle cx="12" cy="12" r="8.6" fill="#2c2017" />
			<circle
				cx="12"
				cy="12"
				r="8.6"
				fill="none"
				stroke="#e3c27c"
				strokeOpacity=".35"
				strokeWidth=".8"
			/>
			<g fill="none" stroke="#e3c27c" strokeWidth="1.15">
				{[0, 60, 120, 180, 240, 300].map((a) => (
					<ellipse
						key={a}
						cx="12"
						cy="8.6"
						rx="1.5"
						ry="2.6"
						transform={`rotate(${a} 12 12)`}
					/>
				))}
			</g>
			<circle cx="12" cy="12" r="1.3" fill="#f5dfa0" />
		</svg>
	);
}

/** Danger bar's broken seal: a blood disc, a chip knocked out, a crack through the rose. */
export function BrokenSeal() {
	const id = `${useId().replace(/[^a-zA-Z0-9]/g, "")}bs`;
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<defs>
				<radialGradient id={id} cx="38%" cy="32%" r="72%">
					<stop offset="0" stopColor="#c02a30" />
					<stop offset=".45" stopColor="#8e1218" />
					<stop offset="1" stopColor="#3a0709" />
				</radialGradient>
			</defs>
			{/* the disc with a wedge missing at the upper right */}
			<path
				d="M12 1.2 A10.8 10.8 0 1 0 22.6 9.6 L18.2 10.4 L17.6 6.6 L14.6 6.1 Z"
				fill={`url(#${id})`}
				stroke="#1a0204"
				strokeWidth="1.2"
				strokeLinejoin="round"
			/>
			{/* the knocked-out chip, fallen a little away */}
			<path
				d="M15.6 2.4 L21.7 7.2 L19.4 7.9 L18.9 5.1 Z"
				fill="#6a0d12"
				stroke="#1a0204"
				strokeWidth="1"
				strokeLinejoin="round"
			/>
			<circle
				cx="12"
				cy="12.4"
				r="5.4"
				fill="none"
				stroke="#e8686a"
				strokeOpacity=".55"
				strokeWidth="1"
			/>
			{/* the crack */}
			<path
				d="M14.6 6.1 L12.6 10 L13.8 12.6 L10.4 15.6 L11.2 18.4 L8.6 22.2"
				fill="none"
				stroke="#0b0807"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

const stroke = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2.4,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

/** An eight-toothed cog with a bored hub (src/screens/title/SettingsEntry.tsx). */
const GEAR =
	"M19.83 9.58L22.78 9.81L22.78 14.19L19.83 14.42L19.25 15.83L21.17 18.08L18.08 21.17L15.83 19.25L14.42 19.83L14.19 22.78L9.81 22.78L9.58 19.83L8.17 19.25L5.92 21.17L2.83 18.08L4.75 15.83L4.17 14.42L1.22 14.19L1.22 9.81L4.17 9.58L4.75 8.17L2.83 5.92L5.92 2.83L8.17 4.75L9.58 4.17L9.81 1.22L14.19 1.22L14.42 4.17L15.83 4.75L18.08 2.83L21.17 5.92L19.25 8.17Z M15.6 12A3.6 3.6 0 1 0 8.4 12A3.6 3.6 0 1 0 15.6 12Z";

export const GLYPHS = {
	gear: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d={GEAR} fill="currentColor" fillRule="evenodd" />
		</svg>
	),
	speaker: (
		<svg viewBox={SPEAKER_ICON.viewBox} aria-hidden="true">
			<path d={SPEAKER_ICON.on.d} fill="currentColor" />
		</svg>
	),
	speakerOff: (
		<svg viewBox={SPEAKER_ICON.viewBox} aria-hidden="true">
			<path d={SPEAKER_ICON.off.d} fill="currentColor" />
		</svg>
	),
	back: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M15 4 L7 12 L15 20" {...stroke} />
		</svg>
	),
	prev: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M15 4 L7 12 L15 20" {...stroke} />
		</svg>
	),
	next: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M9 4 L17 12 L9 20" {...stroke} />
		</svg>
	),
	close: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M6 6 L18 18 M18 6 L6 18" {...stroke} />
		</svg>
	),
	hourglass: (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M6 3 H18 M6 21 H18" {...stroke} strokeWidth={2.2} />
			<path
				d="M7.5 3.5 C7.5 9 12 10 12 12 C12 14 7.5 15 7.5 20.5 M16.5 3.5 C16.5 9 12 10 12 12 C12 14 16.5 15 16.5 20.5"
				{...stroke}
				strokeWidth={1.8}
			/>
			<path d="M9 20 Q12 15.5 15 20 Z" fill="currentColor" />
			<path d="M9.6 7 Q12 9.4 14.4 7 Z" fill="currentColor" opacity=".7" />
		</svg>
	),
} as const satisfies Record<string, ReactNode>;

export type GlyphName = keyof typeof GLYPHS;
