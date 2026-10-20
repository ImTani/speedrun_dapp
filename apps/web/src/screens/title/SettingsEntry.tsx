"use client";

/**
 * The way to the settings sheet from inside the game: a 44 px gear that sits beside the
 * speaker and opens the Colophon as Settings (sound, credits, legal, delete account).
 *
 *   <SettingsEntry />
 *
 * The sheet is portalled to <body>: the Stage shakes its header with a transform, which
 * would otherwise capture the sheet's fixed position.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { buzz, HAPTIC } from "@/audio";
import { shell } from "@/lexicon/shell";
import { Colophon } from "./Colophon";
import s from "./title.module.css";

/** An eight-toothed cog with a bored hub (drawn for this game, 24 x 24). */
const GEAR =
	"M19.83 9.58L22.78 9.81L22.78 14.19L19.83 14.42L19.25 15.83L21.17 18.08L18.08 21.17L15.83 19.25L14.42 19.83L14.19 22.78L9.81 22.78L9.58 19.83L8.17 19.25L5.92 21.17L2.83 18.08L4.75 15.83L4.17 14.42L1.22 14.19L1.22 9.81L4.17 9.58L4.75 8.17L2.83 5.92L5.92 2.83L8.17 4.75L9.58 4.17L9.81 1.22L14.19 1.22L14.42 4.17L15.83 4.75L18.08 2.83L21.17 5.92L19.25 8.17Z M15.6 12A3.6 3.6 0 1 0 8.4 12A3.6 3.6 0 1 0 15.6 12Z";

/** After deletion the player is signed out: a fresh load of the game shows the title screen. */
const backToTitle = () => window.location.replace("/play");

export function SettingsEntry({ className }: { className?: string }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				className={className ? `${s.gear} ${className}` : s.gear}
				aria-label={shell.colophon.openSettings}
				aria-haspopup="dialog"
				onClick={() => {
					buzz(HAPTIC.tap);
					setOpen(true);
				}}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path d={GEAR} fillRule="evenodd" />
				</svg>
			</button>
			{typeof document !== "undefined"
				? createPortal(
						<Colophon
							open={open}
							onClose={() => setOpen(false)}
							inGame
							onDeleted={backToTitle}
						/>,
						document.body,
					)
				: null}
		</>
	);
}
