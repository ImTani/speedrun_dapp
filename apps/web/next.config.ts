import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname, "../..");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config: NextConfig = {
	typescript: { ignoreBuildErrors: true },
	serverExternalPackages: ["@smoothsend/sdk"],
	transpilePackages: ["@arena/chain", "@arena/strategies"],
	turbopack: { root },
	poweredByHeader: false,
	// Vercel preview deployments are the staging site: they keep the review tools (src/devTools.ts).
	env: { NEXT_PUBLIC_STAGING: process.env.VERCEL_ENV === "preview" ? "1" : "" },
	async headers() {
		return [
			{
				// The service worker is always fetched fresh, so a new one lands on the next visit.
				source: "/sw.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{ key: "Service-Worker-Allowed", value: "/" },
				],
			},
		];
	},
};

export default config;
