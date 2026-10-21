# Exploratory helper-fit controller v1: retained adverse results

Source `d299a8970b93f956183106c87b9ed2d77be633701bf4fad2758ca95be36e7fc6`, against current parent `c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`. Four fixed native cases, roster seeds31/32 at strength0.55, Gun Doubles/Over/Cover3, snap seed3. Normal whistles, no rerolled seeds or artificial play endings.

| Case | Parent gain | V1 gain | Loaded helper ticks before→after | Wrong-surface ticks before→after |
|---|---:|---:|---:|---:|
| Draw right | 6.78 | 5.21 | 60→9 | 10→25 |
| Draw left | −0.23 | −1.83 | 0→0 | 9→9 |
| Inside Zone right | 3.11 | 1.24 | 32→32 | 14→14 |
| Inside Zone left | 2.38 | 0.76 | 30→12 | 7→6 |

Every observed/native-unrecorded pair matches complete tick state hashes (all bodies, submitted and executed intents, mind state including retained aim Maps, perception, joints, last-step report and RNG), final result and copied next RNG draw. Each source archive is hashed before and after the collection. The same initial body/profile/mind hashes match between components. The collection forwards every original `see` argument, including optional delayScale; one rejected collector-development trial accidentally dropped it and failed observer neutrality, so it is excluded from results.

## First meaningful forks

At1.25s in Draw right, the guard has a useful loaded surface: true surface dot0.92085, last hand normal force998.39 and tangent62.24. Current DTvelocity is(−0.542,+0.667), but the consumed0.25s picture extrapolates it to(39.0953,27.1639) with velocity(−3.015,−0.207). V1 treats that picture as an ineffective fit and changes desired velocity from(+2.889,−3.050) to(−4.390,−0.262). The resulting feet fight useful hand contact. The appropriate repair should respect locally acquired hand load/frame before replacing it with a stale visual forecast.

Inside Zone left has the same issue at0.85s: actual surface dot0.97689, normal force1057.86/tangent427.07, current DTvx+1.258 versus consumedvx−1.423. Desired velocity flips from(+2.777,+0.788) to(−2.772,−1.754) while the helper was contributing useful force.

Draw left differs. At1.00s the LT joins on an actually wrong surface(dot−0.12547) and has zero configured hand push/steer and zero achieved signed directional hand impulse. This persists through the mature joining phase1.15 and the end of the rep1.40. V1 first alters its request at1.25 when the dot has become−0.749; it requests(−5.846,−1.854) from a consumed DTpicture withvx−4.070, though actual DTvx is−1.672. The guard’s primary rep ends1.45. During the four corrective steps the LT moves only from(38.9406,29.2077) to(38.9017,29.1100), turningvx+0.2776 to approximately−0.6675. Actual relative surface worsens to−0.908. Ground impulse is about(−35.2,−7.3) perstep; support remains up/available1/xi0. There is no hand or torso load, no owner collision, and the achieved path remains outside the DTbody(radii sum0.6718 yd, closest achieved segment0.7026 yd). Existing acceleration limits simply cannot achieve requested high speed immediately. There is no reason to increase those capabilities merely to force success from a late choice.

These are not successful candidate mechanics. The next bounded controller should preserve an already useful loaded helper and detect ineffective joining earlier. Actual momentum, traction, body support and hand forces should determine whether correction is achievable. The negative Drawleft witness might remain a legitimate lost block even with improved choices; score improvement alone is not a readiness test.

## Reproduction

The collector imports a frozen archive, never the moving workspace:

```
node --import tsx out/helper-fit/helper-surface-review.ts out/run-fit-follow-up/final-source c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8 out/helper-fit/baseline.json.gz
node --import tsx out/helper-fit/helper-surface-review.ts out/helper-fit/candidate-v1 d299a8970b93f956183106c87b9ed2d77be633701bf4fad2758ca95be36e7fc6 out/helper-fit/candidate-v1.json.gz
python out/helper-fit/helper-surface-analysis.py out/helper-fit/candidate-v1.json.gz out/helper-fit/candidate-v1-analysis.json
python out/helper-fit/helper-surface-compare.py out/helper-fit/baseline.json.gz out/helper-fit/candidate-v1.json.gz out/helper-fit/comparison-v1.json
```
