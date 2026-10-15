# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Phone-first installable PWA (Add to Home Screen on iOS 16.4+ and Android). Desktop works but is not the design target.

## Stack

Next.js on Vercel. Privy embedded wallets (email-code login first). SmoothSend `@smoothsend/sdk/avax` for gasless ERC-4337 transactions on Avalanche C-Chain, with viem. Neon Postgres. A separate Node runner service plays the heroes' moves. Contracts are Foundry/Solidity (`contracts/`). Shared deterministic game logic lives in `packages/strategies`.

## Users

**A global, English-speaking audience** of players who are not crypto-native. They never see wallets, gas or chains. They play on their phones, which for design purposes are mid-to-high-end.

There are two player types, and both must be served:
- **Set-and-forget.** They return a couple of times a day for a big, satisfying reveal of what happened while they were away, adjust their hero for the next session, and leave.
- **Deep tinkerer.** They spend long sessions experimenting with builds, climbing the tower and running simulations when no live event is on.

## Product Purpose

Players raise an autonomous hero from **F to S rank**. A hero's personality is a strategy for the iterated Prisoner's Dilemma: a base temperament plus tunable traits such as forgiveness, retaliation, memory, opening move and unpredictability.

At scheduled events, heroes face each other in live duels while the player watches. Each duel is a series of simultaneous choices to cooperate or betray, and every move is a real on-chain action. The player's skill is in the build, not the execution: heroes act on their own.

Success means:
- players come back between events for the reveal and to retune, and
- tinkerers find a deep, fair metagame.

## Positioning

- **Every move a hero makes is a real, gasless transaction on Avalanche.** Moves are committed and then revealed, so the game is verifiable and not just "on-chain branding".
- **Heroes are autonomous.** Once configured, they play whether or not the player is online.
- **Progression unlocks breadth, never raw power.** Live competition is decided by strategy, not by grinding.

## Operating Context

- **Daily game:** runs on Avalanche's Fuji network. Players never see this.
- **Championships:** two special event days on Avalanche mainnet. Progress, ranks and badges carry into them; the Championship leaderboard starts fresh.
- **Schedule:** several short live sessions per day at fixed times. Push notifications pull players back.

Between sessions players can:
- **climb the tower:** PvE floors of computer-controlled opponents; beating a rank's boss floor promotes the hero;
- **experiment in a sandbox sim:** it must never predict the real next live match;
- **collect idle accrual:** XP and currency that build up, up to a cap, while the player is away.

## Capabilities and Constraints

**Progression**
- Hero ranks F → S. Hero levels within each rank come from XP, and the max level unlocks that rank's boss floor.
- Earned currency buys strategies, trait chips, basic cosmetics and gacha pulls.

**Rewards**
- Free gacha and lootboxes, using **earned currency only**. Earned currency is never sold for money, directly or inside a pack.
- Soulbound badges: tiered kinds, single-tier rares, and one-of-a-kind specials. Rank is also a badge.

**Paid cosmetics**
- Fixed-content cosmetic packs (skins, titles) sold for stablecoin. Test USDC on Fuji now, USDT on mainnet later. Cosmetics only; never paid randomness.

**Live experience**
- A live duel feed of real on-chain reveals and scores. This is the centrepiece.
- A tutorial with smooth, tweened animation.

**Technical constraints**
- On-chain actions take seconds to confirm, so the UI must make waiting feel like part of the fiction.
- The duel feed reads on-chain events.
- Milestones (rank promotions, badges) are on-chain. Grinding (XP, currency, idle claims, sandbox runs) is off-chain.

**Terminology:** internal engineering names (agent, bout, round, commit, reveal, knob, and strategy names like Tit-for-Tat or Grudger) are **never** shown to players. Player-facing terms come from the worldview lexicon, which is **undecided** and is set in the design pass.

## Brand Commitments

- **Total immersion — a hard rule.** "Roleplay is very important, immersion is not a choice." No player-facing text uses technical or developer language. All copy comes from a single worldview-driven lexicon, so no literal UI strings appear outside it.
- **No AI-generated images**, anywhere. All visuals are made in code (SVG/CSS/canvas/motion) or supplied by the owner.
- **Name:** **Apostasy: Sede Vacante**. "Agent Arena" remains an internal codename only.
- **World:** gothic horror with Lovecraftian elements, told through stained glass, cathedral, occult, tarot and divination.
  - A god devoured itself. Its throne stands empty, and its light shattered into the windows as fragments.
  - Players are **Claimants**. Each binds one **Fragment** as a familiar and sends it, masked, to **Gatherings**, where fragments **Kindle** (share light) or **Devour** (take it).
  - **Light** is what's won and lost.
  - Ranks descend through the **Seventh to the First Degree**, toward the Throne.
- **Visual language:** backlit stained glass in lead, with dark, candlelit cathedral stone. The hero is a lit arched window. Results are glass plaques that shatter.
- **Lexicon (locked):**
  - **Light:** what's won and lost at Gatherings.
  - **Resonance:** a Fragment's growth (XP).
  - **Ash:** earned currency.
  - **Aspects:** the strategies, worn as Venetian masks:
    - Mercy (Volto)
    - Hunger (Bauta)
    - Echo (Colombina)
    - Rancour (Pantalone)
    - Appetite (Arlecchino)
    - Inquisitor (Medico della Peste)
    - Madness (Jolly)
  - **The Vigil:** idle accrual.
  - **The Spire:** PvE, with **Remnant** bosses, one per Degree.
  - **Scrying at the Reliquary:** gacha.
  - **Sigils:** trait chips.
  - **Marks:** badges. One-of-a-kind specials are **Stigmata**.
  - **Masks and Vestments:** paid cosmetics, which are skins of an Aspect's mask, never a different Aspect.
  - **The Conclave:** the mainnet Championship.
  - **Tabs:** Fragment · Spire · Gathering · Reliquary · Vestry.
- **Genre references** named by the owner: *Heroll* (you handle the build, the hero auto-fights) and *F-Class Adventurer* (AFK growth, F→S rank). The game should feel like it belongs to that genre: gacha, AFK rewards, rank fantasy, satisfying reveals.

## Evidence on Hand

There are no users, testimonials, metrics or press yet. Don't fabricate any. There are no brand assets yet (logo, art, fonts).

## Product Principles

1. **The world comes first.** Every word and screen belongs to the fiction. A technical term on screen is a bug.
2. **The return is the reward.** Coming back must always pay off immediately with a reveal, a claim or a result. Then the player retunes and leaves satisfied.
3. **Build, then watch.** Agency lives in configuring the hero. Watching it act should be dramatic, legible and tense.
4. **Fair by construction.** Progression broadens choices but never buys wins. Paid items are cosmetic and never random.
5. **Waiting is content.** Confirmation delays, cooldowns and timers are staged as part of the world, not hidden behind spinners.
