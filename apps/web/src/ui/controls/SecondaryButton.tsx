"use client";

import { Bar, type BarProps } from "./Bar";

/**
 * The second action beside or under a PrimaryButton, and the main action of a quiet
 * surface: dark umber wax, a small gilt seal at the leading end, a gilt Grenze label.
 *
 *   <SecondaryButton onClick={retune}>Retune</SecondaryButton>
 *   <SecondaryButton icon={<Star />} onClick={divine}>Suggest a name</SecondaryButton>
 */
export function SecondaryButton(props: BarProps) {
	return <Bar tone="secondary" {...props} />;
}
