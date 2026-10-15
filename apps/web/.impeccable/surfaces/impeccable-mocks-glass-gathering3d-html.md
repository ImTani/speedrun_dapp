---
version: 1
slug: "impeccable-mocks-glass-gathering3d-html"
primary_target: ".impeccable/mocks/glass/gathering3d.html"
related_targets: []
---

## Surface

**The Gathering, rendered as a 2.5D lit scene.** It replays one Meeting: five turns of Kindle or Devour.
- **Mode:** Experience.
- **Phone-first,** 390×844.
- **Skippable:** tap hastens, hold rushes, the hourglass passes to the outcome, and holding the hourglass sets always-pass.

## Direction contract

**THESIS.** Light is the only actor. Two stained-glass windows sit in one cathedral wall, a light source behind each throws their glass onto the floor, and every beat is that light physically changing. It refuses added-on effects: no embers, no glows pasted on top, no web text.

**OWN-WORLD.**
- **Scene:** a three.js 3D scene in a dark painted manner. The wall has real depth: arched openings with embrasure reveals, a colonnette and a stringcourse. The floor plane lies in front.
- **Surfaces:** stone albedo is Kuwahara-filtered once, and normals stay live, so brushwork is *lit*.
- **Windows:** the locked glass shader, rim 0.1. Aspect masks are grisaille painted into the glass, with faint glowing eyes.
- **Projection:** each window's light is a spotlight projecting its glass, occluded by the wall. Caustic filaments are a shader layer inside that projection. Starting values (owner-tuned): `{"inward":0.17,"zc":2.75,"rz":1.18,"spread":0.8,"caus":0.34,"expo":1.15,"vig":0.13}`.
- **Glass medallions** along each arch, lit by the same light.
- **The inlaid floor eye** is a real light source.
- **No grain.**

**STORY.**
1. **Hush:** cloud behind both windows, and the light softens.
2. **Reveal:**
   - Kindle: that light surges warm.
   - Devour: the glass turns crimson, and its light source moves toward the victim, so its projection slides and swallows the other's.
   - Kindle–kindle: the projections overlap and interfere at the centre.
3. **Tally:** light crawls along the arch, filling medallions.

Names are engraved under the windows and are legible only where light falls. The turn's outcome is cut into the floor and revealed as the light sweeps over it.

**FIRST VIEWPORT.**
- **Wall** (top ~55%): two arched windows and the colonnette, with medallions in the reveals.
- **Engraved names** under the sills.
- **Floor** (bottom ~45%): receives both projections, with the inlaid eye at the crossing.
- **Fittings:** a dim iron ring at top-left (leave) and a dim hourglass at bottom-right.

**SIGNATURE INTERACTION.**
- Touching the floor casts the finger's shadow into the projected light.
- Dragging parallaxes the camera.
- Tapping a window turns its mask's eyes toward the touch.
- Holding makes time rush: the clouds race.

**FORM.** The owner pinned this composition (one wall, side by side), and owner-approved the 2.5D direction on 2026-10-15. World seed `80aa973e`. No surface roll.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Style lab (open, 2026-10-15)

**The owner's verdict on the as-built scene:** "more coherent but it isn't phone game like. It needs to be HEAVILY stylized." They chose two families to compare:
- Darkest Dungeon ink;
- Hades / Supergiant painted comic.

The engine stays the same: one three.js scene with non-photoreal passes on top (`glass/npr.js`).

**How to switch:**
- `?style=ink|paint|off`. `off` is the scene as built and stays the default until the owner picks.
- `?tune` adds a Style section: a preset select, sliders for every constant, and "Copy style values".

**Both styles**
- **Ink outlines:** from depth, normals and object ids, with a hand-inked wobble. Lettering is outlined from the outside only.
- **Shading:** a value-band toon ramp over the real lights, with a gamma lift so the stone reads.
- **Glass:** the lead lines grow heavier, and the colour flattens.
- **Stone:** hand-made wobble in the geometry, chunkier mouldings and medallions, and less surface detail.
- **Floor light:** graphic and posterised (panes with their lead), on one slider back to the owner's soft caustics.
- **Lettering:** ink-stroked and glowing. Ink letters in Grenze Gotisch; Painted uses Spectral SC 800 capitals.
- **Juice:**
  - a flash on the reveal;
  - on devour, a hit-stop, a screen shake and a red flash;
  - the turn and outcome words slam onto the floor;
  - medallions pop as they fill.
  - Juice is off with the style off or under reduced motion; flashes drop to a third.

**Ink**
- Bone, umber and dried blood, with crushed blacks.
- Only strong coloured light keeps its colour.
- Screen-space cross-hatching in the shadow bands, and a heavy black vignette.

**Painted**
- Saturated blocks; shadows go violet on the wall and teal on the floor, never grey.
- A warm rim from the window glow, a Kuwahara brush, faint stroke texture, and punchy bloom.

**Open:**
- The owner picks a style or tunes one.
- The centre of overlapping pools still bleaches toward white.
- The floor light doesn't yet read as two window shapes.
- The Painted devour beat floods the scene red.
- The finish review and DESIGN.md wait until a style is chosen.

## Authored ink study (2026-10-15): `glass/ink-devour.html`

The 3D filter presets kept reading as a filtered render. The owner approved trying authored 2D art in the Darkest Dungeon ink direction, starting with one moment: Old Marrow devours Vesper.

**What it is**
- **Built by hand in code:** ink-drawn SVG art, with no 3D. The stone courses, vault ribs, deep reveals (shadow side solid black and cross-hatched), sills, hood mouldings, colonnette, stringcourse and perspective flagstones are all drawn this way. Lines get a hand wobble and tapered brush strokes. The palette is bone, umber and dried blood; the glass is the only saturated colour.
- **Glass:** the existing window art, with heavier lead and brightened. Each Aspect mask is painted into the glass, and the eyes glow.
- **Floor light:** each window is projected as a hard-edged shape: the window's own panes, lead and silhouette, cut into strips to approximate perspective, with stepped halo bands. Flat wedges of light run from each window down to its pool.
- **Beat:**
  1. Hush: an ink cloud passes and everything dims.
  2. Reveal: a brief freeze, a bone flash, a screen shake and a red flash. Marrow's sun flares; Vesper's glass cracks from the sun outward.
  3. Drag: Vesper's light slides into Marrow's pool and turns crimson, with crimson streaks along the floor. Vesper's glass greys, and the floor eye opens.
  4. The outcome lettering slams onto the floor.
  5. Marrow's five medallions pop one by one.
- **Layers, for speed:** the static ink is baked to two images, the floor light is drawn on one canvas blended over the floor, and a small live SVG holds the glass, medallions and lettering. Measured headless (software rendering): about 69 fps while animating and 177 when quiet. The 3D lab version ran at about 1.4.
- **Review links:** `?t=N&still` freezes any moment, `?still` shows the end, `?tune` opens 11 sliders with "Copy values", and `?fps` logs the frame rate.

**Open**
- The owner judges this frame against the 3D lab.
- The floor light still reads a little like a painted rug.
- The hush clouds are crude ellipses.
- Only the Devour moment exists.

**Update (2026-10-15, owner review):** "The look got worse but the feel is a hundred times more coherent." The environment stays as built. The owner found the glass and the outside lacking.
- **Locked tuner values** (now the defaults): `{"ink":0.4,"wobble":3.6,"hatch":0.24,"shaft":0.065,"pool":0.27,"halo":0.36,"glow":1.46,"shake":12,"hitstop":200,"flash":0.45,"speed":1.25}`.
- **Glass:** now the owner's locked stained-glass shader (`glassgl.js`, preset `locked`), which carries the sense of an outside behind the glass. The timeline drives it: Marrow's glass bleeds crimson and Vesper's dims. The ink crack is drawn over it. The Aspect masks come from an HTML multiply layer, because SVG blend modes can't reach a WebGL canvas. `?glass=flat` brings back the flat art.
- **Floor:** now the caustic floor light (`floorgl.js`, the owner's locked placement), with its drain beat running from Vesper into Marrow. The ink streaks and light shafts follow its pools. `?floor=flat` brings back the projected window shapes. A new "Caustic floor light" tuner slider defaults to 1.6.
- **Costs:** three WebGL contexts (two windows and the floor). Headless software rendering can't measure GPU frame rate. The page fades in once the shaders, stone and lettering are ready.

**Update 2 (2026-10-15, owner review):** the windows and environment are approved.
- **Clouds:** the clouds that read as iffy are now a lobed cloud passing *behind* the glass, inside the shader. `glassgl.js` gained a `uCloud` uniform and an `api.cloud(x)`; it defaults to off, so other mocks are unchanged.
- **Ink streaks:** the devour streaks didn't fit the caustics, so they're off whenever the caustic floor is on.
- **Fittings:** the ring is on a wall plate and the hourglass stands on the floor, and the floor eye is carved into the stone. All three are redrawn as wobbled ink objects that cast shadows, and live ink now uses the owner's weight from the start.
- **Masks:** toned to brown grisaille. The mask eyes are dim embers with a stepped flicker.
- **Medallions:** inset glass beads without the bulb glow.
- **Marrow's flare:** now comes from the shader's swell.
