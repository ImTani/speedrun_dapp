import Link from "next/link";
import { Fragment } from "react";
import { legal } from "@/lexicon/legal.ts";
import s from "./legal.module.css";

const ITEMS = [
	{ href: "/terms", label: legal.links.terms },
	{ href: "/privacy", label: legal.links.privacy },
	{ href: "/cookies", label: legal.links.cookies },
] as const;

export interface LegalLinksProps {
	/** Left-aligned instead of centred (e.g. inside a colophon list). */
	align?: "center" | "left";
	className?: string;
}

/** Terms · Privacy · Cookies. Works in server and client components; each link is a 44px target. */
export function LegalLinks({ align = "center", className }: LegalLinksProps) {
	const cls = [s.links, align === "left" ? s.linksLeft : "", className ?? ""]
		.filter(Boolean)
		.join(" ");
	return (
		<nav aria-label={legal.links.label} className={cls}>
			{ITEMS.map((item, i) => (
				<Fragment key={item.href}>
					{i > 0 ? <span aria-hidden="true">·</span> : null}
					<Link href={item.href}>{item.label}</Link>
				</Fragment>
			))}
		</nav>
	);
}
