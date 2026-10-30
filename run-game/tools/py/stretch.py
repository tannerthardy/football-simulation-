"""Zone stretch, NFL vs sim, same operator: play side = direction of the carrier's lateral displacement from the
snap to 1.5 s. At t = 0.3/0.5/0.8/1.0/1.2/1.5 s: OL and DL lateral velocity toward the play side (positions +-0.1 s),
median, split by engaged (an opponent within 1.3 yd) and free; plus the OL line's mean lateral displacement
toward the play side since the snap. usage: stretch.py run_film_reference.py nfl.jsonl.gz trace.json..."""
import importlib.util, math, sys, collections
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
T = (3, 5, 8, 10, 12, 15)
for p in plays():
    c = p['concept']
    if c not in ('INSIDE ZONE', 'OUTSIDE ZONE'): continue
    xy, pl, car = p['xy'], p['players'], p['carrier']
    if len(xy) < 17: continue
    side = math.copysign(1, (xy[15][car][1] - xy[0][car][1]) or 1)
    grp = [w['group'] for w in pl]
    for g in ('OL', 'DL'):
        idx = [i for i, x in enumerate(grp) if x == g]
        opp = [i for i, x in enumerate(grp) if (x in ('DL', 'LB', 'DB')) != (g in ('DL',)) and x in ('OL', 'TE', 'DL', 'LB', 'DB', 'RB', 'WR', 'QB')]
        opp = [j for j, w in enumerate(pl) if w['side'] != pl[idx[0]]['side']] if idx else []
        for k in T:
            if k + 1 >= len(xy): continue
            for i in idx:
                vy = (xy[k + 1][i][1] - xy[k - 1][i][1]) / .2 * side
                eng = min(math.dist(xy[k][i], xy[k][j]) for j in opp) <= 1.3
                o[(c, p['src'], g, k, 'eng' if eng else 'free')].append(vy)
            if g == 'OL':
                o[(c, p['src'], 'OLdisp', k, '')].append(sum((xy[k][i][1] - xy[0][i][1]) * side for i in idx) / len(idx))
med = lambda v: f"{sorted(v)[len(v)//2]:5.2f}" if v else "  -  "
for c in ('OUTSIDE ZONE', 'INSIDE ZONE'):
    print(c, " t(s): " + "  ".join(f"{k/10:>15.1f}" for k in T))
    for src in ('nfl', 'sim'):
        for g, e in (('OL', 'eng'), ('OL', 'free'), ('DL', 'eng'), ('DL', 'free'), ('OLdisp', '')):
            row = [o[(c, src, g, k, e)] for k in T]
            print(f"  {src} {g:6s} {e:4s} " + "  ".join(f"{med(v)} (n{len(v):4d})" for v in row))
