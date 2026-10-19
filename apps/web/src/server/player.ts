import type { Address } from "viem";
import { getEmbeddedWallet } from "./auth.ts";
import { accountFor, CHAIN_ID } from "./chain.ts";
import { db } from "./db.ts";

export interface Player {
	did: string;
	eoa: Address;
	account: Address;
}

export interface FragmentRow {
	id: number;
	status: "requested" | "registered" | "confirmed" | "failed";
	agent: string | null;
	config: string;
	name: string;
	error: string | null;
}

/** Loads the player row, creating it on first sight (embedded wallet -> SimpleAccount). */
export async function ensurePlayer(did: string): Promise<Player> {
	const sql = db();
	const rows =
		(await sql`select eoa, account from players where privy_id = ${did}`) as {
			eoa: Address;
			account: Address;
		}[];
	const row = rows[0];
	if (row) return { did, eoa: row.eoa, account: row.account };
	const eoa = await getEmbeddedWallet(did);
	const account = await accountFor(eoa);
	await sql`insert into players (privy_id, eoa, account) values (${did}, ${eoa}, ${account})
		on conflict (privy_id) do nothing`;
	return { did, eoa, account };
}

export async function fragmentOf(account: string): Promise<FragmentRow | null> {
	const rows =
		(await db()`select id, status, agent, config::text as config, name, error
		from fragments where chain_id = ${CHAIN_ID} and lower(owner_account) = lower(${account})
		limit 1`) as (Omit<FragmentRow, "id"> & { id: number | string })[];
	const r = rows[0];
	return r ? { ...r, id: Number(r.id) } : null;
}
