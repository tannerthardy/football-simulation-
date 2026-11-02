# #164: double-team climbers after release (Main Engine diagnosis)

Question (Run Game): after a combo release, the climber asks for 3–5 yd/s
and achieves 1.3–1.6. Is it traction, turning, or a lingering contact?

**Answer: none of those is a physics limit. Two controller behaviors.**

## Captures
Run-only captures from the `run-game/overlay` `matched-restage.ts capture <seed> --run-only`:
- #390 head `911d170d`: seeds 7 and 9.
- develop `15d7e8a0`: seed 7.

A release is a tick where an OL/TE plan target changes from a DL to a backer
before 3 s. Releases are kept at t < 2.5 s, with 0.4 s of trace.

## Physics checks (both trees)
- **Feet:** ground force is 45–80% of the friction limit; never saturated.
- **Locomotion:** the plan asks for 5.1–5.3 yd/s² toward the request. That is
  at or above the isotropic start cap, and above NFL linemen's p90 start of
  2.8 yd/s².
- **Hand or grasp joints on the climber after release:** none.
- **With a steady request and clear of the DL,** climbers reach
  2.0–2.1 / 2.3–2.5 / 2.5–2.6 yd/s at +0.1 / +0.3 / +0.5 s. NFL climbers
  (Run Game's `ctrdbl.py`) move 2.1–2.4 yd/s from leave + 0.3 s.

## The two slow groups

| Group (186 releases, #390 seeds 7+9) | Share | Speed at +0.1/0.3/0.5 s |
|---|---|---|
| Clear of the DL, steady request | 46% | 1.91 / 2.29 / 2.54 |
| Clear, request flips > 60° between ticks | 34% | 1.75 / 1.62 / 1.58 |
| Torso contact for ≥ half of 0.4 s, steady | 13% | 1.52 / 1.77 / 2.26 |
| Contact, and flips | 6% | 1.69 / 1.73 / 1.91 |

Develop seed 7 (114 releases): steady clear 2.14 / 2.49 / 2.58; flips 30%
(2.0 / 2.16 / 2.22); contact 25%.

1. **The climb request oscillates (Run Game, `blocking.ts`).**
   - In 40% of releases the requested heading jumps more than 60° from one tick
     to the next. Examples:
     - #390 seed 7, index 36, LT: −34° → +27° → −159° → −175° → +1° over
       0.35 s;
     - index 46, C: −29° → +98° → +160° → +118° → −18°.
   - The plan and target stay the same (climb/LB_M → climb/LB_M in 96 of 117
     flips).
   - **About half (48 of 107) happen within the released man's contact
     range.** There `offReleasedHip` projects out the into-DL component and
     restores the full speed on what is left. When the request points nearly
     straight into the DL, what is left is tiny and its side flips. The other
     half happen clear of the hip, where the shoulder choice in `climbRoute`
     (`direction = sign(turn)`, recomputed each read) is the next suspect.
   - The body follows each new request at about 5 yd/s² and undoes its own
     progress.
2. **The released DL keeps driving at the man who left (Defense, DL run
   rep).**
   - In 30 of 37 contact cases (#390) and 21 of 29 (develop), the DL's request
     points at the departed climber at about 2 yd/s, with push 1 and about
     6–8 yd/s² of leg force toward him.
   - The torso contact cancels most of the climber's drive for about 0.3 s.
     Example: #390 seed 7, index 33, LT: legs +5–8, contact −4–7 yd/s².
   - In 15 of 37, the climber's own request also keeps more than 0.5 yd/s
     into the DL.

## Tools
Each script takes `<worktree> <seed> ...` and needs the capture in
`<worktree>/out/matched-restage/seed<N>-run.json`.

- `climbtrace.mts <wt> <seed>`: every release, as JSON rows (speeds,
  requests, contact, DL request and leg force along the contact normal,
  flips).
- `envelope.mts <wt> <seed> <index> <slot> <t0> <t1>`: per tick, the
  locomotion envelope against the ground and contact accelerations.
- `pair.mts <wt> <seed> <index> <climber> <dl> <t0> <t1>`: who pushes whom
  along the contact normal.
