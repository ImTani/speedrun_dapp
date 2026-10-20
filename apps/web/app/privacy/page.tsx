import type { Metadata } from "next";
import { LegalPage } from "@/legal/LegalPage.tsx";
import { privacy } from "@/legal/privacy.tsx";

export const metadata: Metadata = {
	title: `${privacy.title} · Apostasy: Sede Vacante`,
	description: privacy.description,
};

export default function PrivacyPage() {
	return <LegalPage doc={privacy} />;
}
