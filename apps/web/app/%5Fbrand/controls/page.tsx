import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ControlsClient } from "./ControlsClient";

// Dev-only: every kind of button and control in the game on one sheet, drawn by the real
// components and classes, grouped by type, with the wax primary on top for reference.
// URL: /_brand/controls. The written inventory: src/ui/CONTROLS.md.

export const metadata: Metadata = {
	title: "Controls",
	robots: { index: false, follow: false },
};

export default function ControlsPage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <ControlsClient />;
}
