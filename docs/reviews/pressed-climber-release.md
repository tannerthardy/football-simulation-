# Pressed climber at release: contact-law check (#164 follow-up)

Question (Run Game): when a climber leaves a double while still pressed on the
DL (mean centre distance < 0.9 yd over the last 0.3 s on the double), is the
pressed state a contact-law artefact? That would be soft contact or hand-joint
residue holding the bodies after release, or the release command never leaving
the DL's surface.

Answer: **no**. After release there is no joint, no engagement and no passive
contact residue. The bodies stay together because the DL keeps driving into the
climber, while the climber, asking to go along the DL's face, accelerates at
the same rate any climber does. The contact law transmits the DL's push
coherently and costs the climber little ground. The open questions are a DL
controller decision and the shared acceleration law, not contact.

## Native releases (requested vs achieved)

`scripts/diag/climb/pressed-release-native.mts`. The input is the saved
setups from the matched-restage captures for seeds 7 and 8 (one shift, 104
snaps). Every non-pass snap is replayed on develop `85952c95` with the
candidate profile (receipt `out/baseline/run-1793663503388-1214.json`, 27 s).
The sample is 129 `block_climb` releases: 55 pressed, 74 clear.

| first 0.3 s after release (medians) | pressed | clear |
|---|---|---|
| hand joint with the DL at release / at 0.2 s | 0% / 0% | 0% / 0% |
| climber still engaged with the DL at 0.2 s | 0% | 0% |
| behaviour request speed, final intent speed | 5.30, 5.30 | 5.53, 5.30 |
| final intent into the DL (cos), push | 0.00, 0 | 0.31, 0 |
| achieved speed | 1.65 | 2.04 |
| torso contact with the DL at any point, 0–0.3 s | 67% | 23% |
| …with a teammate / another opponent | 2% / 2% | 0% / 5% |
| distance to the DL at 0.3 s | 0.66 | 1.20 |
| 1.5 yd off the DL within 0.6 s | 16% | 46% |

The command leaves the DL's surface. Behaviour and final intent agree, and
the request runs along the DL's face (cos ≈ 0), not into it. Nothing
downstream (engagement, spacing, the snap guard) turns it toward him. The
first divergence is at the body: achieved speed is about 1.6 against a request
of 5.3. That gap is the same order for clear releases (2.0 vs 5.5), so the
achieved-speed gap is not a pressed-only effect.

Who keeps the contact? For the 37 pressed releases that stay in contact, the
DL's own leg request points at the climber (median cos 0.79, about
2.4 yd/s, push 1). It points away from the blocker he is still engaged with
(cos −0.34). All 37 DLs run the `rush` behaviour.

## Constructed scene (release friction)

`scripts/diag/climb/pressed-release-scene.mts`, 2 s. The scene has a released
climber and the DL he left, with everyone else parked and no engagement or
joint. They start in torso contact (0.70 yd apart, radius sum ≈ 0.69), squared
up. The climber asks for 5.8 yd/s along the DL's face, either tangent or
18° into him. Only the DL's command differs between arms. Columns show speed
at 0.3/0.6 s, distance at 0.3/0.6 s and climb progress at 0.6 s.

| start | arm | speed | distance | progress | impulse 0–0.3 s |
|---|---|---|---|---|---|
| at rest, tangent | no DL | 1.38 / 2.43 | – | 0.80 | 0 |
| | DL stands | 1.38 / 2.43 | 0.73 / 1.06 | 0.80 | **0** |
| | DL drives into him 2.4 | 1.53 / 2.64 | 0.65 / 0.66 | 0.74 | 147 |
| | DL drives away 2.4 | 1.38 / 2.43 | 0.96 / 1.73 | 0.80 | 0 |
| 0.45 yd/s into DL, 18° in | no DL | 1.56 / 2.58 | – | 0.79 | 0 |
| | DL stands | 1.21 / 2.32 | 0.65 / 0.82 | 0.69 | 81 |
| | DL drives into him 2.4 | 1.17 / 2.35 | 0.65 / 0.65 | 0.54 | 251 |

- **No residue.** A standing DL produces exactly zero impulse for a climber
  leaving tangentially from contact. His speed matches the no-DL control to
  two decimals. Impulse appears only when the climber's own momentum or
  request carries him into the DL. That is the normal response to his own
  push, and it costs 0.03–0.10 yd at 0.6 s.
- **The DL's drive keeps them together.** A DL driving at 2.4 yd/s stays at
  0.65 yd for the whole 0.6 s, because the climber's first 0.3 s of
  acceleration is slower than the DL's drive. The climber is not slowed: he
  is pushed along, at 1.53 vs 1.38 yd/s. He loses 0.06–0.25 yd of climb
  progress by 0.6 s.
- **Geometry alone keeps pressed releases close.** Even with a standing DL,
  a climber leaving along the face is still at 0.73 yd after 0.3 s and 1.06
  after 0.6 s. A distance threshold after release partly measures release
  direction and acceleration, not contact.

## What this hands back

1. **Defense or controller.** A double-teamed `rush` DL drives into the
   climber, not the blocker still on him, through the release. Whether that
   is the right read is a controller question: squeezing or grabbing the
   climber versus fighting the post blocker. The physics executes the request
   coherently.
2. **Movement.** All climbers reach about 1.4–2.0 yd/s in the first 0.3 s
   while asking for 5.3–5.8, pressed or not. In the free scene a lineman
   starting a 90° climb from rest reaches 1.38 yd/s at 0.3 s. Whether that
   start is too slow is the acceleration-law question (item b), with an NFL
   climber-start reference. It is not a contact question.
3. **No contact-law change is proposed.**
