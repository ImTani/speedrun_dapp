import {
	DEFAULT_KNOBS,
	decodeConfig,
	type Knobs,
	STRATEGY_KNOBS,
	type StrategyId,
} from "@arena/strategies";
import { ApiError, type FragmentRow, type useApi } from "@/client/api";
import { L } from "@/lexicon";

export type Api = ReturnType<typeof useApi>;

export const errText = (e: unknown) =>
	e instanceof ApiError && e.status === 503
		? L.errors.unavailable
		: L.errors.generic;

/** The Aspect and Sigils a bound Fragment was cut with. */
export function aspectOf(f: FragmentRow): { aspect: number; knobs: Knobs } {
	try {
		const c = decodeConfig(BigInt(f.config));
		return { aspect: c.strategy, knobs: c.knobs };
	} catch {
		return { aspect: 6, knobs: DEFAULT_KNOBS };
	}
}

/** The Sigils that change how this Aspect's Fragment behaves (the only ones shown). */
export const sigilsFor = (aspect: number): readonly (keyof Knobs)[] =>
	STRATEGY_KNOBS[aspect as StrategyId] ?? [];

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A name the glass whispers, never the one already spoken. */
export function divineName(current: string): string {
	const pool = L.bind.names.filter((n) => n !== current.trim());
	return pool[Math.floor(Math.random() * pool.length)] ?? L.bind.names[0];
}
