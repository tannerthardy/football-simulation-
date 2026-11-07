# Tackle finish after line-level contact

Main Engine, 2026-11-06; operator corrected 2026-11-07. Measured on #412's
head (`22cfc71b`, develop `9a19ced9` + `ONE_ARM_HOLD`) and on develop
`9a19ced9`. Matched-restage captures for seeds 7–8, restage environment
`54199f26`. No engine change is proposed here.

## Question

At line-level contact, sim carriers stop faster than NFL carriers, and the
play ends sooner. Is that the tackle bond (the front tackler's drive-through,
the plant brake), the contact physics, or how the back arrives?

## Same operator on both (corrected 2026-11-07)

The first version of this review did not use the same operator on both
sides. The sim side (`_finish.mts`) read instantaneous body velocity and the
first near defender in array order. The NFL side used central differences of
positions over ±0.1 s and the nearest defender. Those rows are kept below as
legacy output.

Now one Python operator, `scripts/mechanics/finish_reference.py`, reads both
sources:
- NFL 2022 tracking, through `run_film_reference.py`;
- sim dumps from `scripts/diag/_finishdump.mts`, at the same 0.1 s frames.

In both:
- first contact is the first frame a defender's centre is within 1.0 yd of
  the carrier, with the carrier within 2 yd of the LOS;
- speeds are central differences over ±0.1 s;
- the toucher is the nearest defender.

| | NFL (4328) | Sim, #412 `22cfc71b` (77) | Sim, develop `9a19ced9` (78) |
|---|---|---|---|
| Carrier speed at contact | 4.31 | 4.73 | 4.38 |
| +0.1 / +0.3 / +0.5 s | 4.06 / 3.55 / 3.07 | 3.85 / 3.04 / 2.42 | 3.60 / 2.58 / 2.17 |
| Squareness of the contact, p50 | 0.38 | 0.60 | 0.59 |
| Square (cos > 0.8) | 22% | 27% | 26% |

By squareness, #412 stack:

| | NFL: contact → +0.3 s | NFL loss | Sim: contact → +0.3 s | Sim loss | Sim n |
|---|---|---|---|---|---|
| Glancing (cos < 0.3) | 4.71 → 4.07 | 0.61 | 4.23 → 3.50 | 0.20 | 26 |
| Angled (0.3–0.8) | 4.20 → 3.43 | 0.72 | 4.77 → 3.57 | 1.18 | 30 |
| Square (> 0.8) | 3.71 → 2.90 | 0.81 | 4.41 → 1.94 | 2.16 | 21 |

- **Square contacts cost sim backs much more speed** than NFL backs:
  2.16 vs 0.81 yd/s by +0.3 s.
- **NFL backs arrive slower the squarer the contact.** Sim backs don't show
  that pattern. With the corrected operator, they do not speed up into square
  contacts (4.41 vs 4.23 glancing). The old "5.37 at square contacts" row is
  withdrawn.
- **Samples are small:** 20–31 sim contacts per bin, seeds 7–8 only.
- **Time to the end isn't comparable:** NFL tracking runs past the whistle.

## Force split (corrected window)

The first version added the contact tick's own impulses on top of a velocity
taken after that tick. That made five impulse steps against four velocity
steps. Now the velocity v0 is taken after the contact tick, and only the four
following steps (+0.05…+0.20 s) are added, against v(+0.20) − v0.

Means along his travel, yd/s, `_finish.mts`:

| | Change | His legs | Grasp joints | Rest (all other contact) | n |
|---|---|---|---|---|---|
| #412 stack | −1.36 | +0.42 | −0.44 | −1.34 | 78 |
| Develop | −1.58 | +0.43 | −0.66 | −1.35 | 79 |

"Rest" is everything not attributed to ground or grasp joints. That includes:
- torso contacts with the toucher;
- other bodies, such as a blocker still engaged with the toucher;
- blockers' hand joints.

So it cannot isolate body impact from the toucher. It shows only that more
of the braking comes from non-grasp contact than from wraps.

The drive-through counterfactual stands as measured. With the in-front
tackler's −2.5 yd/s request set to 0, the in-front branch's speed at +0.3 s
was 2.98 vs 3.09 (old operator). It is a within-sim comparison.

## Reading (limits)

- Square contacts cost the sim back more speed than in the NFL. Sim backs do
  not slow for square contacts the way NFL backs do. Both are measured with
  one operator.
- **Candidates, not shown as causes:** how the back arrives (Run Game), and
  how much a square body contact transfers.
  - The force split cannot tell those apart.
  - The plastic-collision comparison used the toucher alone and is not a
    bound on everything in contact.
- No physics change follows from this review.
- The sim rows depend on pending #412 (`22cfc71b`) for the main table. The
  develop column is the accepted base.

## Legacy (first version, 2026-11-06)

### Legacy rows (superseded operator, kept as output)

- First contact is the first frame a defender's centre is within 1.0 yd of
  the carrier, with the carrier within 2 yd of the LOS (`gang.py`'s event).
- Speeds are from 0.1 s central differences.
- Sim: `scripts/diag/_finish.mts`. NFL 2022: `scripts/mechanics/finish_reference.py`
  through `run_film_reference.py`.

| | NFL (4328) | Sim (78) |
|---|---|---|
| Carrier speed at contact | 4.31 | 5.00 |
| +0.1 / +0.3 / +0.5 s | 4.06 / 3.55 / 3.07 | 3.87 / 3.15 / 2.48 |
| Time to the end, p50 | 1.90 s | 1.05 s |
| How square the contact is (cos of carrier velocity vs direction to the toucher), p50 | 0.38 | 0.64 |
| Square (cos > 0.8) | 22% | 36% |

- NFL tracking ends after the whistle, so the time-to-end gap is partly how
  each source ends a play. The speed columns are the cleaner comparison.

**By how square the contact is:**

| | NFL: speed at contact → +0.3 s | NFL loss | Sim: speed at contact → +0.3 s | Sim loss |
|---|---|---|---|---|
| Glancing (cos < 0.3) | 4.71 → 4.07 | 0.61 | 4.12 → 4.31 | −0.10 |
| Angled (0.3–0.8) | 4.20 → 3.43 | 0.72 | 5.18 → 3.32 | 1.17 |
| Square (> 0.8) | 3.71 → 2.90 | 0.81 | 5.37 → 2.11 | 2.55 |

- NFL backs arrive slower the more square the contact: 4.71, 4.20, 3.71.
  They slow down for a man in front of them and keep speed past a man
  beside them.
- Sim backs do the opposite (4.12, 5.18, 5.37). They hit square contacts at
  full speed.

### Legacy force split

- **Body impact, not the wrap.** Over the first 0.2 s, along his travel
  (means, yd/s):
  - change −1.36;
  - his legs +0.51;
  - grasp joints −0.48;
  - torso and hand contacts −1.39.
- **The front tackler's drive-through request does not matter.** With the
  in-front branch's `−2.5` yd/s drive request set to 0, the in-front speed at
  +0.3 s is 3.09 vs 2.98, and time to the end is 0.90 vs 0.85 s.
- **The square hit is a plastic collision, which is what it should be.**
  - Square contacts: carrier 98 kg, toucher 117 kg (p50).
  - Common velocity of a perfectly plastic collision with the toucher alone:
    2.34 yd/s p50. Achieved: 3.04 at +0.1 s and 2.11 at +0.3 s.
  - 39% end below the plastic bound by +0.3 s. That is the toucher's own
    legs, or a blocker still on him, adding to the stop.
  - The World is not braking him beyond momentum.

Run Game's 12-seed sample (Run Game session, 2026-11-06, 235 OZ/WZ
contacts) agrees:
- one tackler in front is the dominant case (105 runs: +0.3 s speed 2.55,
  play over 0.75 s after contact);
- several of the most abrupt cases start slow with a large lateral request,
  which is Run Game's carrier control.

### Legacy conclusion (withdrawn)

The fast finish is mostly the back's decision, which belongs to the carrier
controller (Run Game).
- He arrives at square contacts at full speed, where NFL backs gather.
- Momentum then does what it should.

This is not a reason to soften contacts or the bond: that would make a
full-speed head-on hit cheaper than it is.

Open for Main Engine:
- Run Game's full-speed falls within 0.3 s (s7-40, s23-72, s19-37, s13-58 on
  their recapture) are the balance side. Each needs one look at whether the
  fall follows from the hit and his base, before any change.
- NFL centre tracking cannot tell a torso hit from an arm tackle at 1.0 yd.
  So "NFL square contacts lose 0.81" may include contacts that are not body
  on body yet. That is a limit of the operator, not a target.

## Reproduce

`restage-env.txt` is built from committed files, not taken from a private
path. Its contents are the `flags` of `config/baseline.json` at develop
`9a19ced9`, in file order, nulls dropped (`CF_FLOW`), joined as `K=V` with
spaces and a trailing newline. That gives sha256
`54199f265835db49668516501399b59dd4c29ce3b4d43ac28e2bde09d7ae9d6c`:

```sh
git show 9a19ced9:config/baseline.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const f=JSON.parse(s).flags;process.stdout.write(Object.entries(f).filter(([k,v])=>v!==null).map(([k,v])=>k+"="+v).join(" ")+"\n")})' > restage-env.txt
```

The seed 7–8 captures (`seed7.json` sha256
`b5cf5276ba1f3efe616994e3fc3af02da78899308f4b6616a4acddbf3525a7ba`,
`seed8.json` `87ebf3d8ddd1d93b8a32f3dadf24bbf52121a8269ec5b9ae17dd84234b76c27f`)
regenerate byte for byte. Use develop `15d7e8a0` with no flags, run
`node --import tsx scripts/diag/matched-restage.ts capture 7` (and `8`), and
copy or link `seedN.json` as `seedN-run.json` for the tools that read that
name. Node 22.23.3.


```sh
env $(cat restage-env.txt) node --import tsx scripts/diag/_finishdump.mts <cap> 7 8 > finish-sim.jsonl
python3 -I scripts/mechanics/finish_reference.py scripts/mechanics/run_film_reference.py out/mechanics/nfl-plays.jsonl.gz finish-sim.jsonl
env $(cat restage-env.txt) node --import tsx scripts/diag/_finish.mts <cap> 7 8   # force split
```
