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
