import { neon } from "@neondatabase/serverless";
import "./config.ts"; // loads the root .env

const url = process.env.DATABASE_URL;
if (!url) {
	console.error(
		"DATABASE_URL is not set (root .env); the service needs Neon Postgres.",
	);
	process.exit(1);
}

export const sql = neon(url);
export const CHAIN_ID = 43113;
