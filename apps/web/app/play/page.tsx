"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { GameStateProvider } from "@/client/state";
import { CookieNotice } from "@/legal";
import { shell } from "@/lexicon/shell";
import { GameShell } from "@/screens/title/Shell";
import { TitleScreen } from "@/screens/title/TitleScreen";
import { useAppFrame } from "@/ui/appFrame";
import { MotionRoot } from "@/ui/motion/MotionRoot";
import { TAB_ORDER, type Tab } from "@/ui/TabBar";

/** `?tab=gathering` (notification taps) opens on that tab. */
function tabFromUrl(): Tab {
	if (typeof window === "undefined") return "fragment";
	const t = new URLSearchParams(window.location.search).get("tab");
	return TAB_ORDER.find((x) => x === t) ?? "fragment";
}

/** The game: the title screen, then the signed-in shell. The installed app opens here. */
export default function Play() {
	const { ready, authenticated, login } = usePrivy();
	const [initialTab] = useState(tabFromUrl);
	const inside = ready && authenticated;
	// Full-bleed app: the document is locked here (not on the landing or legal pages), and the
	// soft keyboard is tracked for the screens that type.
	useAppFrame();

	return (
		<MotionRoot>
			{!inside ? (
				<TitleScreen ready={ready} onEnter={() => login()} />
			) : (
				// One shared read of the game state for the whole signed-in shell; the
				// onboarding guide lives inside the shell.
				<GameStateProvider>
					<GameShell initialTab={initialTab} />
				</GameStateProvider>
			)}
			{/* Mounted once for both. On the title it waits at the top, clear of the sign-in and
			    its consent line; inside it sits above the tab bar. */}
			<CookieNotice aboveTabBar={inside} top={!inside} />
			{/* Shown only on a phone held sideways (globals.css): the game is drawn upright. */}
			<div className="rotate-hint" role="status">
				<svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
					<rect x="15" y="6" width="18" height="32" rx="3" />
					<path d="M21 34h6" />
					<path d="M8 30a16 16 0 0 0 10 12M8 30l-1 5M8 30l5 1" />
				</svg>
				<p>{shell.rotate}</p>
			</div>
		</MotionRoot>
	);
}
