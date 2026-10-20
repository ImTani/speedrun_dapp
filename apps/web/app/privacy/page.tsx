import type { Metadata, Viewport } from "next";
import { READING_VIEWPORT } from "@/landing/site";
import { LegalPage } from "@/legal/LegalPage.tsx";
import { privacy } from "@/legal/privacy.tsx";

export const metadata: Metadata = {
	title: `${privacy.title} · Apostasy: Sede Vacante`,
	description: privacy.description,
};

/** A page of text: pinch-zoom allowed. */
export const viewport: Viewport = READING_VIEWPORT;

export default function PrivacyPage() {
	return <LegalPage doc={privacy} />;
}
