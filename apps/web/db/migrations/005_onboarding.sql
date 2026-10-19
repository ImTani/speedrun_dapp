-- Onboarding and staggered unlocks (rules in src/game/unlocks.ts). Off-chain only. Idempotent.

-- One row per Privy user, created on the first /api/state read (src/server/state.ts).
-- A player who already had a sealed Fragment when this landed starts with done = true and
-- everything they had opened already acknowledged.
create table if not exists onboarding (
	privy_id text primary key,
	-- the onboarding step the player is on; null once done (or before it starts)
	step text check (step in ('mask', 'sigil', 'name', 'bind', 'practice', 'seal', 'gathering')),
	done boolean not null default false,
	-- unlock ids the player has been shown (no longer "fresh")
	acked text[] not null default '{}',
	-- unlock ids ever opened; unlocks never close again (e.g. after Ash is spent)
	unlocked text[] not null default '{}',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
