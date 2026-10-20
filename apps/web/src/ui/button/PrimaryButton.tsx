"use client";

import {
	type HTMLMotionProps,
	type MotionStyle,
	motion,
	useReducedMotion,
} from "motion/react";
/**
 * The primary call to action: one component, one look for the whole game.
 *
 *   <PrimaryButton legacy="btn btn-blood" burst onClick={bind}>Bind</PrimaryButton>
 *   <PrimaryButton hero legacy={s.cta} legacyLabel={s.ctaLabel}>Enter</PrimaryButton>
 *   <PrimaryLink href="/play" legacy={s.play} size="lg" inline>Play</PrimaryLink>
 *
 * The look comes from BUTTON_STYLE (./config.ts), or `?btn=<look>`, or the `look` prop
 * (the comparison sheet). "current" renders exactly what shipped: the caller's `legacy`
 * class, nothing added. Every other look draws its own face from CSS and inline SVG,
 * sets the label in Grenze roman, and adds the press juice:
 *
 *  - press: a spring scale (motion) plus the face sinking a pixel or two (CSS); the tap
 *    sound comes from the shell's global listener (honours data-sfx); a light haptic
 *    (buzz honours the Vibration switch; `haptic={false}` to leave it to the caller)
 *  - `burst`: a small spray of embers on press, for the big moments (Bind, Scry, Climb)
 *  - `loading`: no spinner; light fills the face left to right (`progress` 0..1, or a
 *    slow indeterminate pass); wax melts its seal instead
 *  - `hero`: one slow gilt sheen sweep every few seconds, only while on screen and the
 *    tab is visible, never under reduced motion. One hero per screen.
 *  - `pressed` / `focused` force those states (for the comparison sheet only).
 */
import Link from "next/link";
import {
	type MouseEvent,
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useRef,
} from "react";
import { buzz, HAPTIC } from "@/audio/haptics";
import { fx } from "@/fx";
import { spring } from "@/ui/motion/presets";
import s from "./button.module.css";
import type { ButtonLook } from "./config";
import { useButtonLook } from "./useButtonLook";

type Common = {
	children: ReactNode;
	/** Force a look (the comparison sheet); otherwise BUTTON_STYLE / ?btn=. */
	look?: ButtonLook | undefined;
	/** The class that draws the shipped ("current") look at this call site. */
	legacy?: string | undefined;
	/** In the "current" look only: wrap the label in this class (the title's Enter). */
	legacyLabel?: string | undefined;
	/** Layout only (width, margins); applied in every look. */
	className?: string | undefined;
	/** "lg": the screen's main action (56px+). "md": in cards and rows (48px). */
	size?: "lg" | "md" | undefined;
	/** Shrink to the label instead of filling the row. */
	inline?: boolean | undefined;
	/** The one slow sheen on the screen's hero action. */
	hero?: boolean | undefined;
	/** Embers on press, for the big moments. */
	burst?: boolean | undefined;
	loading?: boolean | undefined;
	/** 0..1 while loading; omit for an indeterminate pass. */
	progress?: number | undefined;
	/** Comparison sheet: hold the pressed / focused state. */
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

type ButtonProps = Common &
	Omit<HTMLMotionProps<"button">, keyof Common | "ref"> & {
		ref?: Ref<HTMLButtonElement>;
		/** Haptic pattern on press; false when the handler buzzes its own. */
		haptic?: number | readonly number[] | false | undefined;
	};

const cx = (...c: (string | false | null | undefined)[]) =>
	c.filter(Boolean).join(" ");

const press = {
	whileTap: { scale: 0.97 },
	transition: spring.press,
} as const;

/** Data attributes and style vars shared by the button and the link. */
function face(
	look: ButtonLook,
	p: Pick<
		Common,
		"size" | "inline" | "hero" | "loading" | "progress" | "pressed" | "focused"
	>,
) {
	const prog =
		p.progress === undefined ? undefined : Math.max(0, Math.min(1, p.progress));
	return {
		"data-look": look,
		"data-size": p.size ?? "lg",
		"data-inline": p.inline || undefined,
		"data-hero": p.hero || undefined,
		"data-busy": p.loading || undefined,
		"data-indeterminate": (p.loading && prog === undefined) || undefined,
		"data-pressed": p.pressed || undefined,
		"data-focused": p.focused || undefined,
		style: (prog === undefined ? {} : { "--p": prog }) as MotionStyle,
	};
}

/**
 * Turns the hero sheen on only while the button is on screen and the tab is visible,
 * by setting `data-sheen` straight on the element (no re-render).
 */
function useSheen(on: boolean) {
	const el = useRef<HTMLElement | null>(null);
	const reduce = useReducedMotion();
	useEffect(() => {
		const node = el.current;
		if (!on || reduce || !node) return;
		let seen = false;
		const sync = () => {
			if (seen && !document.hidden) node.setAttribute("data-sheen", "");
			else node.removeAttribute("data-sheen");
		};
		const io = new IntersectionObserver((es) => {
			seen = es.some((e) => e.isIntersecting);
			sync();
		});
		io.observe(node);
		document.addEventListener("visibilitychange", sync);
		return () => {
			io.disconnect();
			document.removeEventListener("visibilitychange", sync);
			node.removeAttribute("data-sheen");
		};
	}, [on, reduce]);
	return el;
}

function useMergedRef<T extends HTMLElement>(
	inner: RefObject<HTMLElement | null>,
	outer: Ref<T> | undefined,
) {
	return useCallback(
		(node: T | null) => {
			inner.current = node;
			if (typeof outer === "function") outer(node);
			else if (outer) (outer as RefObject<T | null>).current = node;
		},
		[inner, outer],
	);
}

export function PrimaryButton({
	children,
	look: forced,
	legacy,
	legacyLabel,
	className,
	size,
	inline,
	hero,
	burst,
	loading,
	progress,
	pressed,
	focused,
	haptic,
	onClick,
	ref,
	style,
	type = "button",
	...rest
}: ButtonProps) {
	const chosen = useButtonLook();
	const look = forced ?? chosen;
	const sheenRef = useSheen(!!hero && look !== "current");
	const setRef = useMergedRef<HTMLButtonElement>(sheenRef, ref);

	if (look === "current") {
		return (
			<motion.button
				ref={ref}
				type={type}
				className={cx(legacy, className)}
				onClick={onClick}
				{...(style ? { style } : null)}
				whileTap={{ scale: 0.96, y: 2 }}
				transition={spring.press}
				{...rest}
			>
				{legacyLabel ? (
					<span className={legacyLabel}>{children}</span>
				) : (
					children
				)}
			</motion.button>
		);
	}

	const f = face(look, {
		size,
		inline,
		hero,
		loading,
		progress,
		pressed,
		focused,
	});
	const click = (e: MouseEvent<HTMLButtonElement>) => {
		if (haptic !== false) buzz(haptic ?? HAPTIC.tap);
		if (burst) fx.burst("embers", e.currentTarget, { amount: 0.6 });
		onClick?.(e);
	};

	return (
		<motion.button
			ref={setRef}
			type={type}
			className={cx(s.btn, className)}
			aria-busy={loading || undefined}
			onClick={click}
			{...press}
			{...(pressed ? { animate: { scale: 0.97 } } : null)}
			{...f}
			{...rest}
			style={{ ...f.style, ...style } as MotionStyle}
		>
			<Decor look={look} />
			<span className={s.label}>{children}</span>
		</motion.button>
	);
}

const MotionLink = motion.create(Link);

type LinkProps = Common & {
	href: string;
	ref?: Ref<HTMLAnchorElement>;
};

/** The same face on a link (the landing's Play). */
export function PrimaryLink({
	children,
	look: forced,
	legacy,
	legacyLabel,
	className,
	href,
	ref,
	...p
}: LinkProps) {
	const chosen = useButtonLook();
	const look = forced ?? chosen;
	const sheenRef = useSheen(!!p.hero && look !== "current");
	const setRef = useMergedRef<HTMLAnchorElement>(sheenRef, ref);

	if (look === "current") {
		return (
			<Link ref={ref} href={href} className={cx(legacy, className)}>
				{legacyLabel ? (
					<span className={legacyLabel}>{children}</span>
				) : (
					children
				)}
			</Link>
		);
	}
	return (
		<MotionLink
			ref={setRef}
			href={href}
			className={cx(s.btn, className)}
			{...press}
			{...face(look, p)}
		>
			<Decor look={look} />
			<span className={s.label}>{children}</span>
		</MotionLink>
	);
}

// ---------------------------------------------------------------- the faces

/** Everything behind the label. Purely decorative. */
function Decor({ look }: { look: Exclude<ButtonLook, "current"> }) {
	// enamel and glass are cut polygons, so their light and focus ring follow the cut
	const cut = look === "enamel" || look === "glass";
	return (
		<>
			<span className={s.body} aria-hidden="true">
				{look === "enamel" ? <Enamel /> : null}
				{look === "glass" ? <Glass /> : null}
				{look === "arch" ? <Arch /> : null}
				{look === "wax" ? <Wax /> : null}
				<span className={cx(s.fill, cut && s.cut)} />
				<span className={cx(s.sheen, cut && s.cut)} />
			</span>
			<span className={cx(s.focus, cut && s.ring)} aria-hidden="true" />
		</>
	);
}

/** Bevelled gilt frame, soot keyline, oxblood enamel, an engraved inner line. */
function Enamel() {
	return (
		<>
			<span className={cx(s.cut, s.frame)} />
			<span className={cx(s.cut, s.key)} />
			<span className={cx(s.cut, s.face)} />
			<span className={cx(s.ring, s.line)} />
			<span className={cx(s.ring, s.lip)} />
		</>
	);
}

/** Lead frame; a border of small quarries; diamond end panes; one big backlit pane. */
function Glass() {
	return (
		<>
			<span className={cx(s.cut, s.frame)} />
			<span className={s.strip} data-edge="top" />
			<span className={s.strip} data-edge="bottom" />
			<span className={s.end} data-edge="start" />
			<span className={s.end} data-edge="end" />
			<span className={s.face} />
			<span className={s.glow} />
		</>
	);
}

/** Stone tablet, gilt trim and beading, an ogee crest carrying a red jewel. */
function Arch() {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	return (
		<>
			<span className={s.face} />
			<span className={s.bead} data-edge="top" />
			<span className={s.bead} data-edge="bottom" />
			<Fleuron side="start" />
			<Fleuron side="end" />
			<svg
				className={s.crest}
				viewBox="0 0 96 20"
				width="96"
				height="20"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#5a4632" />
						<stop offset="1" stopColor="#3a2c22" />
					</linearGradient>
					<radialGradient id={`${id}j`} cx="40%" cy="35%" r="70%">
						<stop offset="0" stopColor="#ffb3a0" />
						<stop offset=".3" stopColor="#e2343a" />
						<stop offset=".75" stopColor="#8e1218" />
						<stop offset="1" stopColor="#3a0709" />
					</radialGradient>
					<clipPath id={`${id}c`}>
						<path d={OGEE} />
					</clipPath>
				</defs>
				<path d={OGEE} fill={`url(#${id}s)`} />
				<path
					d={OGEE_LINE}
					transform="translate(0 4)"
					fill="none"
					stroke="#c9a24f"
					strokeWidth="1.1"
					clipPath={`url(#${id}c)`}
				/>
				<path d={OGEE_LINE} fill="none" stroke="#0b0807" strokeWidth="1.4" />
				<g className={s.jewel}>
					<circle cx="48" cy="12" r="5.2" fill="#9a7a35" />
					<circle cx="48" cy="12" r="4.2" fill={`url(#${id}j)`} />
					<circle cx="46.6" cy="10.6" r="1.1" fill="#fff" opacity=".7" />
				</g>
			</svg>
		</>
	);
}

/** Ogee crest in a 96 x 20 box: flat, a rising shoulder, pinched to a point at the top. */
const OGEE =
	"M0 20 L0 18 C14 18 22 17 29 13 C35 9.5 40 9 44 5.5 C46 3.6 47.4 1.8 48 0.4 C48.6 1.8 50 3.6 52 5.5 C56 9 61 9.5 67 13 C74 17 82 18 96 18 L96 20 Z";
const OGEE_LINE =
	"M0 18 C14 18 22 17 29 13 C35 9.5 40 9 44 5.5 C46 3.6 47.4 1.8 48 0.4 C48.6 1.8 50 3.6 52 5.5 C56 9 61 9.5 67 13 C74 17 82 18 96 18";

/** A small gilt quatrefoil in a lozenge at each end of the tablet. */
function Fleuron({ side }: { side: "start" | "end" }) {
	return (
		<svg
			className={s.fleuron}
			data-edge={side}
			viewBox="0 0 14 18"
			width="14"
			height="18"
			aria-hidden="true"
		>
			<path
				d="M7 1 L13 9 L7 17 L1 9 Z"
				fill="none"
				stroke="#9a7a35"
				strokeWidth="1"
			/>
			<g fill="none" stroke="#d9b66a" strokeWidth="1.1">
				<circle cx="7" cy="6.6" r="1.9" />
				<circle cx="7" cy="11.4" r="1.9" />
				<circle cx="4.6" cy="9" r="1.9" />
				<circle cx="9.4" cy="9" r="1.9" />
			</g>
			<circle cx="7" cy="9" r="0.9" fill="#e3c27c" />
		</svg>
	);
}

/** A bar of sealing wax (edge roughened once by a static displacement) and its seal. */
function Wax() {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	return (
		<>
			<svg className={s.defs} width="0" height="0" aria-hidden="true">
				<filter
					id={`${id}e`}
					x="-4%"
					y="-15%"
					width="108%"
					height="130%"
					colorInterpolationFilters="sRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.045 0.11"
						numOctaves="2"
						seed="11"
						result="n"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="n"
						scale="5"
						xChannelSelector="R"
						yChannelSelector="G"
					/>
				</filter>
			</svg>
			<span className={s.face} style={{ filter: `url(#${id}e)` }}>
				<span className={s.gloss} />
			</span>
			<Seal id={id} />
		</>
	);
}

/** The seal at the leading end: an irregular blob, a pressed ring, a rose in relief. */
function Seal({ id }: { id: string }) {
	return (
		<svg
			className={s.seal}
			viewBox="0 0 100 100"
			width="100"
			height="100"
			aria-hidden="true"
		>
			<defs>
				<radialGradient id={`${id}w`} cx="38%" cy="32%" r="72%">
					<stop offset="0" stopColor="#c02a30" />
					<stop offset=".4" stopColor="#8e1218" />
					<stop offset=".85" stopColor="#560a0f" />
					<stop offset="1" stopColor="#2e0507" />
				</radialGradient>
				<radialGradient id={`${id}p`} cx="50%" cy="50%" r="50%">
					<stop offset="0" stopColor="#6a0d12" />
					<stop offset=".8" stopColor="#7a0f14" />
					<stop offset="1" stopColor="#4a080c" />
				</radialGradient>
			</defs>
			<path d={SEAL_OUTER} fill={`url(#${id}w)`} />
			<path d={SEAL_OUTER} fill="none" stroke="#2a0406" strokeWidth="2" />
			<circle cx="50" cy="50" r="29" fill={`url(#${id}p)`} />
			<circle
				cx="50"
				cy="50"
				r="29"
				fill="none"
				stroke="#2a0406"
				strokeWidth="2.4"
			/>
			<circle
				cx="50.6"
				cy="51"
				r="29.6"
				fill="none"
				stroke="#e2575a"
				strokeOpacity=".45"
				strokeWidth="1"
			/>
			{/* the rose: six petals and a heart, struck in relief (lit edge up-left) */}
			<g className={s.rose}>
				<g transform="translate(.9 1)" stroke="#2a0406" opacity=".9">
					<Rose />
				</g>
				<g stroke="#e8686a">
					<Rose />
				</g>
			</g>
		</svg>
	);
}

function Rose() {
	return (
		<g fill="none" strokeWidth="2.2" strokeLinecap="round">
			{[0, 60, 120, 180, 240, 300].map((a) => (
				<ellipse
					key={a}
					cx="50"
					cy="39"
					rx="5.2"
					ry="9"
					transform={`rotate(${a} 50 50)`}
				/>
			))}
			<circle cx="50" cy="50" r="3.6" />
		</g>
	);
}

/** Deterministic irregular wax outline in a 100 x 100 box (as WaxSeal draws it). */
function blob(seed: number, r: number, wobble: number) {
	const pts: string[] = [];
	const n = 40;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const k =
			1 +
			wobble *
				(0.045 * Math.sin(5 * a + seed) +
					0.03 * Math.sin(9 * a + seed * 2.3) +
					0.018 * Math.sin(14 * a + seed * 0.7));
		pts.push(
			`${(50 + Math.cos(a) * r * k).toFixed(2)} ${(50 + Math.sin(a) * r * k).toFixed(2)}`,
		);
	}
	return `M${pts.join(" L")}Z`;
}
const SEAL_OUTER = blob(5, 45, 1.4);
