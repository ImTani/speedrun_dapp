"use client";

/**
 * Shared feel for the signed-in shell: one tap sound for every button, and the gilt
 * flourish that marks something newly opened.
 *
 *   useTapSounds();                 // once, in the shell
 *   <div data-sfx="off">...</div>   // a block that plays its own cues (the tab bar, Scry)
 *   <button data-sfx="seal">        // a different cue than the plain tap
 *
 * Press scale is already shared (`pressable` from @/ui/motion on motion buttons, `.btn:active`
 * in globals.css); this adds the sound without a call in every handler. Clicks only: a scroll
 * or a drag never ticks.
 */
import { useEffect } from "react";
import { CUES, type Cue, play } from "@/audio";
import { FX, fx } from "@/fx";

const PRESSABLE = "button, [role='button'], [role='switch'], [role='tab']";

export function useTapSounds(): void {
	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const t = e.target;
			if (!(t instanceof Element)) return;
			const b = t.closest(PRESSABLE);
			if (!b) return;
			if ((b as HTMLButtonElement).disabled) return;
			if (b.getAttribute("aria-disabled") === "true") return;
			const tag = b.closest("[data-sfx]")?.getAttribute("data-sfx");
			if (tag === "off") return;
			const cue = tag && tag in CUES ? (tag as Cue) : "tap";
			play(cue);
		};
		// Bubble phase: React's own handlers (which may mute, or play a bigger cue) run first.
		document.addEventListener("click", onClick);
		return () => document.removeEventListener("click", onClick);
	}, []);
}

/** A gilt ring and a spray of sparks on something that just opened (a tab icon, a card). */
export function gildOpening(at: Element | null, delay = 0): void {
	if (!at) return;
	fx.ring(at, FX.gilt, { radius: 64, width: 5, duration: 0.6, delay });
	fx.burst("unlock", at, { amount: 0.6, delay });
}
