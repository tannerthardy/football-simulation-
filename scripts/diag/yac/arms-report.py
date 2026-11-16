"""LAY_OUT gates: staged zone-man-after.mts rows for several arms (directories of cover*.json).
usage: python3 -I scripts/diag/yac/arms-report.py base=DIR lay=DIR nog=DIR
(1) outcome per family; (2) the base arm's never-reached zone plays, replayed in each arm: closest approach of any
defender, wraps, YAC; (3) control: head-on approaches (the carrier running at him, a two-way go) entering dive range:
missed tackles and dives by that defender, and whether the carrier then gains 5+."""
import json, glob, math, sys
from collections import Counter
arms = dict(a.split('=', 1) for a in sys.argv[1:])
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
key = lambda r: (r['coverage'], r['concept'], r['formation'], r['seed'], r['flip'])
data = {n: {key(r): r for p in sorted(glob.glob(f'{d}/cover*.json')) for r in json.load(open(p))} for n, d in arms.items()}
fam = lambda r: 'man' if r['coverage'] == 'cover1' else 'zone'
def dmin(r):
    return min(math.hypot(f['c']['x'] - d['x'], f['c']['y'] - d['y']) for f in r['tr'] for d in f['d'])
print('(1) outcome')
for n, D in data.items():
    for fm in ('man', 'zone'):
        R = [r for r in D.values() if fam(r) == fm]
        ev = lambda t: mean([sum(e['type'] == t for e in r['ev']) for r in R])
        nr = [r for r in R if dmin(r) > 1.0]
        print(f"  {n:5s} {fm:4s} n {len(R):4d} YAC {mean([r['yac'] for r in R]):5.2f} p50 {q([r['yac'] for r in R]):4.1f} | 20+ {mean([r['yac'] >= 20 for r in R]):5.1%} | never-reached {len(nr) / len(R):4.1%} YAC {mean([r['yac'] for r in nr]):5.1f} | "
              f"per catch: missed {ev('missed_tackle'):.3f} broken {ev('broken_tackle'):.3f} hit {ev('hit'):.2f} wrap {ev('tackle_wrap'):.2f}")
base = next(iter(data))
NR = [k for k, r in data[base].items() if fam(r) == 'zone' and dmin(r) > 1.0]
print(f"(2) the {len(NR)} {base}-arm never-reached zone plays, in each arm")
for n, D in data.items():
    R = [D[k] for k in NR if k in D]
    print(f"  {n:5s} n {len(R)} closest any defender p50 {q([dmin(r) for r in R]):.2f} | reached (<=1.0) {mean([dmin(r) <= 1.0 for r in R]):.0%} | wrap in play {mean([any(e['type'] == 'tackle_wrap' for e in r['ev']) for r in R]):.0%} | "
          f"dive/hit {mean([any(e['type'] == 'hit' for e in r['ev']) for r in R]):.0%} | YAC mean {mean([r['yac'] for r in R]):.1f} p50 {q([r['yac'] for r in R]):.1f} | 20+ {mean([r['yac'] >= 20 for r in R]):.0%}")
print('(3) control: head-on two-way-go approaches (carrier running at him, > 3 yd/s) entering 2.3 yd')
for n, D in data.items():
    eps = []
    for r in D.values():
        tr = r['tr']; s = r['dir']
        for i in [d['i'] for d in tr[0]['d']]:
            for k, f in enumerate(tr):
                d = next(x for x in f['d'] if x['i'] == i); c = f['c']
                dx, dy = d['x'] - c['x'], d['y'] - c['y']; L = math.hypot(dx, dy); cs = math.hypot(c['vx'], c['vy'])
                if L <= 2.3:
                    if cs > 3 and (c['vx'] * dx + c['vy'] * dy) / (cs * L) > 0.7 and not d['eng']:
                        t0 = f['t']; e = [x['type'] for x in r['ev'] if x.get('a') == i and t0 - 0.05 <= x['t'] <= t0 + 0.6]
                        gain = (tr[min(len(tr) - 1, k + 10)]['c']['x'] - c['x']) * s
                        eps.append(('missed_tackle' in e, 'hit' in e or 'missed_tackle' in e, gain >= 5, 'tackle_wrap' in e))
                    break
    print(f"  {n:5s} episodes {len(eps)}: missed tackle {mean([e[0] for e in eps]):.1%} | dove/lunged miss-or-hit {mean([e[1] for e in eps]):.1%} | wrap {mean([e[3] for e in eps]):.0%} | carrier gains 5+ in next 1 s {mean([e[2] for e in eps]):.1%}")
