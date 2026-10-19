"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { GameShell } from "@/screens/title/Shell";
import { TitleScreen } from "@/screens/title/TitleScreen";
import { FirstRun } from "@/screens/tutorial/Tutorial";
import { MotionRoot } from "@/ui/motion/MotionRoot";
import { TAB_ORDER, type Tab } from "@/ui/TabBar";

/** `?tab=gathering` (notification taps) opens on that tab. */
function tabFromUrl(): Tab {
	if (typeof window === "undefined") return "fragment";
	const t = new URLSearchParams(window.location.search).get("tab");
	return TAB_ORDER.find((x) => x === t) ?? "fragment";
}

export default function Home() {
	const { ready, authenticated, login } = usePrivy();
	const [initialTab] = useState(tabFromUrl);

	return (
		<MotionRoot>
			{!ready || !authenticated ? (
				<TitleScreen ready={ready} onEnter={() => login()} />
			) : (
				<>
					<GameShell initialTab={initialTab} />
					<FirstRun />
				</>
			)}
		</MotionRoot>
	);
}
