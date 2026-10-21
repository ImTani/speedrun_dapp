/** The two moves, drawn: Kindle a candle flame, Devour a fanged maw. Decorative. */
export function MoveGlyph({
	devour,
	className,
}: {
	devour: boolean;
	className?: string | undefined;
}) {
	return devour ? (
		<svg viewBox="0 0 40 40" className={className} aria-hidden="true">
			<path
				d="M5 12 Q20 4 35 12 L31 18 L27 13 L24 19 L20 13 L16 19 L13 13 L9 18 Z M7 28 Q20 37 33 28 L29 23 L25 28 L22 22 L18 22 L15 28 L11 23 Z"
				fill="#c7262c"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
		</svg>
	) : (
		<svg viewBox="0 0 40 40" className={className} aria-hidden="true">
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
