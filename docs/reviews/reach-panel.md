# Four-scenario reach panel (diagnostic)

`scripts/diag/runblock/reach-panel.ts` (`TRACE=scenario:entry:run` prints a rep).
One guard on a wide-zone reach (production `stepRunRep`, stretch path, real
hand joint and World) against a play-side shaded tackle whose feet are
scripted: anchor, flow play side, slant across the inside shoulder, penetrate
upfield; entry speeds 0 and 2 yd/s; mirrored; plus an inside-zone drive block
against an anchoring tackle. Every pair is exactly mirror-symmetric. Results
with `GAIT_STEP=0.3` (1.5 s):

| Defender | Outcome |
|---|---|
| Anchors | Blocker gets his head across (+0.75 yd) and seals him; no displacement. |
| Flows play side | Blocker runs with him at ~5 yd/s and stays connected (the drag/"run him past the hole" outcome). |
| Slants inside | Defender gains 2.1-2.5 yd inside and up to 1.8 yd deep; the blocker goes with him. |
| Penetrates with a running start | 3.1 yd into the backfield. |
| Drive control | Inside-zone drive moves an anchoring tackle back 0.9 yd. |

So against flow and anchor the reach behaves; the slow engaged flow in games
comes from what the defender asks for, not the blocker. The failures are the
slant and the penetrator.

**Penetrator trace.** The anchor (lost depth) engages and the blocker braces
upfield, but the pair is still driven back at about 0.9 yd/s for 0.7 s. When the
blocker's backward motion stops, the anchor condition (`drivenBack > 0.15`)
switches it off although about 1,000 of load still drives into his backfield;
he resumes lateral reach work and the tackle runs past him. Two attempts did
not repair it and were removed:

1. No deliberate give-ground in the stretch forward term: no change (the
   blocker was not asking to retreat; he was being driven).
2. Anchor hysteresis (stay anchored while the backfield load lasts): turns
   every reach into a drive block (vs the anchor he never gets across), loses
   the flow rep, and the penetrator still gets 3.0 yd.

Diagnosis for the next attempt: a blocker cannot redirect a penetrator
("slingshot") or turn a slanting man, because hands only restrain (hand steer
is slip restraint) and leg drive acts only along the line between the bodies.
That needs bounded active tangential hand force at a real contact point,
which belongs to the hands law (physics session; the `HANDS2` experiment).
