"""BALL_DRAG off vs on, same games: the ball's speed at the catch roll (actual run, catch_tap rows) and the pass outcomes per throw (outcomes.mts).
  python3 -I scripts/diag/ball/drag_cards.py OFF_TAP.jsonl ON_TAP.jsonl OFF_OUTCOMES.json ON_OUTCOMES.json [--out report.md]
Catch-roll rows: the target's first roll of each pass (`first`), the 3-D ball speed at the roll (`ballSpeed`, the number catching.ts compares with 24 yd/s), the roll's pCatch and result. Uncontested = no defender within the contest radius and not deflected.
Drop = an uncontested first roll lost. Outcomes: completions, incompletions, pass breakups, interceptions and sacks per pass play; same seeds both arms, so the plays diverge once the ball flies differently (a different arrival time at the catch)."""
import json, sys
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
rows = [[json.loads(l) for l in open(p)] for p in args[:2]]
out = [json.load(open(p)) for p in args[2:4]]
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
L = []; P = L.append
P('## Ball speed at the catch roll, and outcomes per throw: BALL_DRAG off vs on (same seeds)\n')
P('| arm | target first rolls | ball speed at the roll p10 / p50 / p90 (yd/s) | share over 24 yd/s | mean pCatch | rolls won | uncontested rolls | uncontested drops (lost) | drop rate |'); P('|---|---|---|---|---|---|---|---|---|')
for lab, R in zip(('off', 'on'), rows):
    F = [r for r in R if r['first']]
    sp = np.array([r['ballSpeed'] for r in F]); unc = [r for r in F if not r['contested'] and not r['deflected']]
    drops = sum(1 for r in unc if not r['won'])
    P(f'| {lab} | {len(F)} | {q(sp, 10):.1f} / {q(sp, 50):.1f} / {q(sp, 90):.1f} | {np.mean(sp > 24):.3f} | {np.mean([r["pCatch"] for r in F]):.3f} | {np.mean([r["won"] for r in F]):.3f} | {len(unc)} | {drops} | {drops / max(1, len(unc)):.3f} |')
P('')
P('Ball speed at the roll by the time the ball was in the air (`tAir`, s) for the target\'s first roll:\n'); P('| flight | n off / on | speed p50 off / on | share over 24 off / on |'); P('|---|---|---|---|')
for lo, hi in ((0, 0.8), (0.8, 1.2), (1.2, 1.8), (1.8, 9)):
    c = []
    for R in rows:
        F = [r for r in R if r['first'] and lo <= r['tAir'] < hi]; sp = np.array([r['ballSpeed'] for r in F]); c.append((len(F), q(sp, 50), float(np.mean(sp > 24)) if len(sp) else float('nan')))
    P(f'| {lo}-{hi} | {c[0][0]} / {c[1][0]} | {c[0][1]:.1f} / {c[1][1]:.1f} | {c[0][2]:.2f} / {c[1][2]:.2f} |')
P('')
P('Pass outcomes per throw (all coverage families together; sacks and scrambles excluded from the throw count):\n'); P('| arm | throws | complete | incomplete (no break-up) | pass breakup | interception |'); P('|---|---|---|---|---|---|')
for lab, O in zip(('off', 'on'), out):
    tot = {}
    for fam, t in O.items():
        for k, v in t.items(): tot[k] = tot.get(k, 0) + v
    th = sum(tot.get(k, 0) for k in ('comp', 'inc', 'pbu', 'int'))
    P(f'| {lab} | {th} | {tot.get("comp", 0) / th:.3f} ({tot.get("comp", 0)}) | {tot.get("inc", 0) / th:.3f} ({tot.get("inc", 0)}) | {tot.get("pbu", 0) / th:.3f} ({tot.get("pbu", 0)}) | {tot.get("int", 0) / th:.3f} ({tot.get("int", 0)}) |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
