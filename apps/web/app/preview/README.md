# Preview harness (dev only)

`/preview` renders the real screens on fixture data, so reviewers can screenshot every state
without signing in or a database. In a production build the route returns 404
(`process.env.NODE_ENV === "production"` → `notFound()`).

Open `/preview` with no params for an index of every link below.

Screenshot at **390x844** (design size), and check **360x740** and **430x932**.
Headless only (Playwright), e.g. `page.setViewportSize({ width: 390, height: 844 })`.

## URL shape

```
/preview?screen=<screen>&state=<state>[&aspect=0..6][&frame=bare][&me=<me state>][&gathering=<gathering state>][&spire=<spire state>][&outcome=win|lose][&op=fail|error][&delay=<ms>]
```

| Param       | Meaning                                                                                                   | Default     |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| `screen`    | `title`, `fragment`, `hud`, `tutorial`, `gathering`, `spire`, `reliquary`, `vestry`, `masks`             | index       |
| `state`     | state for that screen (tables below)                                                                      | see below   |
| `aspect`    | Aspect of the Claimant's own Fragment: 0 Mercy, 1 Hunger, 2 Echo, 3 Rancour, 4 Appetite, 5 Inquisitor, 6 Madness | `2`  |
| `frame`     | `bare` drops the tab bar (screen alone in `main.shell`); otherwise the full signed-in shell with a live tab bar | shell |
| `me`        | Fragment state used while on other screens (e.g. switching tabs from the Gathering)                      | `confirmed` |
| `gathering` | Gathering state used while on other screens (e.g. switching tabs from the Fragment tab)                  | `commit`    |
| `spire`     | Spire world used while on other screens (same names as the Spire table)                                  | `mid`       |
| `outcome`   | Spire only: force every climb to `win` or `lose` (otherwise the real duel decides)                       | real duel   |
| `op`        | how sealing / re-carving ends: resolves true (`ok`), false (`fail`), or throws (`error`)                 | `ok`        |
| `delay`     | ms the seal / re-carve takes before it resolves                                                           | `2500`      |

In the shell frame the tab bar works, so one URL can visit every tab on the same fixture world.

## Title — `screen=title`

| URL                                   | Shows                                                   |
| ------------------------------------- | ------------------------------------------------------- |
| `/preview?screen=title&state=ready`   | Title screen, enter button live. Pressing it enters the shell with no Fragment (binding flow). |
| `/preview?screen=title&state=waking`  | Title screen while the doors open (button disabled).    |

The preview renders the real `TitleScreen` and `GameShell` (no mirrors), so it cannot drift.

## Fragment tab — `screen=fragment`

| URL                                                | Shows |
| -------------------------------------------------- | ----- |
| `/preview?screen=fragment&state=loading`           | The nave never answers; the waiting word stays. |
| `/preview?screen=fragment&state=unavailable`       | 503 from the server: the "unavailable" banner. |
| `/preview?screen=fragment&state=silent`            | 500 from the server: the "no voice" banner. |
| `/preview?screen=fragment&state=none`              | No Fragment: binding flow (mask picker → Sigils → name). Binding works: it becomes `requested`, then `registered` 4 s later (screen polls every 5 s). |
| `/preview?screen=fragment&state=requested`         | Fragment stirs in a dim window. |
| `/preview?screen=fragment&state=registered`        | Awaits the seal; pressing it seals after `delay` ms and the Fragment becomes bound. |
| `/preview?screen=fragment&state=failed`            | The binding broke. |
| `/preview?screen=fragment&state=confirmed`         | Bound Fragment: name, 47 Light, 9 duels, Sigil chips, re-carve open. |
| `/preview?screen=fragment&state=confirmed-dark`    | Bound Fragment with negative Light (-14). |
| `/preview?screen=fragment&state=confirmed-locked`  | Bound while a Gathering is underway: re-carving locked. |
| `/preview?screen=fragment&state=confirmed&aspect=N`| Bound Fragment for each Aspect N = 0..6 (Madness shows no Sigils). |
| `/preview?screen=fragment&state=registered&op=fail`| The seal does not take (failure banner). |

## Fragment tab HUD — `screen=hud`

The bound Stage (me = `confirmed`) with the HUD: standing card (Degree, level, Resonance bar, Ash),
the Vigil card with Collect, the Marks shelf (tap a medal for its name and state), the notifications
switch (only where the browser supports push; on iPhone Safari outside the Home Screen app it shows
a one-line hint instead), and the equipped title and mask finish/tint on the name plate.

| URL                                        | Shows |
| ------------------------------------------ | ----- |
| `/preview?screen=hud&state=mid`            | Degree VI, level 12 of 15 (165 to next), 340 Ash, Vigil 7h of 12h with 56 Ash / 105 Resonance waiting, Marks shelf, title "the Unrepentant". Collect plays the spark burst and rolls Ash. |
| `/preview?screen=hud&state=full`           | Vigil full: ember bar, Full tag, 96 Ash / 180 Resonance waiting. Collecting lifts the level (level-up chip). |
| `/preview?screen=hud&state=empty`          | Vigil just collected: "Nothing to collect yet", Collect disabled. |
| `/preview?screen=hud&state=capped`         | Level 15 of 15: full bar and the capped note. |
| `/preview?screen=hud&state=dressed`        | Night pack worn: Ink finish and Night tint on the plate mask, title "of the Long Night". |
| `/preview?screen=hud&state=new`            | New Claimant: Degree VII level 1, 0 Ash, "No Marks yet.", no title. |
| `/preview?screen=hud&state=marks-new`      | As `mid`, but clears the seen-Marks memory so every medal pulses once. |

Add `&aspect=N` for another Aspect.

## First-run guide — `screen=tutorial`

| URL                                       | Shows |
| ----------------------------------------- | ----- |
| `/preview?screen=tutorial&state=first`    | The four-step guide over the Fragment tab: bind, Gatherings run on their own, collect the Vigil, climb the Spire. Swipe or Next; Skip / Begin / Escape close it. |

In the app it shows once after the first sign-in (`localStorage["apostasy.tutorial.seen"]`, see
`FirstRun` in `src/screens/tutorial/Tutorial.tsx`, mounted by `app/page.tsx`). Clear that key to
see it again.

## Gathering tab — `screen=gathering`

Fixture: Gathering 3, 8 Fragments (the Claimant's own Fragment included when `me` is bound),
second toll of six; the countdown rolls over every 90 s so it never runs dry. Ledger has 25 rows
covering all seven Aspects, including one nameless Fragment and the Claimant's own.

| URL                                           | Shows |
| --------------------------------------------- | ----- |
| `/preview?screen=gathering&state=commit`      | Active Gathering, sealing phase, countdown; opens on the last duel of the first toll. |
| `/preview?screen=gathering&state=reveal`      | Active Gathering, unveiling phase; two fresh duels arrive every poll (3 s) so the queue builds and playback speeds up. |
| `/preview?screen=gathering&state=between`     | Active Gathering, between tolls. |
| `/preview?screen=gathering&state=closed`      | Gathering ended: waiting word over the last result. |
| `/preview?screen=gathering&state=empty`       | No Gathering ever held: waiting word and hint, quiet feed. |
| `/preview?screen=gathering&state=vision`      | Reads fail (503): the screen falls back to its own vision fixture. |

Tap the ledger button for the Light ledger sheet.

## Spire tab — `screen=spire`

The tower for the current Degree (five floors, the Remnant on top), climbs left, and the climb.
Wins credit the shared mock purse (Ash / Resonance on the Fragment tab go up too).

| URL                                            | Shows |
| ---------------------------------------------- | ----- |
| `/preview?screen=spire&state=fresh`            | Degree VII, nothing cleared, five climbs. |
| `/preview?screen=spire&state=mid`              | Degree VI, two floors cleared, three climbs (one returning). |
| `/preview?screen=spire&state=boss-locked`      | Degree V, four floors cleared, the Remnant locked behind the level cap. |
| `/preview?screen=spire&state=boss-ready`       | Degree V, at the level cap: the Remnant is open. |
| `/preview?screen=spire&state=spent`            | No climbs left (the next returns in under two hours). |
| `/preview?screen=spire&state=summit`           | Degree I, every floor cleared: replays only. |
| `/preview?screen=spire&state=unbound`          | No Fragment bound: the tower shows, climbing is closed. |
| `/preview?screen=spire&state=boss-ready&outcome=win` | Every climb wins (promotion to Degree IV). |
| `/preview?screen=spire&state=mid&outcome=lose` | Every climb falls short. |

## Reliquary tab — `screen=reliquary`

| URL                                          | Shows |
| -------------------------------------------- | ----- |
| `/preview?screen=reliquary&state=mid`        | 340 Ash, 7 Scryings to the sure Relic, three recent results. |
| `/preview?screen=reliquary&state=broke`      | 40 Ash: Scrying is out of reach. |
| `/preview?screen=reliquary&state=pity`       | One Scrying from the sure Relic. |
| `/preview?screen=reliquary&state=rich`       | 5,000 Ash to pull with. |

## Vestry tab — `screen=vestry`

| URL                                       | Shows |
| ----------------------------------------- | ----- |
| `/preview?screen=vestry&state=mid`        | 4 USDC: Night (1) and Oxblood (2) affordable, Throne (5) not. Buying runs the mock payment, then the claim. |
| `/preview?screen=vestry&state=empty`      | 0 USDC on the account. |
| `/preview?screen=vestry&state=owned`      | Every pack already owned. |
| `/preview?screen=vestry&state=rich`       | 20 USDC: everything affordable. |

The mock payment never checks USDC at prepare time, so the server's "would revert" path (not enough
USDC) only appears against the real server; here a short purse fails at the claim instead.

## Masks — `screen=masks`

| URL                                   | Shows |
| ------------------------------------- | ----- |
| `/preview?screen=masks&state=all`     | All seven masks in their glass windows (`GlassWindow` + `Mask` at 110 px), then at 56 / 40 / 36 px (binding header, picker, ledger sizes). |

## How the mock is wired (for screen owners)

Feature screens call `api.call(path, init)`. In the preview that goes to `serveMock()`
(`src/client/mockRoutes.ts`), which answers from handlers registered with
`registerMockRoute(prefix, handler, method)` in `src/client/mock/<feature>.ts`. Every feature mock
is imported (for its side effect) by `src/client/mock/index.ts`, which `mock.tsx` imports: **add a
line there when you add a feature mock**. Each preview link seeds a clean world first
(`seedWorld()` in `PreviewClient.tsx` calls `resetMockEconomy/Inventory/Marks`; the Spire mock
reads its world from the URL). The economy mock is one shared purse: Scrying spends from it, Spire
wins and the Vigil pay into it.


`src/client/mock.tsx` exports `MockApiProvider({ state })`. It answers in three ways:

1. **`ApiContext`** (`src/client/api.ts`): `useApi()` returns the provider's mock instead of the
   Privy-backed client. Screens that use `useApi()` need nothing else.
2. **`setPublicReads()`**: `publicApi.gathering()/standings()` and the new null-on-failure helpers
   `readGathering()` / `readStandings()` read from the mock.
3. **`window.fetch` shim** for same-origin `/api/gathering`, `/api/standings`, `/api/me`,
   `/api/op/status`, so screens that still `fetch()` those paths directly also see the fixtures.

**Gathering screen owner:** `GatheringScreen` currently calls `fetch("/api/gathering")` and
`fetch("/api/standings")` through its own `getJSON`. Please replace those with

```ts
import { readGathering, readStandings } from "@/client/api";
const r = await readGathering();   // GatheringState | null (null = nave silent → vision)
const s = await readStandings();   // { rows } | null
```

(`GatheringState` / `StandingRow` in `api.ts` match `GatheringResponse` / `StandingsRow` in
`screens/gathering/types.ts`.) Once no screen fetches `/api/*` directly, door 3 can be deleted.

Children of `MockApiProvider` mount only after the mock is installed, so their first poll sees
fixtures. The provider is keyed on the URL params, so each link gets a fresh fixture world.

The preview route still sits under the root layout, which wraps everything in `PrivyProvider`;
the mock never calls Privy, but Privy itself still initialises on the page.
