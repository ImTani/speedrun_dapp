// Sound, particles and haptics for the teaching moments. No-ops while muted, before the first
// tap, with the tab hidden, or (particles) with reduced motion.
import { buzz, HAPTIC, play } from "@/audio";
import { FX, fx } from "@/fx";

/** Something newly opened is pointed at: the unlock cue and a gold ring around it. */
export function unlockMoment(el: Element) {
	play("unlock");
	buzz(HAPTIC.unlock);
	fx.burst("unlock", el, { amount: 0.8 });
	fx.ring(el, FX.gilt, { radius: 120, width: 5, duration: 0.7, delay: 0.08 });
}

/** The wax is pressed: the seal, a buzz, and a sparkle of gilt off the seal. */
export function sealMoment(el: Element | null) {
	play("seal");
	buzz(HAPTIC.seal);
	if (el) fx.burst("unlock", el, { amount: 0.7, delay: 0.1 });
}
