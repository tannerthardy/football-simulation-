"""Sim side of the deep-ball table, same cells as nfl_deep_ball.py (Integration, 2026-11-24, DEPTH_FIRST): rows from
deep-ball.mts, one file set per arm. Route map to BDB's routeRan: post -> POST; go / fade / seam / seam_read -> GO
(BDB has no seam label); corner -> CORNER; else other. Also the look-off cut: 20+ throws after the passer's eyes held
0.3 s+ on another receiver, and the deep safeties' lateral move toward the target at the throw (yd, + toward).
By family and air window (10-15 / 15-20 / 20+): attempts per team-game, completion %, int %.
usage: python3 -I scripts/diag/defense-film/deep_ball.py ARM_A 'glob_a' ARM_B 'glob_b' ..."""
import json, sys, glob
import numpy as np
RT = {'post': 'POST', 'go': 'GO', 'fade': 'GO', 'seam': 'GO', 'seam_read': 'GO', 'corner': 'CORNER'}
a = sys.argv[1:]
for name, pat in zip(a[::2], a[1::2]):
    F = sorted(glob.glob(pat)); R = [json.loads(l) for f in F for l in open(f)]
    tg = len(F) * 2; deep = [r for r in R if (r['air'] or 0) >= 20]
    for r in deep: r['rt'] = RT.get(r['route'], 'other')
    c = sum(r['completed'] for r in deep)
    print(f'\n## {name}: team-games {tg}; targeted {len(R) / tg:.1f} per team-game; 20+ air attempts {len(deep) / tg:.2f}, completions {c / tg:.2f} (comp {100 * c / max(1, len(deep)):.1f}%), int {100 * sum(r["int"] for r in deep) / max(1, len(deep)):.1f}%')
    for sh in ('single-high', 'two-high'):
        for rt in ('POST', 'GO', 'CORNER', 'other'):
            S = [r for r in deep if r['shell'] == sh and r['rt'] == rt]
            if S: print(f'  {sh:11s} {rt:6s} 20+: n {len(S):4d}, per team-game {len(S) / tg:.3f}, comp {100 * sum(r["completed"] for r in S) / len(S):5.1f}%, int {100 * sum(r["int"] for r in S) / len(S):4.1f}%')
    for lo in (True, False):
        S = [r for r in deep if r['lookoff'] == lo]; tw = [x for r in S for x in r['toward']]
        if S: print(f'  look-off {"yes" if lo else "no "}: 20+ n {len(S)}, comp {100 * sum(r["completed"] for r in S) / len(S):5.1f}%; deep safeties toward the target at the throw p50 {np.median(tw) if tw else float("nan"):+.2f} yd (n {len(tw)})')
    for lo in (True, False):
        S = [r for r in R if r['lookoff'] == lo and (r['air'] or 0) >= 10]; tw = [x for r in S for x in r['toward']]
        if S: print(f'  look-off {"yes" if lo else "no "}, all 10+ air: n {len(S)}, comp {100 * sum(r["completed"] for r in S) / len(S):5.1f}%; deep safeties toward target p50 {np.median(tw):+.2f} yd')
    print('  by family x air window: attempts per team-game, comp %, int %')
    for fam in ('cover1', 'cover2', 'cover3', 'cover4', 'cover6', 'tampa2', 'cover2man', 'cover0'):
        cells = []
        for lo, hi in ((10, 15), (15, 20), (20, 99)):
            S = [r for r in R if r['fam'] == fam and lo <= (r['air'] or 0) < hi]
            cells.append(f"{lo}-{hi if hi < 99 else ''}: {len(S) / tg:.2f} / {100 * sum(r['completed'] for r in S) / max(1, len(S)):3.0f}% / {100 * sum(r['int'] for r in S) / max(1, len(S)):2.0f}% (n {len(S)})")
        print(f'    {fam:9s} ' + ' | '.join(cells))
