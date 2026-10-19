# Preview harness (dev only)

`/preview` renders the real screens on fixture data, so reviewers can screenshot every state
without signing in or a database. In a production build the route returns 404
(`process.env.NODE_ENV === "production"` → `notFound()`).

Open `/preview` with no params for an index of every link below.

Screenshot at **390x844** (design size), and check **360x740** and **430x932**.
Headless only (Playwright), e.g. `page.setViewportSize({ width: 390, height: 844 })`.

## URL shape

```
/preview?screen=<screen>&state=<state>[&aspect=0..6][&frame=bare][&me=<me state>][&gathering=<gathering state>][&op=fail|error][&delay=<ms>]
```

| Param       | Meaning                                                                                                   | Default     |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| `screen`    | `title`, `fragment`, `gathering`, `sealed`, `masks`                                                       | index       |
| `state`     | state for that screen (tables below)                                                                      | see below   |
| `aspect`    | Aspect of the Claimant's own Fragment: 0 Mercy, 1 Hunger, 2 Echo, 3 Rancour, 4 Appetite, 5 Inquisitor, 6 Madness | `2`  |
| `frame`     | `bare` drops the tab bar (screen alone in `main.shell`); otherwise the full signed-in shell with a live tab bar | shell |
| `me`        | Fragment state used while on other screens (e.g. switching tabs from the Gathering)                      | `confirmed` |
| `gathering` | Gathering state used while on other screens (e.g. switching tabs from the Fragment tab)                  | `commit`    |
| `op`        | how sealing / re-carving ends: resolves true (`ok`), false (`fail`), or throws (`error`)                 | `ok`        |
| `delay`     | ms the seal / re-carve takes before it resolves                                                           | `2500`      |

In the shell frame the tab bar works, so one URL can visit every tab on the same fixture world.

## Title — `screen=title`

| URL                                   | Shows                                                   |
| ------------------------------------- | ------------------------------------------------------- |
| `/preview?screen=title&state=ready`   | Title screen, enter button live. Pressing it enters the shell with no Fragment (binding flow). |
| `/preview?screen=title&state=waking`  | Title screen while the doors open (button disabled).    |

Note: the title screen is inlined in `app/page.tsx` (default export, calls `usePrivy()`), so the
preview renders a **mirror** of its markup (`TitleMirror` in `PreviewClient.tsx`). Same is true of
the signed-in shell (`ShellFrame`). When the shell owner extracts them into exported components
(e.g. `src/screens/title/TitleScreen.tsx` taking `{ ready, onEnter }`, and `src/ui/Shell.tsx`),
swap the mirrors for those so the preview cannot drift.

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

## Sealed tabs — `screen=sealed`

| URL                                         | Shows |
| ------------------------------------------- | ----- |
| `/preview?screen=sealed&state=spire`        | Spire, sealed. |
| `/preview?screen=sealed&state=reliquary`    | Reliquary, sealed. |
| `/preview?screen=sealed&state=vestry`       | Vestry, sealed. |

## Masks — `screen=masks`

| URL                                   | Shows |
| ------------------------------------- | ----- |
| `/preview?screen=masks&state=all`     | All seven masks in their glass windows (`GlassWindow` + `Mask` at 110 px), then at 56 / 40 / 36 px (binding header, picker, ledger sizes). |

## How the mock is wired (for screen owners)

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
