"""Pre-snap geometry of run plays, one operator for NFL tracking and sim
exports (first frame = snap; attack +x; positions are body centres).

Offense: the five OL ordered across the field (center = middle), the ball at
the center's lateral. Inline TE = a TE or OL-shaped extra within 2.6 yd
outside a tackle and less than 2.5 yd deep. Surface (each side) = widest of
tackle and inline TEs. Strength = the side with more inline TEs, else the
side with more offensive players outside the tackles, else the field side.
Look = 'uc'/'gun' (QB deeper than 2.5 yd), inline TEs (0/1/2+), backs
(RB-group players within 2 yd laterally of the ball and deeper than 2.5 yd).

Defense, by alignment, not label:
- front: defenders less than 2.0 yd off the ball within 1 yd outside the
  surface + 2.5; technique from the lateral offset to the nearest offensive
  lineman/TE: head-up (|dy| < .35), else inside/outside shade of him.
- edge: the widest front defender each side, lateral minus that side's
  surface (+ outside).
- box: within 7 yd depth and 6.5 yd of the ball laterally (metrics.Play).
- backers: 2.5-8 yd deep within surface + 2 laterally: count, depth.
- deep: deeper than 8 yd: count (1 = one-high, 2 = two-high), depth.
- corners/outside DBs: widest defender each side: depth.
usage: presnap.py FILE [FILE ...] [--by look|none]"""
import gzip, json, sys
from collections import defaultdict, Counter

q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def fmt(v): return f"{q(v):5.2f} [{q(v,.25):5.2f},{q(v,.75):5.2f}]" if v else '   -'

def one(raw):
    if raw.get('kind') != 'run': return None
    xy, P = raw['xy'][0], raw['players']
    pos = lambda i: (xy[2 * i], xy[2 * i + 1]) if xy[2 * i] is not None else None
    O = [i for i, p in enumerate(P) if p['side'] == 'O' and pos(i)]
    D = [i for i, p in enumerate(P) if p['side'] == 'D' and pos(i)]
    ol = sorted([i for i in O if P[i]['group'] == 'OL'], key=lambda i: pos(i)[1])
    if len(ol) < 5: return None
    if len(ol) > 5:  # an extra lineman: the five most central
        mid = sorted(ol, key=lambda i: pos(i)[1])
        c = mid[len(mid) // 2]; ol = sorted(mid, key=lambda i: abs(pos(i)[1] - pos(c)[1]))[:5]; ol.sort(key=lambda i: pos(i)[1])
    los = max(pos(i)[0] for i in ol) + .1  # the ball sits just ahead of the line's front
    los = pos(ol[2])[0] + .3 if True else los
    by = pos(ol[2])[1]
    qb = [i for i in O if P[i]['group'] == 'QB']
    if not qb: return None
    gun = los - pos(qb[0])[0] > 2.5
    tackles = {1: pos(ol[4])[1] - by, -1: pos(ol[0])[1] - by}
    if tackles[1] < 0: tackles = {1: tackles[-1], -1: tackles[1]}
    side_of = lambda y: 1 if y - by > 0 else -1
    te = {1: [], -1: []}
    for i in O:
        if i in ol or P[i]['group'] in ('QB', 'RB', 'WR'): continue
        x, y = pos(i); s = side_of(y)
        out = (y - by) * s - abs(tackles[s])
        if 0 < out < 2.6 and los - x < 2.5: te[s].append(abs(y - by))
    surface = {s: max([abs(tackles[s])] + te[s]) for s in (1, -1)}
    outside = {s: sum(1 for i in O if i not in ol and P[i]['group'] != 'QB' and (pos(i)[1] - by) * s > surface[s] + .5) for s in (1, -1)}
    strong = 1 if len(te[1]) > len(te[-1]) else -1 if len(te[-1]) > len(te[1]) else (1 if outside[1] > outside[-1] else -1 if outside[-1] > outside[1] else 1)
    backs = sum(1 for i in O if P[i]['group'] == 'RB' and abs(pos(i)[1] - by) < 2 and los - pos(i)[0] > 2.5)
    look = f"{'gun' if gun else 'uc'} TE{min(2, len(te[1]) + len(te[-1]))} B{min(2, backs)}"
    linemen = [(pos(i)[1] - by) for i in ol] + [s * y for s in (1, -1) for y in te[s]]
    r = defaultdict(list); tech = Counter()
    front = {1: [], -1: []}
    for i in D:
        x, y = pos(i); depth = x - los; lat = y - by; s = side_of(y)
        if depth < 2.0 and abs(lat) < surface[s] + 2.5 + 1:
            front[s].append(abs(lat))
            near = min(linemen, key=lambda l: abs(l - lat))
            k = 'head-up' if abs(lat - near) < .35 else ('outside' if abs(lat) > abs(near) else 'inside')
            who = 'C' if near == 0 or abs(near) < .5 else ('G' if abs(near) < 2.2 else 'T' if abs(near) <= abs(tackles[s]) + .3 else 'TE')
            tech[f"{who} {k}"] += 1
            r['front depth'].append(depth)
        elif 2.5 <= depth <= 8 and abs(lat) < surface[s] + 2:
            r['backer depth'].append(depth); r['backer |lat|'].append(abs(lat))
        if depth > 8: r['deep depth'].append(depth)
    r['front count'].append(len(front[1]) + len(front[-1]))
    r['backers'].append(sum(1 for i in D if 2.5 <= pos(i)[0] - los <= 8 and abs(pos(i)[1] - by) < surface[side_of(pos(i)[1])] + 2))
    r['deep count'].append(sum(1 for i in D if pos(i)[0] - los > 8))
    r['box'].append(sum(1 for i in D if pos(i)[0] - los < 7 and abs(pos(i)[1] - by) < 6.5))
    for s, name in ((strong, 'strong'), (-strong, 'weak')):
        if front[s]: r[f'edge-surface {name}'].append(max(front[s]) - surface[s])
    r['width tackle-to-tackle'].append(abs(tackles[1]) + abs(tackles[-1]))
    for s in (1, -1):
        w = max(D, key=lambda i: (pos(i)[1] - by) * s)
        r['widest DB depth'].append(pos(w)[0] - los)
    return look, r, tech

for path in [a for a in sys.argv[1:] if not a.startswith('--')]:
    by_look = '--by' not in sys.argv or sys.argv[sys.argv.index('--by') + 1] == 'look'
    agg = defaultdict(lambda: (defaultdict(list), Counter(), [0]))
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        o = one(raw)
        if not o: continue
        look, r, tech = o
        for key in (['all', look] if by_look else ['all']):
            a = agg[key]; a[2][0] += 1; a[1].update(tech)
            for k, v in r.items(): a[0][k].extend(v)
    print(f"== {path.split('/')[-1]}")
    for key in sorted(agg, key=lambda k: (k != 'all', -agg[k][2][0])):
        r, tech, n = agg[key]
        if n[0] < 40 and key != 'all': continue
        print(f"  {key:12s} n {n[0]:5d} | box {fmt(r['box'])} | front {fmt(r['front count'])} depth {fmt(r['front depth'])} | backers {fmt(r['backers'])} depth {fmt(r['backer depth'])} | deep {fmt(r['deep count'])}")
        print(f"  {'':12s}          edge-surface strong {fmt(r['edge-surface strong'])} weak {fmt(r['edge-surface weak'])} | widest DB depth {fmt(r['widest DB depth'])} | T-T width {fmt(r['width tackle-to-tackle'])}")
        tot = sum(tech.values()) or 1
        print(f"  {'':12s}          front techniques: " + ', '.join(f"{k} {100*v/tot:.0f}%" for k, v in tech.most_common(10)))
