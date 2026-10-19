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
};

export default config;
