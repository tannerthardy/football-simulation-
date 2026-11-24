"""Summarise pad-gap.mts output. python3 -I scripts/diag/blocking/pad_gap_report.py out/p0/pad-gap-*.json"""
import json, sys
import numpy as np
R = []
for f in sys.argv[1:]: R += json.load(open(f))
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
print(f'{len(R)} samples (one per pair per age)')
for kind in ('pass', 'run'):
    print(f'\n## {kind}: defender pad height minus blocker pad height (yd; negative = the defender is lower), by pair age')
    print('| age s | pairs | gap p10 / 25 / 50 / 75 / 90 | defender lower by > 0.05 yd | level (within 0.05) | blocker lower by > 0.05 | lift (share of body weight) blocker p50 / defender p50 | blocker posture p50 | defender posture p50 |')
    print('|---|---|---|---|---|---|---|---|---|')
    for age in (0.3, 0.6, 1.0, 1.5):
        S = [r for r in R if r['kind'] == kind and r['age'] == age]
        if not S: continue
        g = np.array([r['dPad'] - r['bPad'] for r in S])
        print(f"| {age} | {len(S)} | {q(g,10):.2f} / {q(g,25):.2f} / {q(g,50):.2f} / {q(g,75):.2f} / {q(g,90):.2f} | {np.mean(g < -0.05):.2f} | {np.mean(abs(g) <= 0.05):.2f} | {np.mean(g > 0.05):.2f} | {q([r['bLift'] for r in S],50):+.2f} / {q([r['dLift'] for r in S],50):+.2f} | {q([r['bPost'] for r in S],50):.2f} | {q([r['dPost'] for r in S],50):.2f} |")
print('\n## What decides the gap (1.0 s samples, all plays): correlation of the gap with each man\'s ratings-derived inputs, and the posture each reaches')
S = [r for r in R if r['age'] == 1.0]
g = np.array([r['dPad'] - r['bPad'] for r in S])
for k, lab in (('dBend', 'defender bend'), ('bBend', 'blocker bend'), ('dStr', 'defender power/mass'), ('bStr', 'blocker power/mass'), ('dKg', 'defender mass'), ('bKg', 'blocker mass')):
    x = np.array([r[k] for r in S]); print(f'  corr(gap, {lab}) = {np.corrcoef(g, x)[0,1]:+.2f}')
for kind in ('pass', 'run'):
    for who, key in (('blocker', 'bPost'), ('defender', 'dPost')):
        v = [r[key] for r in R if r['kind'] == kind and r['age'] == 1.0]
        h = np.histogram(v, bins=[0, .2, .4, .6, .7, .8, .9, 1.01])[0]
        print(f'  {kind} {who} posture at 1.0 s histogram [<.2,.2-.4,.4-.6,.6-.7,.7-.8,.8-.9,.9+]: {list(map(int,h))}')
print('\nBy slot (1.0 s): defender posture p50 / blocker posture p50 / gap p50 (n)')
slots = {}
for r in S: slots.setdefault((r['kind'], r['dPos']), []).append(r)
for (k, s), v in sorted(slots.items()):
    if len(v) >= 15: print(f"  {k} {s}: {q([r['dPost'] for r in v],50):.2f} / {q([r['bPost'] for r in v],50):.2f} / {q([r['dPad']-r['bPad'] for r in v],50):+.2f} ({len(v)})")
