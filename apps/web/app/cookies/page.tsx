import type { Metadata, Viewport } from "next";
import { READING_VIEWPORT } from "@/landing/site";
import { cookies } from "@/legal/cookies.tsx";
import { LegalPage } from "@/legal/LegalPage.tsx";

export const metadata: Metadata = {
	title: `${cookies.title} · Apostasy: Sede Vacante`,
	description: cookies.description,
};

/** A page of text: pinch-zoom allowed. */
export const viewport: Viewport = READING_VIEWPORT;

export default function CookiesPage() {
	return <LegalPage doc={cookies} />;
}
