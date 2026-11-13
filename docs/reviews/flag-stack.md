# Experimental flag stack on `claude/live-gaps` (all off by default)

What each flag is, who must review it, and the combined game result. Every
flag passed its own controlled panel and an 8+8 game A/B with all 12 guards.

| Flag | Layer | What it repairs | Review | Doc |
|---|---|---|---|---|
| `GAIT_STEP=0.3` | World gait (`kinematics.ts`) | moderate speeds approached on the sprint time constant; OL/RB ramps now match NFL | physics session | [gait step](gait-step.md) |
| `DL_FIGHT=1` | DL run-rep controller | down-blocked linemen rode the block off their gap | controller | [gait step](gait-step.md) |
| `PULL_STEP=1` | puller controller | puller dropped straight back and faced his backfield; timing now matches NFL | controller | [gait step](gait-step.md) |
| `HAND_MOTOR=1` | World hands | hands could only resist; now drive/shove within arm budgets | physics session | [hands plan](hands-plan.md) |
| `RUN_HANDS=1` | run blocker | drag hand on a committed defender | controller | [hands plan](hands-plan.md) |
| `DL_HANDS=1` | shedding defender | rip/push-pull past the blocker | controller | [hands plan](hands-plan.md) |
| `HAND_FIGHT=1` | hand control | ratings walk replaced by timing and leverage; neutral in games | controller | [hands plan](hands-plan.md) |
| `LEG_BRACE=1` | World support | thigh holds toppled runners instantly | physics session | [physics ideas](physics-ideas.md) 7 |
| `TACKLE_ROLL=1` | tackler controller | finish by rolling a bound runner | physics session (tackling) | [physics ideas](physics-ideas.md) 8-9 |
| `WRAP_BIND=1` | World grasp | secure wraps bind the runner's steps (codex) | physics session | [wrap binding](wrap-binding.md) |

## Combined (all but `HAND_FIGHT`), 8+8 games, rosters 101/202

| | Default | All flags | NFL |
|---|---|---|---|
| Run yards p25 / median | -0.08 / 1.56, 0.31 / 2.09 | 0.05 / 1.97, 0.31 / 2.21 | 1.0 / 3.0 |
| Yards after contact, median | 1.18 / 1.44 | 1.68 / 1.78 | 2.4 |
| Live 0.8 s after contact | 0.40 | 0.61 | 0.83 |
| OZ OL / DL / LB lateral at 3 s, yd | 3.5 / 2.3 / 3.8 | 5.1 / 3.4 / 4.4 | 7.5 / 7.2 / 7.6 |
| Puller time to point of attack, s | 2.4 | 2.0 | 1.9 |
| Engaged DL depth at 1.0 s (OZ / IZ / gap) | | 0.50 / 0.65 / 0.40 | 0.27 / 0.47 / 0.32 |
| Stuff rate; 10+ yd runs | 0.42 / 0.37; 0.14 / 0.10 | 0.42 / 0.37; 0.12 / 0.11 | |
| Guards | ok / ok | ok / ok | |

Every mechanism measure moves toward NFL tracking; long runs do not inflate.
Largest remaining gaps: gap-run defenders do not flow to the play (DL -0.5 yd
at 3 s vs NFL +2.2, backers +0.6 vs +4.4), zone flow is still two-thirds of
NFL, and runners are still stopped sooner after contact (live 0.61 vs 0.83 at
0.8 s).

Reproduce: `sh scripts/diag/runblock/ab.sh allx GAIT_STEP=0.3 DL_FIGHT=1
PULL_STEP=1 HAND_MOTOR=1 RUN_HANDS=1 DL_HANDS=1 LEG_BRACE=1 TACKLE_ROLL=1
WRAP_BIND=1`, then `python3 -I scripts/diag/runblock/summary.py fin0 allx`.
