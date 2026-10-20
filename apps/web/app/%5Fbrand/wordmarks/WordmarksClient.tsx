"use client";

/**
 * The comparison sheet for the B family (illuminated: gold leaf, umber keyline, ember glow; they
 * differ only in the capital A): each on the 840 x 300 cover and on a 390 x 420 crop of the title
 * screen (the lit floor under the window, where the name strikes), plus the mark at 28 px and
 * 300 px tall. One set of wordmark defs for the whole page.
 *
 * Still by default (the glass as its finished SVG art, the nave as its ink drawing) so eight
 * compositions do not light eight shaders; ?live=1 runs the real glass and title scene.
 */
import { shell } from "@/lexicon/shell";
import { TitleScene } from "@/screens/title/TitleScene";
import t from "@/screens/title/title.module.css";
import {
	ILLUMINATED,
	WORDMARK_LETTER,
	WORDMARK_TITLE,
	WORDMARK_VARIANT,
	Wordmark,
	WordmarkDefs,
	type WordmarkVariant,
	wordmarkEm,
} from "@/ui/wordmark";
import { Cover, NaveBackdrop } from "../BrandClient";
import c from "./wordmarks.module.css";

const COVER = { w: 840, h: 300 };
const CROP = { w: 390, h: 420 };
/** The crop is the title's lower half: stage y 424-844 of the 390 x 844 composition. */
const CROP_TOP = 844 - CROP.h;

export function WordmarksClient({ live }: { live: boolean }) {
	return (
		<main className={c.sheet}>
			<style>{"nextjs-portal{display:none!important}"}</style>
			<WordmarkDefs />
			<header className={c.head}>
				<h1>Wordmarks · B</h1>
				<p>
					Three capitals for the illuminated lettering, everything else the
					same. Set the one in <code>src/ui/wordmark/config.ts</code> (
					<code>WORDMARK_VARIANT</code>, now <code>{WORDMARK_VARIANT}</code>),
					or try one in place with <code>?wordmark=b1</code>, <code>b2</code> or{" "}
					<code>b3</code> on <a href="/">/</a>, <a href="/play">/play</a> and{" "}
					<a href="/_brand?a=cover">/_brand</a>.{" "}
					{live ? (
						<a href="?">Still glass</a>
					) : (
						<a href="?live=1">Light the glass (live shaders)</a>
					)}
				</p>
			</header>
			{ILLUMINATED.map((v) => (
				<section key={v} className={c.row} aria-label={WORDMARK_TITLE[v]}>
					<h2 className={c.label}>
						<span className={c.letter}>{WORDMARK_LETTER[v]}</span>
						<span>{WORDMARK_TITLE[v]}</span>
						<a href={`/play?wordmark=${v}`}>/play</a>
						<a href={`/?wordmark=${v}`}>/</a>
						<a href={`/_brand?a=cover&wordmark=${v}`}>cover</a>
						<a href={`/_brand?a=key&wordmark=${v}`}>key art</a>
					</h2>
					<div className={c.pair}>
						<figure className={c.fig}>
							<div
								className={c.frame}
								style={{ width: COVER.w, height: COVER.h }}
							>
								<Cover
									w={COVER.w}
									h={COVER.h}
									q={{}}
									variant={v}
									shader={live}
									defs={false}
								/>
							</div>
							<figcaption>{WORDMARK_LETTER[v]} · cover 840 × 300</figcaption>
						</figure>
						<figure className={c.fig}>
							<TitleCrop variant={v} live={live} />
							<figcaption>{WORDMARK_LETTER[v]} · title 390 × 420</figcaption>
						</figure>
					</div>
					<Sizes variant={v} />
				</section>
			))}
		</main>
	);
}

/** The lower half of the phone title: the floor, the ink pool, the name and the way in. */
function TitleCrop({
	variant,
	live,
}: {
	variant: WordmarkVariant;
	live: boolean;
}) {
	return (
		<div className={c.frame} style={{ width: CROP.w, height: CROP.h }}>
			{live ? (
				<div className={c.stage} style={{ top: -CROP_TOP }}>
					<TitleScene />
				</div>
			) : (
				<NaveBackdrop
					w={CROP.w}
					h={CROP.h}
					scale={1}
					cx={0.5}
					cy={(232 - CROP_TOP) / CROP.h}
				/>
			)}
			<div className={c.pool} />
			<div className={c.front}>
				{/* 21vw of a 390 px phone (the title clamps the name em to it) */}
				<div className={t.mark} style={{ fontSize: 82 }}>
					<span className={t.name}>
						<Wordmark variant={variant} part="name" defs={false} />
					</span>
					<span className={t.sub}>
						<Wordmark variant={variant} part="sub" defs={false} />
					</span>
				</div>
				<div className={t.ctaWrap}>
					<div className={t.cta} data-ready="">
						<span className={t.ctaLabel}>{shell.title.enter}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Small and large: 28 px tall (one line and stacked) and 300 px tall. */
function Sizes({ variant }: { variant: WordmarkVariant }) {
	const row = wordmarkEm(variant, "horizontal");
	const stack = wordmarkEm(variant, "stacked");
	return (
		<div className={c.sizes}>
			<figure className={c.fig}>
				<Wordmark
					variant={variant}
					layout="horizontal"
					size={28 / row.h}
					defs={false}
				/>
				<figcaption>
					{WORDMARK_LETTER[variant]} · one line, 28 px tall
				</figcaption>
			</figure>
			<figure className={c.fig}>
				<Wordmark variant={variant} size={28 / stack.h} defs={false} />
				<figcaption>
					{WORDMARK_LETTER[variant]} · stacked, 28 px tall
				</figcaption>
			</figure>
			<figure className={c.fig}>
				<Wordmark variant={variant} size={300 / stack.h} defs={false} />
				<figcaption>
					{WORDMARK_LETTER[variant]} · stacked, 300 px tall
				</figcaption>
			</figure>
		</div>
	);
}
