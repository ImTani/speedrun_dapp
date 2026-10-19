-- Inventory: cosmetics owned and worn, the Scrying log, Vestry purchases. Off-chain only. Idempotent.
-- Items are ids from apps/web/src/game/reliquary.ts. Cosmetics never change how a Fragment plays.

-- Items a player owns. Gilded finish, no tint and no title are the defaults and need no row.
create table if not exists inventory_items (
	privy_id text not null,
	item text not null,
	source text not null, -- scry or vestry
	at timestamptz not null default now(),
	primary key (privy_id, item)
);

-- What a player's Fragment wears (null = default).
create table if not exists inventory_equipped (
	privy_id text primary key,
	finish text,
	tint text,
	title text,
	updated_at timestamptz not null default now()
);

-- Every Scrying, numbered per player from 0. The pull number seeds the outcome.
create table if not exists scry_log (
	privy_id text not null,
	n integer not null check (n >= 0),
	item text not null,
	rarity text not null check (rarity in ('common', 'rare', 'relic')),
	duplicate boolean not null default false,
	refund integer not null default 0,
	at timestamptz not null default now(),
	primary key (privy_id, n)
);

-- Vestry purchases, one per paying UserOp. Amounts only: no addresses are kept.
create table if not exists vestry_purchases (
	user_op_hash text primary key,
	chain_id integer not null default 43113,
	privy_id text not null,
	pack text not null,
	amount bigint not null, -- USDC base units (6 decimals)
	tx text not null,
	log_index integer not null,
	at timestamptz not null default now(),
	unique (chain_id, tx, log_index)
);
create index if not exists vestry_purchases_player on vestry_purchases (privy_id, at desc);
