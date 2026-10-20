import { db } from "./db.ts";

/**
 * Every off-chain table holding a player's data, checked against db/schema.sql and
 * db/migrations/001-006. Add a table here whenever a migration adds player data.
 *
 * Keyed by privy_id: profiles, economy_ledger, economy_settled, onboarding, spire_progress,
 * spire_runs, inventory_items, inventory_equipped, scry_log, marks, push_subscriptions,
 * vestry_purchases, players.
 * Keyed by the player's account: fragments (owner_account = players.account, every chain;
 * house Fragments are never touched).
 *
 * Deliberately kept: arena_events (a copy of public on-chain logs, keyed by agent address, not by
 * person), indexer_state and push_announced (no personal data).
 *
 * Not reached from here: the runner's own key file for the Fragment (apps/runner, .secrets), the
 * runner's in-memory roster, and Privy's copy of the sign-in account.
 */

/**
 * Deletes all of the player's off-chain data in one transaction. Idempotent: deleting an account
 * that has no rows succeeds. Does not touch on-chain records or the player's Privy account.
 */
export async function deletePlayerData(did: string): Promise<void> {
	const sql = db();
	// Order matters: fragments are found through players.account, so they go before players.
	await sql.transaction([
		sql`delete from fragments where house = false
			and lower(owner_account) in (select lower(account) from players where privy_id = ${did})`,
		sql`delete from profiles where privy_id = ${did}`,
		sql`delete from economy_ledger where privy_id = ${did}`,
		sql`delete from economy_settled where privy_id = ${did}`,
		sql`delete from onboarding where privy_id = ${did}`,
		sql`delete from spire_progress where privy_id = ${did}`,
		sql`delete from spire_runs where privy_id = ${did}`,
		sql`delete from inventory_items where privy_id = ${did}`,
		sql`delete from inventory_equipped where privy_id = ${did}`,
		sql`delete from scry_log where privy_id = ${did}`,
		sql`delete from marks where privy_id = ${did}`,
		sql`delete from push_subscriptions where privy_id = ${did}`,
		sql`delete from vestry_purchases where privy_id = ${did}`,
		sql`delete from players where privy_id = ${did}`,
	]);
}
