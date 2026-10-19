import { createRemoteJWKSet, jwtVerify } from "jose";
import { type Address, getAddress } from "viem";
import { env, HttpError } from "./env.ts";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/** Verifies the Privy access token in `Authorization: Bearer` and returns the user DID. */
export async function requireUser(request: Request): Promise<string> {
	const appId = env("NEXT_PUBLIC_PRIVY_APP_ID");
	const header = request.headers.get("authorization") ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
	if (!token) throw new HttpError(401, "unauthorized");
	jwks ??= createRemoteJWKSet(
		new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
	);
	try {
		const { payload } = await jwtVerify(token, jwks, {
			issuer: "privy.io",
			audience: appId,
		});
		if (!payload.sub) throw new Error("no sub");
		return payload.sub;
	} catch {
		throw new HttpError(401, "unauthorized");
	}
}

const walletCache = new Map<string, Address>();

interface LinkedAccount {
	type?: string;
	address?: string;
	wallet_client_type?: string;
	connector_type?: string;
	chain_type?: string;
}

/** The user's Privy embedded EVM wallet address. */
export async function getEmbeddedWallet(did: string): Promise<Address> {
	const hit = walletCache.get(did);
	if (hit) return hit;
	const appId = env("NEXT_PUBLIC_PRIVY_APP_ID");
	const secret = env("PRIVY_APP_SECRET");
	const res = await fetch(
		`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`,
		{
			headers: {
				authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`,
				"privy-app-id": appId,
			},
			cache: "no-store",
		},
	);
	if (!res.ok) throw new HttpError(502, "identity_unavailable");
	const user = (await res.json()) as { linked_accounts?: LinkedAccount[] };
	const wallet = (user.linked_accounts ?? []).find(
		(a) =>
			a.type === "wallet" &&
			(a.chain_type === undefined || a.chain_type === "ethereum") &&
			(a.wallet_client_type === "privy" || a.connector_type === "embedded") &&
			typeof a.address === "string",
	);
	if (!wallet?.address) throw new HttpError(409, "no_embedded_wallet");
	const address = getAddress(wallet.address);
	walletCache.set(did, address);
	return address;
}
