"use client";

/**
 * The way to the settings sheet from inside the game: the gear IconButton (a 36px stone
 * token in a 44px target) beside the speaker. It opens the Colophon as Settings (sound,
 * credits, legal, delete account) with How to play at its top.
 *
 *   <SettingsEntry />
 *
 * The sheet is portalled to <body>: the Stage shakes its header with a transform, which
 * would otherwise capture the sheet's fixed position.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { shell } from "@/lexicon/shell";
import { useCodex } from "@/screens/codex";
import { IconButton } from "@/ui/controls";
import { Colophon } from "./Colophon";

/** After deletion the player is signed out: a fresh load of the game shows the title screen. */
const backToTitle = () => window.location.replace("/play");

export function SettingsEntry({ className }: { className?: string }) {
	const [open, setOpen] = useState(false);
	const howTo = useCodex();
	return (
		<>
			<IconButton
				icon="gear"
				label={shell.colophon.openSettings}
				size="sm"
				{...(className ? { className } : null)}
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
			/>
			{typeof document !== "undefined"
				? createPortal(
						<Colophon
							open={open}
							onClose={() => setOpen(false)}
							inGame
							onDeleted={backToTitle}
							onHowTo={() => {
								// One sheet at a time: Settings steps aside, then How to play rises.
								setOpen(false);
								howTo.show(undefined, true);
							}}
						/>,
						document.body,
					)
				: null}
			{howTo.sheet}
		</>
	);
}
