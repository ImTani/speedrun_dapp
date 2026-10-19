"use client";

import { usePrivy } from "@privy-io/react-auth";
import { GameShell } from "@/screens/title/Shell";
import { TitleScreen } from "@/screens/title/TitleScreen";
import { MotionRoot } from "@/ui/motion/MotionRoot";

export default function Home() {
	const { ready, authenticated, login } = usePrivy();

	return (
		<MotionRoot>
			{!ready || !authenticated ? (
				<TitleScreen ready={ready} onEnter={() => login()} />
			) : (
				<GameShell />
			)}
		</MotionRoot>
	);
}
