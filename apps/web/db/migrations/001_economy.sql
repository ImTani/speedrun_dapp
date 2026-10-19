-- Economy: Degree, Resonance (levels), Ash, the Vigil. Off-chain only. Idempotent.

-- One row per Privy user, created on first read (src/server/economy.ts).
create table if not exists profiles (
	privy_id text primary key,
	degree smallint not null default 7 check (degree between 1 and 7),
	resonance integer not null default 0 check (resonance >= 0),
	ash integer not null default 0 check (ash >= 0),
	vigil_since timestamptz not null default now(), -- the Vigil accrues from here
	created timestamptz not null default now()
);

-- Every credit and debit. `ref` makes each one idempotent per player:
-- duel:<chain>:<block>:<log_index>, vigil:<epoch ms>, or a caller's own key (e.g. a purchase id).
create table if not exists economy_ledger (
	id bigserial primary key,
	privy_id text not null,
	kind text not null, -- gathering, vigil, or the spending/granting feature's name
	ash integer not null default 0, -- negative for spends
	resonance integer not null default 0,
	ref text not null,
	at timestamptz not null default now(),
	unique (privy_id, ref)
);
create index if not exists economy_ledger_player on economy_ledger (privy_id, at desc);
