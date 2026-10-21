import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
	HERO_NAMES,
	HERO_VARIANT,
	HERO_VARIANTS,
	type HeroVariant,
	isHeroVariant,
} from "@/landing/heroConfig";
import c from "./hero.module.css";

// Dev-only: the landing hero directions side by side, each as the real page in a frame at
// desktop (1440 x 900) and phone (390 x 844) size. URL: /_brand/hero (?only=a to show one).
// Pick one with HERO_VARIANT in src/landing/heroConfig.ts.

export const metadata: Metadata = {
	title: "Hero directions",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

const SIZES = [
	{ key: "desktop", w: 1440, h: 900, scale: 0.5 },
	{ key: "phone", w: 390, h: 844, scale: 0.533 },
] as const;

const NOTES: Record<HeroVariant, string> = {
	current: "As shipped: the title screen's lit nave beside the words.",
	a: "A wide nave, three tall lit windows, light and dust; the name struck large in the middle. Slow parallax on pointer and scroll.",
	b: "Two masked Fragments face off. The bell tolls, both choose in secret, the verdict slams with the Light it moved. Three tolls on a loop, about 6 s each.",
	c: "A huge rose window turns behind the name, the seven masks riding in its panes; each one's temper is written as it passes the top.",
};

export default async function HeroSheet({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (process.env.NODE_ENV === "production") notFound();
	const q = await searchParams;
	const only = [q.only].flat()[0];
	const list = isHeroVariant(only)
		? [only]
		: ([
				...HERO_VARIANTS.filter((v) => v !== "current"),
				"current",
			] as HeroVariant[]);
	return (
		<main className={c.sheet}>
			<header className={c.head}>
				<h1>Landing hero · three directions</h1>
				<p>
					Each frame is the live page (<code>/?hero=…</code>). Shipped now:{" "}
					<code>{HERO_VARIANT}</code>. Pick one with <code>HERO_VARIANT</code>{" "}
					in <code>src/landing/heroConfig.ts</code>. Show one:{" "}
					{HERO_VARIANTS.map((v) => (
						<Link key={v} href={`?only=${v}`} className={c.pill}>
							{v}
						</Link>
					))}{" "}
					<Link href="?" className={c.pill}>
						all
					</Link>
				</p>
			</header>
			{list.map((v) => (
				<section key={v} className={c.row} aria-labelledby={`h-${v}`}>
					<div className={c.rowHead}>
						<h2 id={`h-${v}`}>{HERO_NAMES[v]}</h2>
						<p>{NOTES[v]}</p>
						<a href={`/?hero=${v}`} target="_blank" rel="noreferrer">
							Open full size
						</a>
					</div>
					<div className={c.frames}>
						{SIZES.map((s) => (
							<figure key={s.key} className={c.frame}>
								<div
									className={c.clip}
									style={{ width: s.w * s.scale, height: s.h * s.scale }}
								>
									<iframe
										title={`${HERO_NAMES[v]}, ${s.key}`}
										src={`/?hero=${v}`}
										width={s.w}
										height={s.h}
										loading="lazy"
										style={{ transform: `scale(${s.scale})` }}
									/>
								</div>
								<figcaption>
									{s.key} · {s.w} × {s.h}
								</figcaption>
							</figure>
						))}
					</div>
				</section>
			))}
		</main>
	);
}
