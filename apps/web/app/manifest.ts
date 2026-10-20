import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Apostasy: Sede Vacante",
		short_name: "Apostasy",
		description:
			"Bind a Fragment of a devoured god and send it to the Gatherings.",
		// The installed app opens straight into the game; "/" is the public landing page. The id
		// stays "/" so apps installed before the move keep their identity and pick up the new start.
		id: "/",
		start_url: "/play",
		scope: "/play",
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
