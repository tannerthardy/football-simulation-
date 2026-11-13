#!/usr/bin/env python3
"""Trench geometry and engaged flow on run plays, the same operator for NFL tracking and sim film traces.
    python3 -I scripts/diag/trench_flow.py <nfl-plays.jsonl.gz> <sim trace.json>...
Sim traces come from scripts/diag/run-film-trace.ts; NFL plays from scripts/mechanics (run_film_reference).
Prints, for DL: distance to the nearest opponent and speed (positions +-0.1 s) at 0.0-1.2 s after the snap;
then OL and DL velocity within 1.3 yd of an opponent at 0.8-1.2 s, by concept family: downfield (offense's
attack direction), |lateral| and speed medians. Medians mix bodies; they are not a per-pair measure."""
import collections, math, sys
sys.path.insert(0, 'scripts/mechanics')
import run_film_reference as R
q = lambda v, p: round(sorted(v)[int(p * (len(v) - 1))], 2) if v else float('nan')


def family(concept):
    c = str(concept).lower()
    return 'zone' if 'zone' in c else 'gap' if any(s in c for s in ('power', 'counter', 'trap', 'gap', 'duo')) else 'other'


def measure(plays):
    o = collections.defaultdict(list)
    for p in plays:
        xy, pl = p['xy'], p['players']
        ol = [xy[0][i][0] for i, w in enumerate(pl) if w['group'] == 'OL']
        sgn = 1 if sum(ol) / max(1, len(ol)) < 0 else -1
        fam = family(p['concept'])
        near = lambda k, i: min(math.dist(xy[k][i], xy[k][j]) for j, x in enumerate(pl) if x['side'] != pl[i]['side'])
        for i, w in enumerate(pl):
            if w['group'] not in ('DL', 'OL'): continue
            if w['group'] == 'DL':
                for k in (0, 2, 3, 4, 5, 6, 8, 10, 12):
                    if k + 1 >= len(xy): continue
                    o[('near', k)].append(near(k, i))
                    if k: o[('speed', k)].append(math.dist(xy[k + 1][i], xy[k - 1][i]) / .2)
            for k in (8, 10, 12):
                if k + 1 >= len(xy) or near(k, i) > 1.3: continue
                vx = (xy[k + 1][i][0] - xy[k - 1][i][0]) / .2 * sgn
                vy = abs(xy[k + 1][i][1] - xy[k - 1][i][1]) / .2
                for key, v in (('vx', vx), ('vy', vy), ('s', math.hypot(vx, vy))):
                    o[(w['group'], fam, key)].append(v)
    return o


N, S = measure(R.nfl(sys.argv[1])), measure(R.sim(sys.argv[2:]))
print('DL after the snap: nearest opponent p50 and speed p50, NFL | sim')
for k in (0, 2, 3, 4, 5, 6, 8, 10, 12):
    print(f"  t {k / 10:.1f}  near {q(N[('near', k)], .5)} | {q(S[('near', k)], .5)}   speed {q(N[('speed', k)], .5)} | {q(S[('speed', k)], .5)}")
print('Within 1.3 yd of an opponent, 0.8-1.2 s: downfield / |lateral| / speed p50, NFL | sim (n)')
for g in ('OL', 'DL'):
    for f in ('zone', 'gap', 'other'):
        n, s = [q(N[(g, f, c)], .5) for c in ('vx', 'vy', 's')], [q(S[(g, f, c)], .5) for c in ('vx', 'vy', 's')]
        print(f"  {g} {f}: {n} | {s}  ({len(N[(g, f, 's')])} | {len(S[(g, f, 's')])})")
