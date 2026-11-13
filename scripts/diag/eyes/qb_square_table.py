"""Summarise nfl_qb_square.py / qb-square.ts rows: per 0.1 s before the release, the angle from the QB's facing to the
target and to the catch point (p25/p50/p75) and the share within 30 and 45 deg; by time-to-throw band.
   python3 -I scripts/diag/eyes/qb_square_table.py nfl=out/eyes/nfl.jsonl sim=out/eyes/sim.jsonl"""
import json, sys
def q(v):
    v = sorted(v); return '/'.join(f'{v[int(p * (len(v) - 1))]:.0f}' for p in (.25, .5, .75)) if len(v) >= 5 else '-'
arms = {a.split('=')[0]: [json.loads(l) for l in open(a.split('=')[1])] for a in sys.argv[1:]}
for band, lo, hi in (('all', 0, 99), ('TTT < 2.3 s', 0, 2.3), ('TTT >= 2.3 s', 2.3, 99)):
    print(f'\n## {band}')
    print('| t to release | ' + ' | '.join(f'{n} to target p25/50/75, <30, <45 deg' + (' , eyes on' if n == 'sim' else '') for n in arms) + ' |')
    for s in [f'{-x / 10:.1f}' for x in range(10, -1, -1)]:
        cells = []
        for n, R in arms.items():
            X = [r['rows'][s] for r in R if lo <= r['ttt'] < hi and s in r['rows']]
            v = [x['toRcv'] for x in X]
            c = f"{q(v)}, {100 * sum(a < 30 for a in v) / max(1, len(v)):.0f}%, {100 * sum(a < 45 for a in v) / max(1, len(v)):.0f}% n{len(v)}"
            if n == 'sim': c += f", {100 * sum(x.get('eyes', False) for x in X) / max(1, len(X)):.0f}%"
            cells.append(c)
        print(f'| {s} | ' + ' | '.join(cells) + ' |')
print('\n## speed toward the target (yd/s; a step or hitch to the throw), p25/p50/p75')
for s in [f'{-x / 10:.1f}' for x in range(10, -1, -1)]:
    print(f'| {s} | ' + ' | '.join(f"{n} " + (lambda v: '/'.join(f'{sorted(v)[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75)) if len(v) >= 5 else '-')([r['rows'][s]['vToward'] for r in R if s in r['rows'] and r['rows'][s].get('vToward') is not None]) for n, R in arms.items()) + ' |')
for n, R in arms.items():
    m = sorted(r['motion'] for r in R if r.get('motion') is not None)
    if m: print(f'\n{n}: throwing motion begins before the release p25/p50/p75 {m[len(m) // 4]:.2f}/{m[len(m) // 2]:.2f}/{m[3 * len(m) // 4]:.2f} s')
