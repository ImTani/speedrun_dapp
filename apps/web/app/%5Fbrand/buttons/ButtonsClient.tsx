"use client";

/**
 * The comparison sheet for the primary call to action (dev only, /_brand/buttons).
 *
 *  1. In context: one phone column per look (340 px buttons), with the title's Enter,
 *     the ritual's Bind, the Spire's Climb, the Reliquary's Scry, a Vestry Buy and the
 *     Vigil's Collect, each on a stand-in for its screen.
 *  2. States: rest, pressed (held), disabled, loading at 50%, keyboard focus.
 *  3. Narrowest phone: the longest labels at 288 px (a 320 px screen less its margins).
 *  4. The landing's Play at desktop size.
 *
 * "current" is the shipped look, drawn by each screen's own class (its pressed and
 * focus cells are approximations: those states cannot be held from outside).
 */
import type { MotionStyle } from "motion/react";
import l from "@/landing/landing.module.css";
import h from "@/screens/fragment/hud.module.css";
import r from "@/screens/reliquary/reliquary.module.css";
import sp from "@/screens/spire/spire.module.css";
import t from "@/screens/title/title.module.css";
import v from "@/screens/vestry/vestry.module.css";
import {
	BUTTON_LOOKS,
	BUTTON_STYLE,
	type ButtonLook,
	PrimaryButton,
	PrimaryLink,
} from "@/ui/button";
import s from "./buttons.module.css";

const NAME: Record<ButtonLook, string> = {
	current: "Current (shipped)",
	enamel: "1 · Enamel",
	glass: "2 · Glass",
	arch: "3 · Arch",
	wax: "4 · Wax",
};
const NOTE: Record<ButtonLook, string> = {
	current: "Red gradient slab, blackletter on Enter and Play.",
	enamel: "Oxblood enamel in a bevelled gilt frame; embossed gilt label.",
	glass: "Red panes in lead, a quarry border, backlit from below.",
	arch: "Umber stone under an ogee crest, gilt beading, a red jewel.",
	wax: "A bar of sealing wax, a rose seal at the leading end.",
};

const BLOOD = "btn btn-blood";
const CLIMB = `btn btn-blood ${sp.climbBtn}`;

export function ButtonsClient() {
	return (
		<main className={s.page}>
			<header className={s.head}>
				<h1 className={s.h1}>Primary buttons</h1>
				<p className={s.lede}>
					Four directions beside the shipped look. Switch the game with{" "}
					<code>BUTTON_STYLE</code> in <code>src/ui/button/config.ts</code> (now{" "}
					<b>{BUTTON_STYLE}</b>), or try one live with{" "}
					<code>?btn=enamel|glass|arch|wax</code> on any page.
				</p>
			</header>

			<section className={s.section} data-section="context">
				<h2 className={s.h2}>In context · phone</h2>
				<div className={s.phones}>
					{BUTTON_LOOKS.map((look) => (
						<Phone key={look} look={look} />
					))}
				</div>
			</section>

			<section className={s.section} data-section="states">
				<h2 className={s.h2}>States</h2>
				<div className={s.states}>
					<span />
					{["Rest", "Pressed", "Disabled", "Loading 50%", "Focus"].map((c) => (
						<span key={c} className={s.colHead}>
							{c}
						</span>
					))}
					{BUTTON_LOOKS.map((look) => (
						<States key={look} look={look} />
					))}
				</div>
			</section>

			<section className={s.section} data-section="narrow">
				<h2 className={s.h2}>Narrowest phone · 288 px</h2>
				<div className={s.narrowGrid}>
					{BUTTON_LOOKS.map((look) => (
						<div key={look} className={s.narrow}>
							<span className={s.tag}>{NAME[look]}</span>
							<PrimaryButton look={look} legacy={CLIMB}>
								Climb floor XIV again
							</PrimaryButton>
							<PrimaryButton look={look} legacy={CLIMB} disabled>
								No climbs left · +1 in 3h 20m
							</PrimaryButton>
						</div>
					))}
				</div>
			</section>

			<section className={s.section} data-section="landing">
				<h2 className={s.h2}>Landing · Play (desktop)</h2>
				<div className={s.landing}>
					{BUTTON_LOOKS.map((look) => (
						<div key={look} className={s.play}>
							<PrimaryLink
								look={look}
								href="#"
								legacy={l.play}
								className={l.playFit}
							>
								Play
							</PrimaryLink>
							<span className={s.tag}>{NAME[look]}</span>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}

function Phone({ look }: { look: ButtonLook }) {
	return (
		<article className={s.phone} data-look-col={look}>
			<header className={s.phoneHead}>
				<h3 className={s.h3}>{NAME[look]}</h3>
				<p className={s.note}>{NOTE[look]}</p>
			</header>

			<div className={s.scene} data-scene="title">
				<p className={s.kicker}>Title</p>
				<div className={t.ctaWrap}>
					<PrimaryButton
						look={look}
						hero
						legacy={t.cta}
						legacyLabel={t.ctaLabel}
						data-ready
					>
						Enter
					</PrimaryButton>
				</div>
				<p className={s.consent}>
					By entering you accept the Terms and the Privacy notice.
				</p>
			</div>

			<div className={s.scene} data-scene="bind">
				<p className={s.kicker}>Bind ritual</p>
				<p className={s.field}>Severine of the Ninth Pane</p>
				<PrimaryButton look={look} legacy={BLOOD} burst>
					Bind
				</PrimaryButton>
			</div>

			<div className={s.scene} data-scene="spire">
				<p className={s.kicker}>Spire</p>
				<p className={s.reward}>
					<span className={s.rewardTag}>First clear</span> +40 Ash · +2
					Resonance
				</p>
				<PrimaryButton look={look} legacy={CLIMB} hero burst>
					Climb floor III
				</PrimaryButton>
			</div>

			<div className={s.scene} data-scene="reliquary">
				<p className={s.kicker}>Reliquary</p>
				<div className={s.center}>
					<PrimaryButton look={look} legacy={r.cta} className={r.ctaFit} burst>
						Scry · 100 Ash
					</PrimaryButton>
					<p className={s.small}>A relic is certain within 7 more Scryings.</p>
				</div>
			</div>

			<div className={s.cards} data-scene="cards">
				<div className={s.card}>
					<p className={s.kicker}>Vestry</p>
					<p className={s.cardName}>The Lantern Vestments</p>
					<PrimaryButton
						look={look}
						legacy={v.buy}
						className={v.buyFit}
						size="md"
					>
						Buy · 300 Ash
					</PrimaryButton>
				</div>
				<div className={s.card}>
					<p className={s.kicker}>Vigil</p>
					<p className={s.cardName}>+36 Ash waiting</p>
					<PrimaryButton look={look} legacy={h.claim} size="md">
						Collect
					</PrimaryButton>
				</div>
			</div>
		</article>
	);
}

/** "current" cannot hold :active or :focus-visible from outside; approximate them. */
const CURRENT_PRESSED: MotionStyle = {
	transform: "translateY(2px) scale(0.96)",
};
const CURRENT_FOCUS: MotionStyle = {
	outline: "2px solid var(--c-gilt)",
	outlineOffset: "-6px",
};

function States({ look }: { look: ButtonLook }) {
	const cur = look === "current";
	return (
		<>
			<span className={s.rowHead}>{NAME[look]}</span>
			<div className={s.cell}>
				<PrimaryButton look={look} legacy={BLOOD}>
					Bind
				</PrimaryButton>
			</div>
			<div className={s.cell}>
				<PrimaryButton
					look={look}
					legacy={BLOOD}
					pressed
					{...(cur ? { style: CURRENT_PRESSED } : null)}
				>
					Bind
				</PrimaryButton>
			</div>
			<div className={s.cell}>
				<PrimaryButton look={look} legacy={BLOOD} disabled>
					Bind
				</PrimaryButton>
			</div>
			<div className={s.cell}>
				<PrimaryButton
					look={look}
					legacy={BLOOD}
					disabled
					loading
					progress={0.5}
				>
					Binding…
				</PrimaryButton>
			</div>
			<div className={s.cell}>
				<PrimaryButton
					look={look}
					legacy={BLOOD}
					focused
					{...(cur ? { style: CURRENT_FOCUS } : null)}
				>
					Bind
				</PrimaryButton>
			</div>
		</>
	);
}
