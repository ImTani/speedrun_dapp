import { legal } from "@/lexicon/legal.ts";
import link from "@/ui/controls/link.module.css";
import { BackLink } from "./BackLink.tsx";
import {
	CONTACT_EMAIL,
	EFFECTIVE_DATE,
	effectiveDateLabel,
	GAME_NAME,
	OPERATOR_NAME,
	showDraftBanner,
	warnUnfilledLegalFields,
} from "./config.ts";
import { LegalLinks } from "./LegalLinks.tsx";
import s from "./legal.module.css";
import type { LegalDoc } from "./types.ts";

/** One legal document: Back (to wherever the reader came from), title, effective date, short version, contents, sections. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
	warnUnfilledLegalFields();
	const draft = showDraftBanner();
	return (
		<main className={s.page}>
			<div className={s.column}>
				<BackLink />
				{draft ? (
					<p className={s.draft} role="note">
						{legal.page.draft}
					</p>
				) : null}

				<header className={s.header}>
					<h1 className={s.title}>{doc.title}</h1>
					<p className={s.meta}>
						{GAME_NAME} · {legal.page.effective}{" "}
						<time dateTime={EFFECTIVE_DATE}>{effectiveDateLabel()}</time>
					</p>
				</header>

				<section className={`${s.short} ${s.prose}`} aria-labelledby="short">
					<h2 id="short" className={s.shortTitle}>
						{legal.page.short}
					</h2>
					<ul>
						{doc.summary.map((line, i) => (
							// Static content: the order never changes.
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed list
							<li key={i}>{line}</li>
						))}
					</ul>
				</section>

				<nav className={s.toc} aria-labelledby="contents">
					<h2 id="contents" className={s.tocTitle}>
						{legal.page.contents}
					</h2>
					<ol className={s.tocList}>
						{doc.sections.map((sec, i) => (
							<li key={sec.id}>
								<a href={`#${sec.id}`} className={link.nav}>
									<span className={s.tocNum}>{i + 1}.</span>
									<span>{sec.title}</span>
								</a>
							</li>
						))}
					</ol>
				</nav>

				<article className={s.prose}>
					{doc.sections.map((sec, i) => (
						<section
							key={sec.id}
							id={sec.id}
							className={s.section}
							aria-labelledby={`${sec.id}-h`}
						>
							<h2 id={`${sec.id}-h`} className={s.sectionTitle}>
								<span className={s.sectionNum}>{i + 1}.</span>
								{sec.title}
							</h2>
							{sec.body}
						</section>
					))}
				</article>

				<footer className={s.footer}>
					<p>
						{legal.page.contact} {OPERATOR_NAME} ·{" "}
						<a href={`mailto:${CONTACT_EMAIL}`} className={link.inline}>
							{CONTACT_EMAIL}
						</a>
					</p>
					<LegalLinks align="left" />
				</footer>
			</div>
		</main>
	);
}
