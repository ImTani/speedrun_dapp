// The Gathering's sound, particles and haptics, beat by beat. Pure calls into the audio and fx
// engines: every one is a no-op while muted, before the first tap, with the tab hidden, or (for
// particles) with reduced motion. The hit-stop, shake and flash stay in GatheringScreen; these
// fire on the same beat so the ear and the eye land together.
import { buzz, HAPTIC, play } from "@/audio";
import { FX, fx, PALETTES } from "@/fx";
import type { Duel, SideKey } from "./model.ts";

/** How hard the queue is pushing: 1 = live pace, more when it is catching up on a backlog. */
export type Pace = number;
/** Catching up: lighter cues, fewer particles, no buzz for others' duels. */
export const quick = (pace: Pace) => pace > 1;

const other = (k: SideKey): SideKey => (k === "A" ? "B" : "A");

/** The bell. A new toll rings out in full; the same toll again only murmurs (and not when hurrying). */
export function tollCue(fresh: boolean, pace: Pace) {
	if (fresh) play("toll", { volume: quick(pace) ? 0.7 : 1 });
	else if (!quick(pace)) play("toll", { volume: 0.32, rate: 1.06 });
}

/** The cards turn. Dropped when the queue is racing (the verdict says enough). */
export function unveilCue(pace: Pace) {
	if (pace >= 3) return;
	play("unveil", { volume: quick(pace) ? 0.55 : 1 });
}

/** Wax pressed into the floor as choices are sealed: a few soft ticks, the player's own in full. */
export function sealTicks(others: number, mine: boolean) {
	const n = Math.min(3, others);
	for (let i = 0; i < n; i++)
		play("seal", {
			volume: 0.38,
			rate: 1.2 + i * 0.05,
			delay: 150 + i * 110,
		});
	if (mine) {
		play("seal", { delay: 150 + n * 110 });
		buzz(HAPTIC.seal);
	}
}

/**
 * The verdict lands. `win(k)` finds each window's mask (for particles); `pace` scales it down
 * while the queue fast-forwards.
 */
export function verdictJuice(
	d: Duel,
	win: (k: SideKey) => Element | null,
	pace: Pace,
) {
	const q = quick(pace);
	const vol = q ? 0.6 : 1;
	const amount = q ? 0.45 : 1;
	const A = win("A"),
		B = win("B");

	if (d.silent) {
		// A mask kept silent: no blow was struck. A muted note, no sparks.
		play(d.kind === "kindle" ? "kindle" : "devour", {
			volume: vol * 0.45,
			rate: 0.9,
		});
		return;
	}

	if (d.kind === "kindle") {
		play("kindle", { volume: vol });
		if (A) fx.burst("kindle", A, { amount });
		if (B) fx.burst("kindle", B, { amount, delay: 0.04 });
		return;
	}

	if (d.kind === "ruin") {
		// Both devoured: two low blows, both panes break.
		play("devour", { volume: vol, rate: 0.84 });
		play("devour", { volume: vol * 0.75, rate: 0.72, delay: 150 });
		for (const [el, delay] of [
			[A, 0],
			[B, 0.15],
		] as const) {
			if (!el) continue;
			fx.burst("shards", el, { amount: amount * 0.8, delay });
			fx.burst("shards", el, {
				palette: PALETTES.devour,
				amount: amount * 0.4,
				delay,
			});
			fx.ring(el, FX.blood, { radius: 70, delay });
		}
		const mine = d.a.mine || d.b.mine;
		if (mine) buzz(HAPTIC.devour);
		else if (!q) buzz(14);
		return;
	}

	// One devoured the other: the victim's pane shatters.
	const dev = d.dev ?? "A";
	const vic = other(dev);
	const victim = vic === "A" ? d.a : d.b;
	const el = win(vic);
	play("devour", { volume: vol });
	if (el) {
		fx.burst("shards", el, { amount });
		fx.burst("shards", el, { palette: PALETTES.devour, amount: amount * 0.5 });
		fx.ring(el, FX.blood, { radius: 80 });
	}
	// The victim's side feels it: in full when it is the player's own Fragment.
	if (victim.mine) buzz(HAPTIC.devour);
	else if (!q) buzz(14);
}

/** One Light landing in a tally: a rising ding (the i-th of n). */
export function lightDing(i: number, pace: Pace) {
	play("light", {
		rate: 1 + Math.min(i, 12) * 0.045,
		pitchJitter: 0.15,
		volume: quick(pace) ? 0.55 : 1,
	});
}

/** The Ledger sheet sliding open or shut. */
export const ledgerCue = (open: boolean) =>
	play("tab", { rate: open ? 1 : 0.9 });
