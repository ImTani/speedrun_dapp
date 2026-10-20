/**
 * The public landing page at "/": what this is, in ten seconds, and the way to Play.
 * Server-rendered; the client islands are the lit nave (the only WebGL on the page, the
 * shared lens pauses it off screen), the masks and glass, the live numbers, the storage notice.
 */
import { deploymentFor } from "@arena/chain";
import { CookieNotice, LegalLinks } from "@/legal";
import { landing as L } from "@/lexicon/landing";
import { TitleScene } from "@/screens/title/TitleScene";
import t from "@/screens/title/title.module.css";
import { PrimaryLink } from "@/ui/button";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { Wordmark } from "@/ui/wordmark";
import { LegacyTab } from "./LegacyTab";
import s from "./landing.module.css";
import { QrCode } from "./QrCode";
import { Stats } from "./Stats";
import {
	ATTRIBUTION_URL,
	fujiExplorer,
	GITHUB_URL,
	PLAY_URL,
	PLAY_URL_SHORT,
} from "./site";

const ARENA = deploymentFor(43113).arena;
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Landing() {
	return (
		<div className={s.page}>
			<main className={s.main}>
				<Hero />
				<HowItPlays />
				<OnChain />
				<Screens />
				<BuiltWith />
				<section className={s.close} aria-label={L.hero.play}>
					<p className={s.closeLine}>{L.close.line}</p>
					<PrimaryLink href="/play" legacy={s.play} className={s.playFit}>
						{L.hero.play}
					</PrimaryLink>
				</section>
			</main>
			<Footer />
			<CookieNotice aboveTabBar={false} />
			<LegacyTab />
		</div>
	);
}

function Hero() {
	return (
		<header className={s.hero}>
			<div className={s.heroArt} aria-hidden="true">
				<div className={t.quake}>
					<TitleScene />
				</div>
			</div>
			<div className={s.heroText}>
				<h1 className={s.wordmark}>
					<Wordmark />
				</h1>
				<p className={s.line}>{L.hero.line}</p>
				<div className={s.ctaRow}>
					<PrimaryLink href="/play" hero legacy={s.play} className={s.playFit}>
						{L.hero.play}
					</PrimaryLink>
					<p className={s.note}>{L.hero.note}</p>
				</div>
				<div className={s.qr}>
					<QrCode value={PLAY_URL} size={132} className={s.qrCode} />
					<p className={s.qrText}>
						{L.hero.qr}
						<a href={PLAY_URL} className={s.qrUrl}>
							{PLAY_URL_SHORT}
						</a>
					</p>
				</div>
			</div>
		</header>
	);
}

function HowItPlays() {
	const [one, two, three] = L.how.steps;
	return (
		<section className={s.section} aria-labelledby="how-h">
			<h2 id="how-h" className={s.h2}>
				{L.how.head}
			</h2>
			<ol className={s.steps}>
				<li className={s.step}>
					<div className={s.vis} role="img" aria-label={L.how.maskAlt}>
						<div className={s.visMasks}>
							<Mask aspect={0} size={64} />
							<Mask aspect={2} size={104} glow />
							<Mask aspect={5} size={64} />
						</div>
					</div>
					<StepText n="I" title={one.title} line={one.line} />
				</li>
				<li className={s.step}>
					<div className={s.vis} role="img" aria-label={L.how.duelAlt}>
						<div className={s.visDuel}>
							<GlassWindow aspect={5} width={88} shader={false} />
							<span className={s.vs} aria-hidden="true">
								vs
							</span>
							<GlassWindow aspect={2} width={88} shader={false} />
						</div>
					</div>
					<StepText n="II" title={two.title} line={two.line} />
				</li>
				<li className={s.step}>
					<div className={`${s.vis} ${s.visShot}`}>
						{/* biome-ignore lint/performance/noImgElement: pre-sized WebP, nothing to optimise */}
						<img
							src="/landing/collect.webp"
							alt={L.how.collectAlt}
							width={390}
							height={844}
							loading="lazy"
							decoding="async"
						/>
					</div>
					<StepText n="III" title={three.title} line={three.line} />
				</li>
			</ol>
		</section>
	);
}

function StepText({
	n,
	title,
	line,
}: {
	n: string;
	title: string;
	line: string;
}) {
	return (
		<div className={s.stepText}>
			<span className={s.stepNum} aria-hidden="true">
				{n}
			</span>
			<h3 className={s.h3}>{title}</h3>
			<p className={s.body}>{line}</p>
		</div>
	);
}

function OnChain() {
	return (
		<section className={s.section} aria-labelledby="chain-h">
			<h2 id="chain-h" className={s.h2}>
				{L.chain.head}
			</h2>
			<p className={s.lead}>{L.chain.lead}</p>
			<Stats />
			<ul className={s.facts}>
				{L.chain.facts.map((f) => (
					<li key={f}>{f}</li>
				))}
			</ul>
			<a
				className={s.explorer}
				href={fujiExplorer(ARENA)}
				target="_blank"
				rel="noopener noreferrer"
			>
				{L.chain.explorer}
				<span className={s.addr}>{shortAddr(ARENA)}</span>
				<span aria-hidden="true">↗</span>
			</a>
		</section>
	);
}

function Screens() {
	return (
		<section className={s.section} aria-labelledby="screens-h">
			<h2 id="screens-h" className={s.h2}>
				{L.screens.head}
			</h2>
			{/* A scrollable region on phones: focusable so the keyboard can scroll it too. */}
			{/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard access */}
			<ul className={s.shots} tabIndex={0} aria-label={L.screens.head}>
				{L.screens.items.map((it) => (
					<li key={it.src} className={s.shot}>
						<figure>
							<div className={s.phone}>
								{/* biome-ignore lint/performance/noImgElement: pre-sized WebP, nothing to optimise */}
								<img
									src={it.src}
									alt={it.alt}
									width={390}
									height={844}
									loading="lazy"
									decoding="async"
								/>
							</div>
							<figcaption className={s.caption}>{it.caption}</figcaption>
						</figure>
					</li>
				))}
			</ul>
			<p className={s.swipe} aria-hidden="true">
				{L.screens.hint}
			</p>
		</section>
	);
}

function BuiltWith() {
	return (
		<section className={s.section} aria-labelledby="built-h">
			<h2 id="built-h" className={s.h2}>
				{L.built.head}
			</h2>
			<ul className={s.chips}>
				{L.built.chips.map((c) => (
					<li key={c} className={s.chip}>
						{c}
					</li>
				))}
			</ul>
		</section>
	);
}

function Footer() {
	return (
		<footer className={s.footer}>
			<nav className={s.footNav} aria-label="Project">
				<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
					{L.footer.github}
				</a>
				<a href={ATTRIBUTION_URL}>{L.footer.credits}</a>
			</nav>
			<LegalLinks />
			<p className={s.copy}>{L.footer.copyright}</p>
		</footer>
	);
}
