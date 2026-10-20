import type { ReactNode } from "react";

export type LegalSlug = "terms" | "privacy" | "cookies";

export interface LegalSection {
	/** Anchor id, stable across edits (other pages link to these). */
	id: string;
	title: string;
	body: ReactNode;
}

export interface LegalDoc {
	slug: LegalSlug;
	title: string;
	/** Meta description for the page. */
	description: string;
	/** "The short version": a few plain lines above the contents. */
	summary: ReactNode[];
	sections: LegalSection[];
}
