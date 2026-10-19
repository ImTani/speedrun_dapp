import { type NeonQueryFunction, neon } from "@neondatabase/serverless";
import { env } from "./env.ts";

let sql: NeonQueryFunction<false, false> | undefined;

/** Lazy Neon client; throws ConfigError when DATABASE_URL is unset. */
export function db(): NeonQueryFunction<false, false> {
	sql ??= neon(env("DATABASE_URL"));
	return sql;
}
