"use client";

/**
 * <SoundToggle/>: the speaker IconButton (a toggle) that mutes and unmutes every sound.
 * <SoundSettingsList/>: three Switch rows (Sound, Cathedral air, Vibration) for a
 * settings sheet. Vibration is only listed where the device can vibrate; Cathedral air
 * waits on Sound, and says so under its row.
 *
 * Both persist through ./settings.ts and arm the engine, so placing either one
 * is enough for the first tap to unlock audio.
 */
import { useEffect, useId, useState } from "react";
import { audio as L } from "@/lexicon/audio";
import { ControlNote, IconButton, Switch } from "@/ui/controls";
import s from "./audio.module.css";
import { play } from "./engine";
import { buzz, HAPTIC } from "./haptics";
import { useSoundSettings } from "./useSfx";

/** The speaker: an IconButton toggle (aria-pressed; off dims the glyph). */
export function SoundToggle({ className }: { className?: string }) {
	const [settings, set] = useSoundSettings();
	const on = settings.sound;
	return (
		<IconButton
			icon={on ? "speaker" : "speakerOff"}
			label={L.sound}
			size="sm"
			aria-pressed={on}
			{...(className ? { className } : null)}
			// It plays its own tick (only when turning sound on) and buzzes its own.
			sfx="off"
			onClick={() => {
				set({ sound: !on });
				// Runs inside the click, so turning sound on can start the context at once.
				if (!on) play("tap", { maxLate: 400 });
			}}
		/>
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
			{rows.map((r) => (
				<SoundRow
					key={r.key}
					label={r.label}
					checked={settings[r.key] && !r.disabled}
					disabled={r.disabled ?? false}
					onChange={(next) => {
						set({ [r.key]: next });
						if (r.key === "sound" && next) play("tap", { maxLate: 400 });
						// After set(): turning vibration off stays still, on gives a tick.
						buzz(HAPTIC.tap);
					}}
					// The Sound row plays its own tick when it turns sound on.
					sfx={r.key === "sound" ? "off" : undefined}
				/>
			))}
		</ul>
	);
}

/** One settings row: the Switch, and why it is off when it cannot be changed. */
function SoundRow({
	label,
	checked,
	disabled,
	onChange,
	sfx,
}: {
	label: string;
	checked: boolean;
	disabled: boolean;
	onChange: (next: boolean) => void;
	sfx: "off" | undefined;
}) {
	const why = useId();
	return (
		<li>
			<Switch
				checked={checked}
				label={label}
				disabled={disabled}
				haptic={false}
				sfx={sfx}
				aria-describedby={disabled ? why : undefined}
				onChange={onChange}
			/>
			{disabled ? (
				<ControlNote id={why} align="start" className={s.why ?? ""}>
					{L.needsSound}
				</ControlNote>
			) : null}
		</li>
	);
}
