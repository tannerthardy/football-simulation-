# Shed moves: why a defender who tries to get off a run block stays on it

Main Engine, 2026-11-06. Develop `9a19ced9`, matched-restage captures for
seeds 7–8 (`b5cf5276`, `87ebf3d8`), restage environment `54199f26`, 104 run
plays. No engine change is proposed here. Three repair attempts did not move
who gets off the block, so this records the diagnosis and the rejected
patches.

## Question

Defense's shed operator (`_shedtrace.mts`) says that of the DL a carrier
passes near, 40% tried to shed and were still blocked a second later (LB 51%).
NFL defenders get off every blocker within 1 s more often: DL 25% vs sim 16%,
LB 36% vs 31%. Is the defender held (a grab), coupled by the hands, or asking
for something his body cannot do?

## What holds him

`_shedhold.mts` samples every tick a DL or LB is tagged `shed-attempt` and
still engaged (7358 samples, 389 attempt windows).

- **Not holding.** The hand joint pulls him back in only 8% of samples, the
  grab capacity is zero at the median, and 3 holding fouls were called on
  104 runs.
- **The hands couple him sideways.** Steering force is at 90% of its limit
  or more in 65% of samples. Measured against the blocker, he asks for
  2.89 yd/s and gets 0.47.
- **The blocker usually wins the hands.** Control is +0.26 at the median
  (positive means the blocker controls). The defender controls in 30% of
  samples.
- **Stuck samples point at the blocker.** Requests over 1 yd/s average
  3.39 yd/s, and he achieves 1.20 along them. Splitting the samples by how
  much of his request he achieves:

  | | Achieves < 50% (61%) | Achieves ≥ 50% (39%) |
  |---|---|---|
  | Request within 60° of straight into the blocker | 46% | 23% |
  | Request cosine into the blocker, median | 0.40 | −0.13 |
  | Blocker's speed along his request | −0.02 | 2.04 |
  | Hand normal / tangent load, body weights | 0.66 / 0.24 | 0.55 / 0.21 |
  | Torso contact present | 16% | 14% |

  - The forces on him are about the same in both groups.
  - What differs is where he is asking to go. The work-off request is set in
    the planned contact-surface frame (`workLat · side · lateral + axis ·
    0.6`), not from where the blocker actually is. When the blocker has slid
    onto the side the defender wants, that request runs into his chest.

## Attempts that did not move who gets free

Each was an A/B on the same captures with the same operators.

| Attempt | What it does | Result |
|---|---|---|
| `HAND_FRICTION` (World) | Passive hand steering bounded by `0.6 ×` the arm compression plus the grab | LB made the play 27% → 37% and saturated steering 65% → 37%. DL unchanged (40% → 39% still held). Breaks 41 fast tests (below). |
| `SHED_GRIP` (controller → joint) | While a defender who controls the hands works off, only the blocker's remaining grip, `armForce(b) · 0.15 · (1 + c)`, couples them sideways | No change: DL still held 40%, LB 51% → 53%, freed within 1 s 45% → 48% |
| `SHED_AROUND` (controller) | With hands loaded, a work-off request more than 0.3 into the blocker becomes a request round his near shoulder on the chosen side, still pressing 0.6 yd/s into him | It does fix the request: stuck-sample cosine into the blocker 0.40 → 0.11, and he achieves 1.20 → 1.54 yd/s along it. But the blocker follows (0.79 → 1.02 yd/s along it). Freed within 1 s stays 45%. DL still held 40% → 43%, LB 51% → 59%. |

- **Why `HAND_FRICTION` is not a fix.** The 41 failures include the hand
  laws themselves: `hand-force-point`, `hand-comoving`,
  `hand-angular-transfer`, and `world-physics` "steering through latched
  hands moves the opponent". Those tests assume latched hands can steer a
  man who is not pressing into them.
  - That is legal football. Run blockers grab cloth inside the frame, and
    it is called holding only when the grab turns or restricts the man
    outside the frame.
  - So friction-only steering removes a real capacity rather than repairing
    one. A grip is defeated by a hand move, not by the absence of
    compression.
- **What `SHED_GRIP` and `SHED_AROUND` show together.** The controlling
  hands are the blocker's 70% of the time, and when the request is made
  feasible the blocker mirrors him.
  - Nothing in a run rep takes the blocker's hands off. In pass reps a
    landed rip, swim or club cuts steering to 10% for its window, and swim
    and spin cut push to 20% (`setHands`, `inMove`).
  - Run reps have no such move. The hand fight there only relaxes `control`
    toward the share of hand leverage each player has (`handFight`).

## Next mechanism (not built)

A run-rep hand move that attacks the blocker's hands:
- a swipe or rip against the blocker's punch, timed off the defender's
  decision to work off;
- its window clears the blocker's steering the way a landed pass-rush move
  does;
- combined with `SHED_AROUND`'s request, so the clear is used to go round
  the shoulder rather than into the chest.

The open design question is how the move lands without a rolled award.
- The pass rep compares `swipe = hands + 0.15·bend + noise` against the
  blocker's punch.
- A physical version would let the defender's hand impulse act on the
  blocker's arms through the existing strike channel (`world.strike`, which
  the club already uses). It would land when the blocker's hand joint is
  actually knocked out of its working range.

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
# from a develop 9a19ced9 checkout, captures in <cap> as seed7-run.json, seed8-run.json
env $(cat restage-env.txt) node --import tsx scripts/diag/_shedhold.mts <cap> 7 8
env $(cat restage-env.txt) node --import tsx scripts/diag/_shedtrace.mts <cap> 7 8
```

`_shedexit.mts` is the exit-geometry companion (Defense's split by
touching, turned under or over 90°). The rejected patches are described
above. Each is a few lines, and the `HAND_FRICTION` World edit is at the
hand row's `solveTangent` call.
