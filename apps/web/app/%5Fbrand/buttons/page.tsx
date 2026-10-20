import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonsClient } from "./ButtonsClient";

// Dev-only: the four primary-button directions (enamel, glass, arch, wax) beside the shipped
// look, in context on a phone column, through every state, and as the landing's Play.
// URL: /_brand/buttons. Pick one with BUTTON_STYLE in src/ui/button/config.ts.

export const metadata: Metadata = {
	title: "Primary buttons",
	robots: { index: false, follow: false },
};

export default function ButtonsPage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <ButtonsClient />;
}
