"use client";

/**
 * <SoundToggle/>: a 44 px speaker button that mutes and unmutes every sound.
 * <SoundSettingsList/>: three switches (Sound, Cathedral air, Vibration) for a
 * settings sheet. Vibration is only listed where the device can vibrate.
 *
 * Both persist through ./settings.ts and arm the engine, so placing either one
 * is enough for the first tap to unlock audio.
 */
import { useEffect, useState } from "react";
import { audio as L } from "@/lexicon/audio";
import s from "./audio.module.css";
import { SPEAKER_ICON } from "./credits";
import { play } from "./engine";
import { buzz, HAPTIC } from "./haptics";
import { useSoundSettings } from "./useSfx";

export function SoundToggle({ className }: { className?: string }) {
	const [settings, set] = useSoundSettings();
	const on = settings.sound;
	const glyph = on ? SPEAKER_ICON.on : SPEAKER_ICON.off;
	return (
		<button
			type="button"
			className={className ? `${s.toggle} ${className}` : s.toggle}
			data-on={on}
			aria-label={on ? L.mute : L.unmute}
			onClick={() => {
				set({ sound: !on });
				// Runs inside the click, so turning sound on can start the context at once.
				if (!on) play("tap", { maxLate: 400 });
				buzz(HAPTIC.tap);
			}}
		>
			<svg
				className={s.icon}
				viewBox={SPEAKER_ICON.viewBox}
				aria-hidden="true"
				focusable="false"
			>
				<path d={glyph.d} />
			</svg>
		</button>
	);
}

function canVibrate(): boolean {
	return (
		typeof navigator !== "undefined" &&
		typeof (navigator as Navigator & { vibrate?: unknown }).vibrate ===
			"function"
	);
}

export function SoundSettingsList({ className }: { className?: string }) {
	const [settings, set] = useSoundSettings();
	// Known only in the browser; decided after mount so server and client markup match.
	const [vibrates, setVibrates] = useState(false);
	useEffect(() => setVibrates(canVibrate()), []);

	const rows: {
		key: "sound" | "ambient" | "haptics";
		label: string;
		disabled?: boolean;
	}[] = [
		{ key: "sound", label: L.sound },
		{ key: "ambient", label: L.ambient, disabled: !settings.sound },
	];
	if (vibrates) rows.push({ key: "haptics", label: L.haptics });

	return (
		<ul className={className ? `${s.list} ${className}` : s.list}>
			{rows.map((r) => {
				const checked = settings[r.key] && !r.disabled;
				return (
					<li key={r.key}>
						<button
							type="button"
							role="switch"
							aria-checked={checked}
							disabled={r.disabled}
							className={s.row}
							onClick={() => {
								const next = !settings[r.key];
								set({ [r.key]: next });
								if (r.key === "sound" && next) play("tap", { maxLate: 400 });
								// After set(): turning vibration off stays still, on gives a tick.
								buzz(HAPTIC.tap);
							}}
						>
							<span>{r.label}</span>
							<span className={s.switch} aria-hidden="true" />
						</button>
					</li>
				);
			})}
		</ul>
	);
}
