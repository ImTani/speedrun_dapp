import { renderOg } from "@/landing/og";

// The share card for every page (generated once at build).
export const alt = "Apostasy: Sede Vacante, an idle auto-battler on Avalanche";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
	return renderOg();
}
