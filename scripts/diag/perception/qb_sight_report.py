"""Summarise qb-sight.mts output. python3 -I scripts/diag/perception/qb_sight_report.py out/p0/qbsight-*.json"""
import json, sys, collections
import numpy as np
R = []; plays = 0
for f in sys.argv[1:]:
    d = json.load(open(f)); R += d['rows']; plays += d['plays']
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
role = lambda s: 'CB' if s.startswith('CB') else 'NB' if s.startswith('NB') else 'S' if s[:2] in ('FS', 'SS') or s.startswith('S_') else 'LB'
print(f'{plays} pass plays (non-screen), {len(R)} defender-ticks (0.3 s to the release)')
print('\n## Picture age (s) and line-of-sight state, by defender kind and time since snap (p25 / p50 / p75 of age; share not clear now)')
print('| kind | t | n | age p25 / p50 / p75 | share blocked now |'); print('|---|---|---|---|---|')
for k in ('CB', 'NB', 'S', 'LB'):
    for t in (1.0, 1.5, 2.0, 2.5):
        S = [r for r in R if role(r['slot']) == k and abs(r['t'] - t) < 0.026 and r['age'] is not None]
        if len(S) < 20: continue
        a = [r['age'] for r in S]
        print(f"| {k} | {t} | {len(S)} | {q(a,25):.2f} / {q(a,50):.2f} / {q(a,75):.2f} | {np.mean([not r['clear'] for r in S]):.2f} |")
print('\n## Perimeter defenders (CB/NB 6+ yd wide of the passer, 0-7 yd deep): age by whether the line is clear now')
S = [r for r in R if role(r['slot']) in ('CB', 'NB') and r['width'] >= 6 and r['depth'] <= 7 and r['age'] is not None and 0.8 <= r['t'] <= 2.4]
for lab, sel in (('clear now', [r for r in S if r['clear']]), ('blocked now', [r for r in S if not r['clear']])):
    a = [r['age'] for r in sel]
    print(f"  {lab}: n {len(sel)}, age p25/50/75/90 {q(a,25):.2f}/{q(a,50):.2f}/{q(a,75):.2f}/{q(a,90):.2f}")
print(f"  share of perimeter ticks with the line blocked: {np.mean([not r['clear'] for r in S]):.2f}")
c = collections.Counter(b for r in S if not r['clear'] for b in (r['blockers'] or ['(none by the test: aged on memory)']))
print('  who blocks (count of blocked ticks involving each):'); [print(f'    {k}: {v}') for k, v in c.most_common(12)]
n_none = sum(1 for r in S if r['clear'] and r['age'] > 0.5)
print(f"  ticks with the line CLEAR now but the picture older than 0.5 s: {n_none} of {sum(r['clear'] for r in S)} clear ticks (a picture aged by memory after a blackout, or the observation delay)")
print('\n## Blocked-run length (consecutive ticks blocked) for perimeter defenders, seconds p50 / p90 / max')
byp = collections.defaultdict(list)
for r in sorted(S, key=lambda r: (r['play'], r['slot'], r['t'])): byp[(r['play'], r['slot'])].append(r)
runs = []
for L in byp.values():
    run = 0
    for r in L:
        if not r['clear']: run += 1
        else:
            if run: runs.append(run * 0.05)
            run = 0
    if run: runs.append(run * 0.05)
print(f"  n runs {len(runs)}: p50 {q(runs,50):.2f} / p90 {q(runs,90):.2f} / max {max(runs) if runs else float('nan'):.2f}")

print('\n## Perimeter defenders: what the single head-point ray decides, against a body-wide target (shoulder height, or the head shifted 0.2 yd either side)')
if S and 'clearAny' in S[0]:
    print(f"  head ray blocked: {np.mean([not r['clear'] for r in S]):.3f}; also blocked to the shoulder: {np.mean([not r['clear'] and not r['clearShoulder'] for r in S]):.3f}; blocked to the shoulder AND both sides of the head: {np.mean([not r['clearAny'] for r in S]):.3f}")
    allp = [r for r in R if role(r['slot']) in ('CB', 'NB', 'S', 'LB') and 0.8 <= r['t'] <= 2.4]
    print(f"  all defenders (0.8-2.4 s): head ray blocked {np.mean([not r['clear'] for r in allp]):.3f}, fully blocked {np.mean([not r['clearAny'] for r in allp]):.3f}")
