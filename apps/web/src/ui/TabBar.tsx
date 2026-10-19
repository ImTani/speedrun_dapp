"use client";

import { L } from "@/lexicon";

export type Tab = keyof typeof L.tabs;
const ORDER: Tab[] = ["fragment", "spire", "gathering", "reliquary", "vestry"];

// Tiny ink glyphs: window, spire, rose, reliquary, vestment.
const GLYPH: Record<Tab, string> = {
	fragment: "M6 26V12a8 8 0 0 1 16 0v14Z M14 4v22 M6 15h16",
	spire: "M14 2 L20 26 H8Z M11 16h6 M14 2v-0",
	gathering:
		"M14 3a11 11 0 1 0 0.01 0Z M14 3v22 M3 14h22 M6 6l16 16 M22 6L6 22",
	reliquary: "M5 12h18v13H5Z M8 12V8h12v4 M14 15v6 M11 18h6",
	vestry: "M8 4h12l4 8-4 2v12H8V14l-4-2Z M14 4v22",
};

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
	return (
		<nav className="tabbar">
			{ORDER.map((t) => (
				<button
					key={t}
					type="button"
					className={`tab${t === tab ? " on" : ""}${t === "gathering" ? " tab-center" : ""}`}
					onClick={() => onTab(t)}
					aria-current={t === tab ? "page" : undefined}
				>
					<svg viewBox="0 0 28 28" aria-hidden="true">
						<path d={GLYPH[t]} />
					</svg>
					<span>{L.tabs[t]}</span>
				</button>
			))}
		</nav>
	);
}
