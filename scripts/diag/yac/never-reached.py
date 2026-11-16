"""Zone completions no defender ever reaches (zone-man-after.mts rows): where caught, by whom, and what the defenders
who could have made the play were doing. usage: python3 -I scripts/diag/yac/never-reached.py out/diag/yac/cover*.json"""
import json, math, sys
from collections import Counter
rows = [r for p in sys.argv[1:] for r in json.load(open(p)) if r['coverage'] != 'cover1']
mean = lambda v: sum(v) / len(v) if v else float('nan')
NR = []
for r in rows:
    tr = r['tr']; s = r['dir']
    ids = [d['i'] for d in tr[0]['d']]
    dmin = {i: min(math.hypot(f['c']['x'] - d['x'], f['c']['y'] - d['y']) for f in tr for d in f['d'] if d['i'] == i) for i in ids}
    if min(dmin.values()) <= 1.0:
        continue
    NR.append((r, dmin))
print(f"zone completions {len(rows)}, never reached {len(NR)}; YAC mean {mean([r['yac'] for r, _ in NR]):.1f}; catch depth {mean([r['catchX'] for r, _ in NR]):.1f} (all {mean([r['catchX'] for r in rows]):.1f})")
print('  coverage', Counter(r['coverage'] for r, _ in NR).most_common())
print('  concept', Counter(r['concept'] for r, _ in NR).most_common(8))
print('  carrier', Counter(r['carrierRole'] for r, _ in NR).most_common())
ends = Counter()
for r, _ in NR:
    t = [e['type'] for e in r['ev'] if e['type'] in ('touchdown', 'out_of_bounds', 'tackle', 'slide')]
    ends[t[-1] if t else 'other'] += 1
print('  how it ends', ends.most_common())
# the defender who got closest: who, where at the catch (ahead of the carrier downfield / beside / behind), his chase and speeds
cl = []
for r, dmin in NR:
    tr = r['tr']; s = r['dir']
    i = min(dmin, key=dmin.get)
    f0 = tr[0]; d0 = next(d for d in f0['d'] if d['i'] == i)
    k = min(range(len(tr)), key=lambda k: next(math.hypot(tr[k]['c']['x'] - d['x'], tr[k]['c']['y'] - d['y']) for d in tr[k]['d'] if d['i'] == i))
    seq = [next(d for d in f['d'] if d['i'] == i) for f in tr[:k + 1]]
    csp = [math.hypot(f['c']['vx'], f['c']['vy']) for f in tr[:k + 1]]
    cl.append(dict(slot=r['defPos'][str(i)], dmin=dmin[i], ahead0=(d0['x'] - f0['c']['x']) * s, dist0=math.hypot(d0['x'] - f0['c']['x'], d0['y'] - f0['c']['y']),
                   chase=mean([d['chase'] for d in seq]), sp=mean([math.hypot(d['vx'], d['vy']) for d in seq]), rq=mean([math.hypot(d['rvx'], d['rvy']) for d in seq]), csp=mean(csp),
                   tk=tr[k]['t'], labs=Counter(d['lab'] for d in seq).most_common(2), cls=d0['cls'], eng=mean([d['eng'] for d in seq])))
print(f"closest defender: dmin p50 {sorted(c['dmin'] for c in cl)[len(cl) // 2]:.1f} yd at +{mean([c['tk'] for c in cl]):.1f} s; at the catch {mean([c['dist0'] for c in cl]):.1f} yd away, downfield of carrier {mean([c['ahead0'] > 0 for c in cl]):.0%}")
print(f"   chasing {mean([c['chase'] for c in cl]):.0%} of ticks; speed {mean([c['sp'] for c in cl]):.2f} req {mean([c['rq'] for c in cl]):.2f} vs carrier {mean([c['csp'] for c in cl]):.2f}; engaged {mean([c['eng'] for c in cl]):.0%}")
print('   slot', Counter(c['slot'] for c in cl).most_common(6), 'class', Counter(c['cls'] for c in cl).most_common(3))
print('   dmin bands', Counter('<2' if c['dmin'] < 2 else '2-4' if c['dmin'] < 4 else '4-8' if c['dmin'] < 8 else '8+' for c in cl).most_common())
# defenders downfield of the carrier at the catch: did any of them ever get in front of him (his path) and how close
infront = []
for r, dmin in NR:
    tr = r['tr']; s = r['dir']
    for d0 in tr[0]['d']:
        if (d0['x'] - tr[0]['c']['x']) * s > 2:
            infront.append(dmin[d0['i']])
print(f"defenders >2 yd downfield of the carrier at the catch: {len(infront) / len(NR):.1f} per play; their closest approach p50 {sorted(infront)[len(infront) // 2]:.1f}")
for r, dmin in NR[:12]:
    i = min(dmin, key=dmin.get)
    print(f"   {r['coverage']:7s} {r['concept']:22s} {r['formation']:15s} s{r['seed']} f{int(r['flip'])} {r['carrierRole']:4s} catch {r['catchX']:4.1f} YAC {r['yac']:5.1f} closest {r['defPos'][str(i)]} {dmin[i]:.1f}")
# the closest defender at his closest approach and 0.5 s before: where he is relative to the carrier's run, speeds
print('closest defender, geometry at 0.5 s before / at closest approach:')
G = []
for r, dmin in NR:
    tr = r['tr']; s = r['dir']; i = min(dmin, key=dmin.get)
    D = [next(d for d in f['d'] if d['i'] == i) for f in tr]
    dist = [math.hypot(f['c']['x'] - d['x'], f['c']['y'] - d['y']) for f, d in zip(tr, D)]
    k = dist.index(min(dist)); kp = max(0, k - 5)
    def geo(k):
        f, d = tr[k], D[k]; c = f['c']; cs = math.hypot(c['vx'], c['vy']) or 1e-9
        ux, uy = d['x'] - c['x'], d['y'] - c['y']; L = math.hypot(ux, uy) or 1e-9
        lev = math.degrees(math.acos(max(-1, min(1, (ux * c['vx'] + uy * c['vy']) / (L * cs)))))
        ds = math.hypot(d['vx'], d['vy']) or 1e-9
        head = math.degrees(math.acos(max(-1, min(1, (d['vx'] * c['vx'] + d['vy'] * c['vy']) / (ds * cs)))))  # 0 = same direction as carrier, 180 = head on
        return dict(lev=lev, dsp=ds, rq=math.hypot(d['rvx'], d['rvy']), csp=cs, head=head, close=-(d['vx'] - c['vx']) * ux / L - (d['vy'] - c['vy']) * uy / L, lab=d['lab'], chase=d['chase'], dist=L)
    G.append((geo(kp), geo(k), r))
for name, j in (('-0.5 s', 0), ('closest', 1)):
    g = [x[j] for x in G]
    print(f"   {name:8s} dist {mean([x['dist'] for x in g]):.1f} lev front {mean([x['lev'] < 60 for x in g]):.0%} side {mean([60 <= x['lev'] < 120 for x in g]):.0%} behind {mean([x['lev'] >= 120 for x in g]):.0%} | "
          f"his speed {mean([x['dsp'] for x in g]):.2f} req {mean([x['rq'] for x in g]):.2f} carrier {mean([x['csp'] for x in g]):.2f} | heading vs carrier p50 {sorted(x['head'] for x in g)[len(g) // 2]:.0f} deg | "
          f"closing {mean([x['close'] for x in g]):.2f} | chase {mean([x['chase'] for x in g]):.0%} | labels {Counter(x['lab'] for x in g).most_common(3)}")
