/** Server env. Missing values throw ConfigError, which routes map to 503. */
export class ConfigError extends Error {
	constructor(readonly key: string) {
		super(`missing_${key.toLowerCase()}`);
	}
}

/** An error with an HTTP status and a lexicon-free code, returned as {error: code}. */
export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
	) {
		super(code);
	}
}

export type EnvKey =
	| "SMOOTHSEND_SK_FUJI"
	| "NEXT_PUBLIC_PRIVY_APP_ID"
	| "PRIVY_APP_SECRET"
	| "DATABASE_URL";

export function env(key: EnvKey): string {
	const v = process.env[key];
	if (!v) throw new ConfigError(key);
	return v;
}

export function rpcUrl(): string {
	return (
		process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
	);
}
