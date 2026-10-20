// Small building blocks for the document content (terms.tsx, privacy.tsx, cookies.tsx).
import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "./config.ts";

/** A link to another site. Opens beside the game so the player does not lose their place. */
export function Ext({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	);
}

/** A mailto link; defaults to the operator's contact address. */
export function Mail({ to = CONTACT_EMAIL }: { to?: string }) {
	return <a href={`mailto:${to}`}>{to}</a>;
}

/** A link to another legal page, optionally to one section. */
export function Doc({
	to,
	section,
	children,
}: {
	to: "/terms" | "/privacy" | "/cookies";
	section?: string;
	children: ReactNode;
}) {
	return <Link href={section ? `${to}#${section}` : to}>{children}</Link>;
}
