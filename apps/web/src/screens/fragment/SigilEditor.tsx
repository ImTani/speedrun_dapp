"use client";

import {
	KNOB_BOUNDS,
	type Knobs,
	STRATEGY_KNOBS,
	type StrategyId,
} from "@arena/strategies";
import { L } from "@/lexicon";

export function sigilValue(key: keyof Knobs, v: number): string {
	if (key === "opening") return L.firstGesture[v] ?? "";
	if (key === "forgiveness" || key === "noise") return `${v}%`;
	return String(v);
}

/** Sliders for the Sigils that matter to this Aspect. */
export function SigilEditor({
	aspect,
	knobs,
	onChange,
	disabled = false,
}: {
	aspect: number;
	knobs: Knobs;
	onChange: (k: Knobs) => void;
	disabled?: boolean;
}) {
	const keys = STRATEGY_KNOBS[aspect as StrategyId] ?? [];
	if (keys.length === 0) return <p className="prose dim">{L.bind.noSigils}</p>;
	return (
		<div className="sigils">
			{keys.map((key) => {
				const { min, max } = KNOB_BOUNDS[key];
				const v = knobs[key];
				return (
					<div key={key} className="sigil">
						<span className="sigil-head">
							<span className="sigil-name">{L.sigils[key].name}</span>
							<span className="sigil-val">{sigilValue(key, v)}</span>
						</span>
						{key === "opening" ? (
							<span className="gestures">
								{L.firstGesture.map((g, i) => (
									<button
										key={g}
										type="button"
										disabled={disabled}
										className={`gesture${v === i ? " on" : ""}`}
										onClick={() =>
											onChange({ ...knobs, opening: i as Knobs["opening"] })
										}
									>
										{g}
									</button>
								))}
							</span>
						) : (
							<input
								type="range"
								aria-label={L.sigils[key].name}
								min={min}
								max={max}
								step={1}
								value={v}
								disabled={disabled}
								onChange={(e) =>
									onChange({ ...knobs, [key]: Number(e.target.value) })
								}
							/>
						)}
						<span className="sigil-desc">{L.sigils[key].desc}</span>
					</div>
				);
			})}
		</div>
	);
}
