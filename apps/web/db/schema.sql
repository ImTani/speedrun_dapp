-- Neon Postgres schema shared by the web app (Vercel) and the runner service. Non-secret data only:
-- agent keys, seeds and salts stay with the runner. Idempotent; apply with psql or the Neon console.
-- chain_id separates the daily game on Fuji (43113) from the Conclave on mainnet (43114).

-- One row per Privy user.
create table if not exists players (
	privy_id text primary key,
	eoa text not null unique, -- Privy embedded wallet; signs the player's UserOps
	account text not null unique, -- SimpleAccount owned by eoa: the Fragment's owner on-chain
	created_at timestamptz not null default now()
);

-- One Fragment (Arena agent) per owner account. House Fragments (house = true) are run by the game to
-- keep Gatherings full when few players are online; the landing page says so, and this flag lets stats
-- and tooling tell them apart from player Fragments.
create table if not exists fragments (
	id bigserial primary key,
	chain_id integer not null default 43113,
	owner_account text not null, -- players.account, or a house owner account
	agent text, -- the Fragment's own SimpleAccount; set by the runner when it registers
	config bigint not null, -- packed Aspect + Sigils (@arena/strategies encodeConfig)
	name text not null, -- display name
	house boolean not null default false,
	-- requested: asked for in the app; registered: runner sent registerAgent;
	-- confirmed: owner sent confirmAgent; failed: see error
	status text not null default 'requested'
		check (status in ('requested', 'registered', 'confirmed', 'failed')),
	error text,
	requested_at timestamptz not null default now(),
	registered_at timestamptz,
	confirmed_at timestamptz,
	unique (chain_id, owner_account),
	unique (chain_id, agent)
);
create index if not exists fragments_status on fragments (chain_id, status);

-- Arena events, indexed by the runner from chain logs. The duel feed and standings read these; the
-- chain stays the source of truth. `data` holds the decoded event args (bigints as strings).
create table if not exists arena_events (
	chain_id integer not null,
	block bigint not null,
	log_index integer not null,
	tx text not null,
	name text not null, -- BoutOpened, RoundStarted, Committed, Revealed, PairScored, RoundFinalized, BoutClosed, Agent*
	gathering bigint, -- boutId, when the event has one
	round integer,
	agent text, -- the acting agent, when the event has one
	data jsonb not null,
	at timestamptz not null default now(),
	primary key (chain_id, block, log_index)
);
create index if not exists arena_events_gathering on arena_events (chain_id, gathering, round);
create index if not exists arena_events_name on arena_events (chain_id, name, block);

-- Indexer cursor per chain.
create table if not exists indexer_state (
	chain_id integer primary key,
	last_block bigint not null
);

-- Light per Fragment per chain, summed from PairScored. Standings read this.
create or replace view light as
select
	e.chain_id,
	s.agent,
	sum(s.points)::bigint as light,
	count(*) as duels,
	max(e.block) as last_block
from arena_events e
cross join lateral (
	values
		(e.data ->> 'agentA', (e.data ->> 'pointsA')::int),
		(e.data ->> 'agentB', (e.data ->> 'pointsB')::int)
) as s(agent, points)
where e.name = 'PairScored'
group by e.chain_id, s.agent;
