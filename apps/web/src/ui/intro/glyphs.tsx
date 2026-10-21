/**
 * Small drawings for teaching: the two choices, a sealed choice, a Mark's medal and a
 * tab's carving. Inline SVG only (art in code). All decorative (aria-hidden): the words
 * beside them carry the meaning.
 */
import { ICONS, type IconKey } from "@/ui/tabIcons";

/** Kindle: a candle flame (the same flame as the practice duel). */
export function KindleGlyph({ size = 24 }: { size?: number }) {
	return (
		<svg
			viewBox="0 0 40 40"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M20 3 C26 12 31 17 31 25 A11 11 0 0 1 9 25 C9 18 14 15 16 9 C18 14 21 15 20 3 Z"
				fill="#f2c25a"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
			<path
				d="M20 17 C23 22 25 24 25 28 A5 5 0 0 1 15 28 C15 24 18 22 20 17 Z"
				fill="#fff1c8"
			/>
		</svg>
	);
}

/** Devour: a fanged maw. */
export function DevourGlyph({ size = 24 }: { size?: number }) {
	return (
		<svg
			viewBox="0 0 40 40"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M5 12 Q20 4 35 12 L31 18 L27 13 L24 19 L20 13 L16 19 L13 13 L9 18 Z M7 28 Q20 37 33 28 L29 23 L25 28 L22 22 L18 22 L15 28 L11 23 Z"
				fill="#c7262c"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** A sealed choice: a wax disc, nothing showing yet. */
export function SealedGlyph({ size = 24 }: { size?: number }) {
	return (
		<svg
			viewBox="0 0 40 40"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M20 4 C27 4 31 7 34 12 C37 17 36 24 33 29 C30 34 25 36 20 36 C14 36 9 34 6 28 C3 22 4 15 8 10 C11 6 15 4 20 4 Z"
				fill="#8e1218"
				stroke="#0b0807"
				strokeWidth="2.4"
			/>
			<circle
				cx="20"
				cy="20"
				r="9"
				fill="none"
				stroke="#e8686a"
				strokeOpacity=".6"
				strokeWidth="1.6"
			/>
			<path
				d="M20 13 L22 18 L27 20 L22 22 L20 27 L18 22 L13 20 L18 18 Z"
				fill="#e8686a"
				fillOpacity=".7"
			/>
		</svg>
	);
}

/** A Mark: a gilt medal on a short ribbon. */
export function MedalGlyph({ size = 24 }: { size?: number }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<path d="M8 2 L12 9 L16 2 Z" fill="#8e1218" />
			<circle cx="12" cy="15" r="7" fill="currentColor" />
			<circle
				cx="12"
				cy="15"
				r="4.6"
				fill="none"
				stroke="#0b0807"
				strokeOpacity=".55"
				strokeWidth="1.2"
			/>
			<path
				d="M12 11.6 L13 14 L15.4 14.2 L13.6 15.8 L14.1 18.2 L12 17 L9.9 18.2 L10.4 15.8 L8.6 14.2 L11 14 Z"
				fill="#0b0807"
				fillOpacity=".55"
			/>
		</svg>
	);
}

/** One of the five tab carvings (the ledge's own icons), in `currentColor`. */
export function TabGlyph({ tab, size = 24 }: { tab: IconKey; size?: number }) {
	return (
		<svg
			viewBox="0 0 512 512"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			<path d={ICONS[tab].d} fill="currentColor" />
		</svg>
	);
}
