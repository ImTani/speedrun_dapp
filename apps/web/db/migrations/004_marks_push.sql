-- Marks (soulbound badges on Badges.sol) and web push subscriptions. Idempotent.

-- One row per Mark a player has earned. The web app queues it (src/server/marks.ts); the runner
-- mints queued rows with Badges.mintBatch and stores the transaction (apps/runner/src/marks.ts).
-- Token id on-chain = kind << 8 | tier.
create table if not exists marks (
	id bigserial primary key,
	chain_id integer not null default 43113,
	privy_id text not null,
	kind integer not null,
	tier smallint not null,
	status text not null default 'queued' check (status in ('queued', 'minted')),
	tx text,
	attempts integer not null default 0,
	error text,
	queued_at timestamptz not null default now(),
	minted_at timestamptz,
	unique (chain_id, privy_id, kind, tier)
);
create index if not exists marks_queued on marks (chain_id, status, queued_at);
-- Stigmata (kind >= 100) are 1-of-1: only one player can ever hold each.
create unique index if not exists marks_stigmata on marks (chain_id, kind, tier) where kind >= 100;

-- Mark progress reads PairScored by agent; these keep it off a full scan.
create index if not exists arena_events_pair_a
	on arena_events (chain_id, lower(data ->> 'agentA')) where name = 'PairScored';
create index if not exists arena_events_pair_b
	on arena_events (chain_id, lower(data ->> 'agentB')) where name = 'PairScored';

-- Web push subscriptions (PushSubscription JSON). One row per browser endpoint.
create table if not exists push_subscriptions (
	endpoint text primary key,
	privy_id text not null,
	p256dh text not null,
	auth text not null,
	created_at timestamptz not null default now(),
	last_sent_at timestamptz
);
create index if not exists push_subscriptions_player on push_subscriptions (privy_id);

-- Gatherings the runner has already announced by push, so a restart never repeats one.
create table if not exists push_announced (
	chain_id integer not null,
	gathering bigint not null,
	sent integer not null default 0,
	at timestamptz not null default now(),
	primary key (chain_id, gathering)
);
