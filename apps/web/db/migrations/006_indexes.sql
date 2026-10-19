-- Hot-path indexes and the settlement watermark. Performance only: every query still works
-- before this lands (settlement falls back to a full scan without economy_settled). Idempotent.

-- The Gathering feed (/api/gathering): the latest events of one Gathering, newest first, no sort.
create index if not exists arena_events_feed
	on arena_events (chain_id, gathering, block desc, log_index desc);

-- New PairScored since a block (settlement); also in db/schema.sql, repeated so this file stands alone.
create index if not exists arena_events_name on arena_events (chain_id, name, block);

-- Fragments are matched case-insensitively: by agent (feed names, standings) and by owner account
-- (settlement, Marks, the player's own Fragment).
create index if not exists fragments_agent_lower on fragments (chain_id, lower(agent));
create index if not exists fragments_owner_lower on fragments (chain_id, lower(owner_account));

-- Duels credited per player (the state read counts them on every poll).
create index if not exists economy_ledger_kind on economy_ledger (privy_id, kind);

-- Settlement watermark, per player and chain: every PairScored at or below `block` is already in
-- economy_ledger, so settleGatherings (src/server/economy.ts) scans only newer blocks. It only ever
-- advances to indexer_state.last_block, below which the runner has finished writing events.
create table if not exists economy_settled (
	privy_id text not null,
	chain_id integer not null,
	block bigint not null,
	updated_at timestamptz not null default now(),
	primary key (privy_id, chain_id)
);
