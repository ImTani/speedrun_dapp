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
