# Attribution

Every third-party asset in Apostasy: Sede Vacante, where it came from, who made it, and its licence.
No asset in this game was made by an AI image generator.

## Masks (the seven Aspects)

The masks in `public/masks/` and `src/ui/masks/geometry.js` are built from icons on
[game-icons.net](https://game-icons.net). These are human-drawn vector icons, published since 2012,
licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The originals were downloaded
from the project's GitHub repository (https://github.com/game-icons/icons, branch `master`). Copies
are in `public/masks/src/`, with the repository's licence text in `public/masks/src/LICENSE-game-icons.txt`.

**Changes made (as CC BY requires us to say):** we split the icons into their separate shapes,
recombined them, and refitted them into a shared 100 x 84 mask space. We then recoloured and
shaded them in code: material gradients, raised relief, aging, ink hatching and ember eyes
(`src/scene/masks.js`). The source icons do not endorse this game.

| Aspect (mask) | Source icon | Author | Licence | Parts used |
| --- | --- | --- | --- | --- |
| Mercy (Volto) | [Curly mask](https://game-icons.net/1x1/lorc/curly-mask.html) | Lorc | CC BY 3.0 | face outline, eye holes, curls (gilded) |
| Hunger (Bauta) | [Architect mask](https://game-icons.net/1x1/lorc/architect-mask.html) | Lorc | CC BY 3.0 | face outline, eye positions |
| Hunger (Bauta) | [Pirate hat](https://game-icons.net/1x1/delapouite/pirate-hat.html) | Delapouite | CC BY 3.0 | the tricorn hat only (emblem removed) |
| Echo (Colombina) | [Carnival mask](https://game-icons.net/1x1/delapouite/carnival-mask.html) | Delapouite | CC BY 3.0 | half mask, eye holes, plumes |
| Rancour (Pantalone) | [Domino mask](https://game-icons.net/1x1/lorc/domino-mask.html) | Lorc | CC BY 3.0 | half mask, eye holes |
| Rancour (Pantalone) | [Mustache](https://game-icons.net/1x1/delapouite/mustache.html) | Delapouite | CC BY 3.0 | the moustache only |
| Appetite (Arlecchino) | [Domino mask](https://game-icons.net/1x1/lorc/domino-mask.html) | Lorc | CC BY 3.0 | half mask, eye holes |
| Inquisitor (Medico della Peste) | [Bird mask](https://game-icons.net/1x1/lorc/bird-mask.html) | Lorc | CC BY 3.0 | beaked mask, lens rims, nostril slits |
| Madness (Jolly) | [Duality mask](https://game-icons.net/1x1/lorc/duality-mask.html) | Lorc | CC BY 3.0 | face, split half, eye holes, grin |
| Madness (Jolly) | [Jester hat](https://game-icons.net/1x1/delapouite/jester-hat.html) | Delapouite | CC BY 3.0 | hat, band and bells |

Authors: Lorc (http://lorcblog.blogspot.com) and Delapouite (https://delapouite.com).

We drew these small parts ourselves in the same style: the Bauta's almond eye holes and nose
ridge, Pantalone's hooked nose, nostrils and brows, and the Arlecchino lozenge pattern.

In-app credit line: `src/ui/masks/credits.ts` (`MASK_CREDITS`).

To rebuild the masks from the sources (run from `apps/web`):

```
node src/ui/masks/tools/build-geometry.mjs   # sources -> src/ui/masks/geometry.js
biome format --write src/ui/masks/geometry.js
node src/ui/masks/tools/build-sheet.mjs      # -> public/masks/<aspect>[-grisaille|-ink].svg, sheet.html
```

## Carvings (tab bar and sealed-door seals)

The five carvings on the tab bar, also pressed into the wax seals on the sealed doors, use path
data copied unchanged from [game-icons.net](https://game-icons.net). These are human-drawn vector
icons licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). They were downloaded
from https://github.com/game-icons/icons at commit `82d948812bfe3f269ef8f731dcdb07b08160edc4`, and
the path data is kept in `src/ui/tabIcons.ts`.

**Changes made:** we recoloured and shaded the icons in code: stone and gilt gradients, an ink
relief shadow and a highlight in the tab bar (`src/ui/TabBar.tsx`), and a pressed-wax emboss on
the door seals (`src/screens/sealed/door.ts`). The source icons do not endorse this game.

| Way | Source icon | Author | Licence |
| --- | --- | --- | --- |
| Fragment | [Cracked mask](https://game-icons.net/1x1/lorc/cracked-mask.html) | Lorc | CC BY 3.0 |
| Spire | [Evil tower](https://game-icons.net/1x1/delapouite/evil-tower.html) | Delapouite | CC BY 3.0 |
| Gathering | [Ringing bell](https://game-icons.net/1x1/lorc/ringing-bell.html) | Lorc | CC BY 3.0 |
| Reliquary | [Locked chest](https://game-icons.net/1x1/lorc/locked-chest.html) | Lorc | CC BY 3.0 |
| Vestry | [Robe](https://game-icons.net/1x1/lorc/robe.html) | Lorc | CC BY 3.0 |

We drew the following ourselves in code, in the ink style of the Gathering stage: the title
nave (`src/screens/title/nave.ts`), the sealed doors with their chains and wax blobs
(`src/screens/sealed/door.ts`), and the candles and dust. The stained-glass window on the title is
the game's own procedural window (`src/scene/glass.js`, `src/scene/glassgl.js`).

In-app credit: the Colophon, which opens from the title screen and from the Vestry door
(`src/screens/title/Colophon.tsx`, strings in `src/lexicon/shell.ts`).

## Fonts

All three faces are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).
They are served through `next/font/google`, which self-hosts them from our own origin (`app/fonts.ts`).

| Face | Designer | Source | Licence |
| --- | --- | --- | --- |
| Grenze Gotisch | Renata Polastri (Omnibus-Type) | [Google Fonts](https://fonts.google.com/specimen/Grenze+Gotisch) | OFL 1.1 |
| IM Fell English | Igino Marini | [Google Fonts](https://fonts.google.com/specimen/IM+Fell+English) | OFL 1.1 |
| Cinzel | Natanael Gama | [Google Fonts](https://fonts.google.com/specimen/Cinzel) | OFL 1.1 |

## Sound

Every sound in `public/audio/` is a human recording, mixed by us from the sources below. No sound in
this game was made by an AI audio generator. Every source is **CC0 1.0 (public domain dedication,
https://creativecommons.org/publicdomain/zero/1.0/)**, so credit is not legally required; we give
it anyway. We checked the licence on each asset's own page (October 2026). Kenney pack licences
are also in each pack's `License.txt`. Freesound files were taken from the page's HQ preview.

**Changes made:** we trimmed, pitch-shifted, filtered, reversed and layered the sources; faded and
peak-normalised them; and encoded them as mono 44.1 kHz MP3. To rebuild everything from the sources
(run from `apps/web`, needs ffmpeg):

```
node src/audio/tools/build-audio.mjs fetch <cacheDir>   # downloads the sources listed below
node src/audio/tools/build-audio.mjs build <cacheDir>   # writes public/audio/*.mp3
```

### Sources

| Id | Source | Author | Licence |
| --- | --- | --- | --- |
| K-interface | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 |
| K-impact | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| K-rpg | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |
| FS-62964 | [Deep Bell.wav](https://freesound.org/people/LadyCailin/sounds/62964/) | LadyCailin | CC0 |
| FS-219047 | [Church Clock Strikes 1.wav](https://freesound.org/people/JarredGibb/sounds/219047/) | JarredGibb | CC0 |
| FS-554655 | [bec low bell solo.wav](https://freesound.org/people/HMTSCCSound/sounds/554655/) | HMTSCCSound | CC0 |
| FS-202003 | [singing bowl hit 3.wav](https://freesound.org/people/ryancacophony/sounds/202003/) | ryancacophony | CC0 |
| FS-271370 | [singing bowl strike sound](https://freesound.org/people/inoshirodesign/sounds/271370/) | inoshirodesign | CC0 |
| FS-527206 | [Cathedral Organ](https://freesound.org/people/Beetlemuse/sounds/527206/) | Beetlemuse | CC0 |
| FS-444491 | [Short Choir](https://freesound.org/people/Breviceps/sounds/444491/) | Breviceps | CC0 |
| FS-274121 | [Choir of Voices - Single Chord](https://freesound.org/people/bone666138/sounds/274121/) | bone666138 | CC0 |
| FS-398448 | [Match Ignite (No Strike)](https://freesound.org/people/brachern/sounds/398448/) | brachern | CC0 |
| FS-211624 | [Magic Wand Glitter](https://freesound.org/people/qubodup/sounds/211624/) | qubodup | CC0 |
| FS-351408 | [GLEAM-GLOW-SFX-CHIME.wav](https://freesound.org/people/newagesoup/sounds/351408/) | newagesoup | CC0 |
| FS-174279 | [Cathedral Ambience 1 (XY Stereo).wav](https://freesound.org/people/Quistard/sounds/174279/) | Quistard | CC0 |

### Cues

| File | Made from |
| --- | --- |
| `tap.mp3` | K-impact `impactWood_light_000` |
| `tab.mp3` | K-rpg `bookFlip3` |
| `error.mp3` | K-impact `impactWood_medium_000`, pitched down, low-passed |
| `light.mp3` | K-interface `glass_001` |
| `ash.mp3` | K-impact `footstep_snow_000`, first 0.16 s |
| `toll.mp3` | FS-62964, first 3.2 s |
| `seal.mp3` | K-impact `impactSoft_heavy_000` |
| `unveil.mp3` | K-rpg `cloth1` |
| `kindle.mp3` | FS-398448 layered with FS-271370 |
| `devour.mp3` | K-impact `impactPunch_heavy_000` (pitched down) layered with `impactGlass_heavy_001` |
| `collect.mp3` | FS-211624, first 0.9 s |
| `scryBuild.mp3` | FS-202003, first 1.0 s, reversed |
| `rarityCommon.mp3` | K-impact `impactBell_heavy_003` |
| `rarityRare.mp3` | FS-219047, first 1.6 s |
| `rarityRelic.mp3` | FS-444491 layered with FS-62964 |
| `unlock.mp3` | FS-351408, 1.45 to 3.45 s |
| `levelUp.mp3` | FS-219047, three strikes pitched to a rising triad |
| `promote.mp3` | FS-527206 (5.25 to 7.05 s) layered with FS-62964 |
| `win.mp3` | FS-274121 layered with FS-219047 |
| `lose.mp3` | FS-554655, pitched down, low-passed |
| `ambient.mp3` | FS-174279, 268 to 290 s, filtered, crossfaded into a 20 s loop |

### Speaker icon

The sound toggle uses path data copied unchanged from [game-icons.net](https://game-icons.net)
(human-drawn, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), downloaded from
https://github.com/game-icons/icons at commit `82d948812bfe3f269ef8f731dcdb07b08160edc4` and kept
in `src/audio/credits.ts`. **Changes made:** we cropped and recoloured them in code
(`src/audio/audio.module.css`). The source icons do not endorse this game.

| Use | Source icon | Author | Licence |
| --- | --- | --- | --- |
| Sound on | [Speaker](https://game-icons.net/1x1/delapouite/speaker.html) | Delapouite | CC BY 3.0 |
| Sound off | [Speaker off](https://game-icons.net/1x1/delapouite/speaker-off.html) | Delapouite | CC BY 3.0 |

In-app credit: `SOUND_CREDITS` in `src/audio/credits.ts`, for the Colophon.
