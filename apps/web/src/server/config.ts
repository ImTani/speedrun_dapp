import { decodeConfig } from "@arena/strategies";
import { HttpError } from "./env.ts";

/** Parses a packed config (decimal string), rejecting anything decodeConfig refuses. */
export function parseConfig(raw: unknown): bigint {
	if (typeof raw !== "string" || !/^\d{1,20}$/.test(raw))
		throw new HttpError(400, "invalid_config");
	const config = BigInt(raw);
	if (config >= 1n << 64n) throw new HttpError(400, "invalid_config");
	try {
		decodeConfig(config);
	} catch {
		throw new HttpError(400, "invalid_config");
	}
	return config;
}
