-- The Spire: PvE floors climbed off-chain (rules in src/game/spire.ts). Idempotent.

-- One row per Privy user, created on first read (src/server/spire.ts).
create table if not exists spire_progress (
	privy_id text primary key,
	-- the Degree `cleared` refers to; follows profiles.degree (a mismatch resets `cleared`)
	degree smallint not null default 7 check (degree between 1 and 7),
	-- highest floor cleared at `degree` (0..5); 5 at Degree 1 means the summit
	cleared smallint not null default 0 check (cleared between 0 and 5),
	-- first clears across every Degree; the Spire Mark reads this (src/server/marks.ts)
	floors_cleared integer not null default 0 check (floors_cleared >= 0),
	-- climbs left and the regen clock (one returns every 4.8 h, up to 5)
	attempts smallint not null default 5 check (attempts between 0 and 5),
	attempts_at timestamptz not null default now(),
	-- climbs ever made: the version for compare-and-set and the attempt number in each duel's seed
	runs integer not null default 0,
	updated_at timestamptz not null default now()
);

-- Every climb, won or lost.
create table if not exists spire_runs (
	id bigserial primary key,
	privy_id text not null,
	attempt integer not null, -- spire_progress.runs after this climb
	degree smallint not null,
	floor smallint not null,
	config bigint not null, -- the Fragment's packed Aspect + Sigils at the time
	won boolean not null,
	my_light smallint not null,
	their_light smallint not null,
	turns jsonb not null, -- [{mine, theirs}], 0 Kindle / 1 Devour
	first_clear boolean not null default false,
	ash integer not null default 0,
	resonance integer not null default 0,
	promoted_to smallint, -- new Degree when a boss fell
	at timestamptz not null default now(),
	unique (privy_id, attempt)
);
create index if not exists spire_runs_player on spire_runs (privy_id, at desc);
