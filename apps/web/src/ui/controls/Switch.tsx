"use client";

/**
 * The one switch (role="switch"): a carved groove with a stone knob that slides to a gilt
 * boss when on. As a settings row (label, optional hint and icon, the switch at the end;
 * the whole row is the 48px target) or `bare` (just the switch, 44px target; `label`
 * becomes its accessible name).
 *
 *   <Switch checked={on} onChange={setOn} label="Vibration" />
 *   <Switch checked={bell} onChange={toggle} label="Notifications" hint="One a day"
 *     icon={<Bell />} />
 *
 * The focus ring follows the groove (a pill), not the row.
 */
import { type HTMLMotionProps, motion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { useControlDefs } from "./defs";
import r from "./ring.module.css";
import s from "./switch.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type SwitchProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick" | "onChange" | "role"
> & {
	checked: boolean;
	onChange?: ((next: boolean) => void) | undefined;
	label: ReactNode;
	hint?: ReactNode | undefined;
	icon?: ReactNode | undefined;
	/** Only the switch; `label` must then be a string (the accessible name). */
	bare?: boolean | undefined;
	ref?: Ref<HTMLButtonElement>;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

export function Switch({
	checked,
	onChange,
	label,
	hint,
	icon,
	bare,
	haptic,
	sfx,
	pressed,
	focused,
	disabled,
	className,
	type = "button",
	...rest
}: SwitchProps) {
	useControlDefs();
	const press = usePress({
		onClick: () => onChange?.(!checked),
		haptic,
		sfx,
		disabled,
		pressed,
		scale: bare ? 0.94 : 1,
	});
	return (
		<motion.button
			type={type}
			role="switch"
			aria-checked={checked}
			className={cx(r.host, s.sw, className)}
			data-bare={bare || undefined}
			data-on={checked || undefined}
			data-focused={focused || undefined}
			disabled={disabled}
			{...(bare && typeof label === "string" ? { "aria-label": label } : null)}
			{...press}
			{...rest}
		>
			{bare ? null : (
				<>
					{icon ? (
						<span className={s.icon} aria-hidden="true">
							{icon}
						</span>
					) : null}
					<span className={s.text}>
						<span className={s.label}>{label}</span>
						{hint ? <span className={s.hint}>{hint}</span> : null}
					</span>
				</>
			)}
			<span className={s.track} aria-hidden="true">
				<span className={cx(r.shape, s.groove)} />
				<span className={s.knob} />
			</span>
		</motion.button>
	);
}
