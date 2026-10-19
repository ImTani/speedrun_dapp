import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Apostasy: Sede Vacante",
		short_name: "Apostasy",
		description:
			"Bind a Fragment of a devoured god and send it to the Gatherings.",
		start_url: "/",
		display: "standalone",
		orientation: "portrait",
		background_color: "#050403",
		theme_color: "#0b0807",
		icons: [
			{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
			{
				src: "/icon-maskable.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "maskable",
			},
		],
	};
}
