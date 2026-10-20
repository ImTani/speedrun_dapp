# Controls inventory

Every button and interactive control in the game, grouped by type, from the code (as of the
"PrimaryButton with four selectable looks" commit, `BUTTON_STYLE = "wax"`). The rendered review
sheet is `/_brand/controls` (dev only, `app/%5Fbrand/controls`).

"Uses" counts JSX call sites (one element that changes its label counts once). Dev-only tooling is
left out: `src/ui/tune/TunePanel.tsx` (the `?tune` panels), `app/fx-demo`, the `/preview` index and
the `/_brand` sheets.

## 1. Primary call to action (wax)

| Control | Component / class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Enter | `PrimaryButton hero` (src/ui/button/PrimaryButton.tsx) | src/screens/title/TitleScreen.tsx:118 | Wax bar, seal at the leading end, Grenze roman label, hero sheen; loading melts the seal | 1 |
| Choose this mask / Next | `PrimaryButton` | src/screens/fragment/BindRitual.tsx:287 | Wax, lg | 1 |
| Bind / Binding… | `PrimaryButton burst loading` | src/screens/fragment/BindRitual.tsx:300 | Wax, lg, embers on press | 1 |
| Unveil / Continue | `PrimaryButton` | src/screens/onboarding/Practice.tsx:301 | Wax, lg | 1 |
| Collect | `PrimaryButton size="md"` | src/screens/fragment/Hud.tsx:416 | Wax, md (48px) | 1 |
| Save (Retune sheet) | `PrimaryButton size="md"` | src/screens/fragment/Stage.tsx:453 | Wax, md, beside a `btn-ghost` Cancel | 1 |
| Climb floor N (again) | `PrimaryButton hero burst` | src/screens/spire/SpireScreen.tsx:219 | Wax, lg, hero | 1 |
| Continue (after a climb) | `PrimaryButton` | src/screens/spire/ClimbView.tsx:333 | Wax, lg | 1 |
| Scry · 100 Ash / Again · 100 Ash | `PrimaryButton hero burst` | src/screens/reliquary/ReliquaryScreen.tsx:258 | Wax, lg, hero | 1 |
| Buy · N USDC | `PrimaryButton size="md"` | src/screens/vestry/VestryScreen.tsx:210 | Wax, md, one per pack card (3 rendered) | 1 |
| Play | `PrimaryLink` (+ `hero` in the hero) | src/landing/Landing.tsx:41, :67 | Wax link | 2 |

12 call sites. Every `legacy` class they pass (`btn btn-blood`, title `.cta`, reliquary `.cta`,
vestry `.buy`, hud `.claim`, spire `.climbBtn`, landing `.play`) now only draws the "current" look.

## 2. Secondary buttons (seven different styles)

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Retune / Cancel / Try again | `.btn.btn-ghost` (app/globals.css:377, :416) | Stage.tsx:258 (Retune, + `.chisel`), Stage.tsx:444 (Cancel), SpireScreen.tsx:115 (Try again) | Chamfered 8px slab, flat #1f1612, 3px ink border, 1px umber ring, Grenze Gotisch blackletter | 3 |
| Suggest a name | fragment `.divine` | src/screens/fragment/BindRitual.tsx:247 | Square, #1f1612, 2px ink, gilt-d ring + faint glow, gilt blackletter, star glyph | 1 |
| Wear it / Worn | reliquary `.wear` | src/screens/reliquary/ReliquaryScreen.tsx:390 | Square, #2a1d14, 2px ink, gilt-d ring, Grenze roman; plain `<button>` (no press motion) | 1 |
| Close (Credits / Settings sheet) | title `.leafClose` | src/screens/title/Colophon.tsx:124 | Chamfered, umber gradient, soot + umber rings, blackletter | 1 |
| Keep my account | legal `.btn` | src/legal/DeleteAccount.tsx:69 | Square, no fill, 1px umber-l hairline, Alegreya body; hover gilt border; no press motion | 1 |
| Got it (storage notice) | legal `.noticeDismiss` | src/legal/CookieNotice.tsx:78 | Same hairline as legal `.btn`, small text | 1 |
| Ledger of Light plaque | gathering `.ledgerBtn` | src/screens/gathering/Ledger.tsx:39 (see 11) | Chamfered umber plaque, gilt-d ring, three masks, rubric, chevron | 1 |

## 3. Ghost / text buttons

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Skip (practice duel) | practice `.skip` | src/screens/onboarding/Practice.tsx:210 | Bare, Cinzel caps, small, 0.1em tracking | 1 |
| Skip (coach mark) | coach `.skip` | src/ui/coach/Coach.tsx:181 | Pill (999px), #0b0807cc fill, umber-d ring, Cinzel caps small | 1 |
| Skip (Spire duel) | spire `.skip` | src/screens/spire/ClimbView.tsx:346 | Bare, Cinzel caps, micro, 0.18em tracking | 1 |
| Credits | title `.colophonLink` | src/screens/title/TitleScreen.tsx:158 | A button drawn as a link: Alegreya micro, gilt, underline on hover | 1 |

## 4. Destructive

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Delete my account / Yes, delete it | legal `.btn.btnDanger` | src/legal/DeleteAccount.tsx:100 (step 1), :78 (confirm) | Square, solid blood fill, blood-l hairline, Alegreya body; shown only in the in-game Settings sheet | 2 |

## 5. Icon buttons

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Settings gear | `SettingsEntry` / title `.gear` | src/screens/title/SettingsEntry.tsx:30, placed at Stage.tsx:123 | 44px round, transparent, bone-d cog | 1 |
| Speaker (mute) | `SoundToggle` / audio `.toggle` | src/audio/SoundToggle.tsx:24, placed at Stage.tsx:124 | 44px round, transparent, bone-d speaker; off = dimmer | 1 |
| Ritual back chevron | fragment `.back` | src/screens/fragment/BindRitual.tsx:132 | 44px chamfered square slab, #1f1612, umber ring | 1 |
| Carousel arrows | fragment `.arrow` | src/screens/fragment/AspectCarousel.tsx:93, :142 | Bare gilt chevrons (3px stroke), 44 x 56, ink drop shadow | 2 |
| Ledger sheet close | gathering `.sheetClose` | src/screens/gathering/Ledger.tsx:144 | Bare 44px, bone-d X | 1 |
| Skip to the result (hourglass) | gathering `.skip` | src/screens/gathering/GatheringScreen.tsx:672 | 50px round umber boss, umber-l ring, drop shadow, hourglass glyph | 1 |

## 6. Tabs

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| The ledge (5 ways) | `TabBar` / `TabBar.module.css` | src/ui/TabBar.tsx:73, placed at src/screens/title/Shell.tsx:322 | Carved stone icons; on = gilt + notch + candle glow; Gathering on a raised round boss; locked = dim + padlock + shake; lit = pulsing glow | 1 (5 buttons) |

## 7. Chips and pickers

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Mask chips (strip of 7) | fragment `.chip` | src/screens/fragment/AspectCarousel.tsx:173 | 48px square tiles, translucent black, umber-d ring, 62% opacity; on = gilt ring + glow | 1 (7 chips) |
| First Gesture tiles (radio) | fragment `.gesture` | src/screens/fragment/SigilEditor.tsx:310 (ritual step II and Retune sheet) | 72px tiles, umber gradient; on = per-gesture colour (gilt / blood / bone), blackletter | 1 (3 tiles) |
| Wardrobe chips | vestry `.chip` | src/screens/vestry/Wardrobe.tsx:133 | 44px, #1f1612, 2px ink, umber ring, swatch + Grenze roman; on = gilt ring + glow | 1 (x3 slots) |
| Look-alikes that are not controls | landing `.chip`, reliquary `.rarity` / `.rowTag`, spire `.floorTag`, vestry `.owned`, Stage sigil `.tile` | Landing.tsx:225, ReliquaryScreen.tsx:367, Tower.tsx:75, VestryScreen.tsx:208, Stage.tsx:238 | Static labels; `globals.css:760 .chip` is unused | - |

## 8. Sliders and switches

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Sigil rail (role=slider) | fragment `.rail` / `.rivetFace` | src/screens/fragment/SigilEditor.tsx:241 (ritual step II and Retune sheet) | Brass groove, gilt-to-ember fill, notches, diamond rivet 30px; disabled 55% | 1 (1-4 per Aspect) |
| Sound / Cathedral air / Vibration (role=switch) | `SoundSettingsList` / audio `.row` `.switch` | src/audio/SoundToggle.tsx:78, placed at Stage.tsx:290 and Colophon.tsx (Settings) | Text row + 40 x 22 pill: umber-d track, bone-d knob; on = gilt-d track, gilt-hi knob | 2 placements (2-3 rows) |
| Notifications (role=switch) | hud `.switch` / `.knob` | src/screens/fragment/Hud.tsx:604 | 58 x 44 target, 26px pill #070504 with umber-l edge, radial bone knob (spring); on = gilt gradient track | 1 |

## 9. Text input

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Fragment name | fragment `.nameField input` | src/screens/fragment/BindRitual.tsx:341 | 56px well, centred blackletter h3, inset shadow; focus = gilt ring + glow; count from 18 letters | 1 |

## 10. Links

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Terms · Privacy · Cookies | `LegalLinks` / legal `.links` | src/legal/LegalLinks.tsx:28; TitleScreen.tsx:154, Colophon.tsx:117, Landing.tsx:243, LegalPage.tsx:89 | Gilt, no underline (underline on hover), 44px | 4 |
| ← Back | `BackLink` / legal `.back` | src/legal/BackLink.tsx:33 (all three legal pages) | Gilt, no underline | 1 |
| Consent links | title `.consent a` | src/screens/title/TitleScreen.tsx:144-145 | Gilt, underlined (50% gilt line) | 2 |
| Cookie policy (notice) | legal `.noticeText a` | src/legal/CookieNotice.tsx:76 | Gilt, underlined | 1 |
| Privacy (delete section) | legal `.delete a` | src/legal/DeleteAccount.tsx:97 | Gilt, default underline | 1 |
| All sources | title `.leafRoll` | src/screens/title/Colophon.tsx:107 | Gilt italic, underlined | 1 |
| View seal | hud `.sealLink` | src/screens/fragment/Hud.tsx:552 | Gilt, underlined | 1 |
| Legal prose links | `Doc` / `Ext` / `Mail` (src/legal/bits.tsx), legal `.prose a` | terms.tsx, privacy.tsx, cookies.tsx, LegalPage.tsx:87 | Gilt, 1px underline | 30 |
| Contents | legal `.tocList a` | src/legal/LegalPage.tsx:58 | Gilt, numbered, no underline | 1 (per section) |
| Arena contract on Snowtrace | landing `.explorer` | src/landing/Landing.tsx:168 | Gilt, underlined, address + ↗ | 1 |
| QR short URL | landing `.qrUrl` | src/landing/Landing.tsx:76 | Monospace gilt, underlined | 1 |
| Source on GitHub / Credits | landing `.footNav a` | src/landing/Landing.tsx:238, :241 | Gilt, no underline | 2 |

## 11. Cards and tokens that act as buttons

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Spire floors | `Tower` / spire `.floor` | src/screens/spire/Tower.tsx:42 | 66px chamfered card (78px boss); cleared = gilt number; selected = 2px gilt ring; locked = dimmed; boss = blood ring | 1 (5 floors) |
| Ledger of Light plaque | `LedgerButton` / gathering `.ledgerBtn` | src/screens/gathering/Ledger.tsx:39 | Chamfered plaque (tap, or swipe up) | 1 |
| Marks medals | `MarksShelf` / hud `.medal` | src/screens/fragment/Hud.tsx:511 | 46px round; sealed = gilt coin; earned = dashed ring; open = bone outline; new = pulse | 1 (one per Mark) |
| Seal (press the wax) | fragment `.sealButton` + `WaxSeal` | src/screens/fragment/Waiting.tsx:150 | 124px round wax seal art; live = beckoning gilt ring | 1 |
| Not tappable | Vestry pack card, Reliquary flip card | VestryScreen.tsx:188, ReliquaryScreen.tsx:245 | The card is static; Buy / Wear inside are the controls | - |

## 12. Sheets, handles and dismiss surfaces

| Control | Class | Where | Look now | Uses |
| --- | --- | --- | --- | --- |
| Ledger sheet head (drag down to close) | gathering `.sheetHead` + `.grabber` | src/screens/gathering/Ledger.tsx:139 | Round 44 x 5 bone-dd grabber, title, X close | 1 |
| Retune sheet grip | fragment `.sheetGrip` | src/screens/fragment/Stage.tsx:425 | Square 44 x 5 umber-l bar; decorative (the sheet does not drag) | 1 |
| Scrims (tap to close) | `.scrim` in fragment / gathering / title | Stage.tsx:412, Ledger.tsx:110, Colophon.tsx:68 | Dark scrim; Escape and Android Back also close | 3 |

## 13. Gestures without a visible control

| Gesture | Where | Uses |
| --- | --- | --- |
| Swipe the rose for another mask | src/screens/fragment/AspectCarousel.tsx:124 | 1 |
| Swipe the Ledger plaque up to open | src/screens/gathering/Ledger.tsx:43 | 1 |
| Tap the nave to skip the duel playback | src/screens/gathering/GatheringScreen.tsx:578 | 1 |
| Tap the active tab to scroll to the top | src/screens/title/Shell.tsx:177 (`go`) | 1 |
