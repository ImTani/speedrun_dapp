import type { Metadata } from "next";
import { LegalPage } from "@/legal/LegalPage.tsx";
import { terms } from "@/legal/terms.tsx";

export const metadata: Metadata = {
	title: `${terms.title} · Apostasy: Sede Vacante`,
	description: terms.description,
};

export default function TermsPage() {
	return <LegalPage doc={terms} />;
}
