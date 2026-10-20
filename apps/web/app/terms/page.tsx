import type { Metadata, Viewport } from "next";
import { READING_VIEWPORT } from "@/landing/site";
import { LegalPage } from "@/legal/LegalPage.tsx";
import { terms } from "@/legal/terms.tsx";

export const metadata: Metadata = {
	title: `${terms.title} · Apostasy: Sede Vacante`,
	description: terms.description,
};

/** A page of text: pinch-zoom allowed. */
export const viewport: Viewport = READING_VIEWPORT;

export default function TermsPage() {
	return <LegalPage doc={terms} />;
}
