import type { Metadata } from "next";
import { cookies } from "@/legal/cookies.tsx";
import { LegalPage } from "@/legal/LegalPage.tsx";

export const metadata: Metadata = {
	title: `${cookies.title} · Apostasy: Sede Vacante`,
	description: cookies.description,
};

export default function CookiesPage() {
	return <LegalPage doc={cookies} />;
}
