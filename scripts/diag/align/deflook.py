#!/usr/bin/env python3
"""How the defense lines up against each offensive look, at the snap. One
operator for the 2022 tracking extract (nfl_snapframe.py) and the sim's
(sim_snapframe.ts): the same columns, shape only (no defensive labels except
the counts of defensive backs for personnel). Observation only.

Offense, from bodies: the five linemen, inline ends (TE within 2.6 yd
outside a tackle and under 2.5 yd deep), backs (deeper than 2.5 yd and
within 3.5 yd of the ball), receivers (everyone else eligible) and their
count per side. Look: personnel (RB/TE/WR counts), receivers per side (2x2,
3x1, 2x1, ... empty), which side the inline ends are on, the back's side.

Defense:
  front     each front man under 2 yd off the ball, technique from the
            nearest blocker as fronts.py (0,1,2i,2,3,4i,4,5,6,7,9,w9,6g)
  3-tech    the side of the 3-technique (or, without one, the side whose
            guard is shaded outside), relative to the inline end, the
            receiver strength, the back and the field
  box       defenders within 8 yd deep and 2 yd outside the surface
  backers   off-ball defenders 2.5-8 yd deep inside the surface + 2 yd:
            count, depth, width from the ball
  #2 side   on the side with two or more receivers: a defender within 1.5
            yd of #2 laterally and under 8 yd ('over'), between #2 and the
            surface ('apex'), or none ('box')
  deep      defenders deeper than 9.5 yd
  centre    covered: a front man within 1 yd of the centre laterally; in a
            4-down over/under, the A-gap man's distance from the centre as a
            share of the split to his guard

    python3 -I scripts/diag/align/deflook.py FILE.csv.gz [FILE ...] [--by look|down|front] [--min 40]
"""
import csv
import gzip
import sys
from collections import Counter, defaultdict
from statistics import median

W = 160 / 3
BY = sys.argv[sys.argv.index('--by') + 1] if '--by' in sys.argv else 'look'
MIN = int(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 40
FILES = [a for a in sys.argv[1:] if a.endswith('.gz')]
DB = {'CB', 'SS', 'FS', 'DB', 'S'}
OLPOS = {'T', 'G', 'C'}


def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur:
                yield cur
                cur = []
            key = k
            cur.append(r)
    if cur:
        yield cur


def tech_of(y, line, surf, has_te):
    name, ly = min(line, key=lambda b: abs(b[1] - y))
    if abs(y) - surf > (1.5 if has_te else .9):
        return 'w9' if has_te or abs(y) - surf > 2.0 else '6g'
    if abs(y - ly) < .3:
        return {'C': '0', 'G': '2', 'T': '4', 'TE': '6'}[name]
    if name == 'C':
        return '1'
    return {'G': ('2i', '3'), 'T': ('4i', '5'), 'TE': ('7', '9')}[name][abs(y) - abs(ly) > 0]


def classify(rows):
    O = [r for r in rows if r['side'] == 'O']
    D = [r for r in rows if r['side'] == 'D']
    if len(O) != 11 or len(D) != 11:
        return None
    for r in rows:
        r['_x'], r['_y'] = float(r['x']), float(r['y'])
    by = float(rows[0]['ball_y'])
    lat = lambda r: r['_y'] - by
    ol = sorted([r for r in O if r['position'] in OLPOS], key=lat)
    if len(ol) != 5:
        return None
    qb = [r for r in O if r['position'] == 'QB']
    if len(qb) != 1:
        return None
    gun = qb[0]['_x'] < -2.5
    tack = {1: abs(lat(ol[4])), -1: abs(lat(ol[0]))}
    skill = [r for r in O if r['position'] not in OLPOS and r['position'] != 'QB']
    te, backs, recv = {1: [], -1: []}, [], {1: [], -1: []}
    for r in skill:
        s = 1 if lat(r) > 0 else -1
        out = abs(lat(r)) - tack[s]
        if r['_x'] < -2.5 and abs(lat(r)) < 3.5:
            backs.append(r)
        elif 0 < out < 2.6 and r['_x'] > -2.5 and r['position'] in ('TE', 'T', 'G', 'FB'):
            te[s].append(r)
            recv[s].append(r)
        else:
            recv[s].append(r)
    for s in (1, -1):
        recv[s].sort(key=lambda r: -abs(lat(r)))
    n = {s: len(recv[s]) for s in (1, -1)}
    rs = 1 if n[1] > n[-1] else -1 if n[-1] > n[1] else 0      # receiver strength
    ts = 1 if len(te[1]) > len(te[-1]) else -1 if len(te[-1]) > len(te[1]) else 0  # inline-end side
    field = 1 if by < W / 2 else -1 if by > W / 2 else 0          # wider side is +y when the ball is low
    back = 0
    if len(backs) == 1 and abs(lat(backs[0])) > .5:
        back = 1 if lat(backs[0]) > 0 else -1
    pers = f"{sum(1 for r in skill if r['position'] in ('RB', 'FB'))}{sum(1 for r in skill if r['position'] == 'TE')}"
    hi, lo = max(n[1], n[-1]), min(n[1], n[-1])
    dist = 'empty' if not backs else f'{hi}x{lo}'
    tes = len(te[1]) + len(te[-1])
    tedesc = 'noTE' if tes == 0 else '2TE' if te[1] and te[-1] else ('TE-strong' if rs == ts or rs == 0 else 'TE-away') if tes else ''
    look = f"{pers} {dist} {tedesc} {'gun' if gun else 'uc'}"

    surf = {s: max([tack[s]] + [abs(lat(r)) for r in te[s]]) for s in (1, -1)}
    line = [('C', 0.0)] + [('G', lat(ol[k])) for k in (1, 3)] + [('T', lat(ol[k])) for k in (0, 4)]
    line += [('TE', lat(r)) for s in (1, -1) for r in te[s]]
    front, techs = [], {1: [], -1: [], 0: []}
    for r in D:
        y = lat(r)
        s = 1 if y > 0 else -1
        if r['_x'] >= 2.0 or abs(y) > surf[s] + 3.5:
            continue
        t = tech_of(y, line, surf[s], bool(te[s]))
        techs[0 if t == '0' else s].append(t)
        front.append(r)
    # Interior shape by body position in line units (0 ball, 1 guard, 2
    # tackle), independent of the line's splits: an A-gap man (shade, 1, 2i,
    # head-up guard) is under 1.1, a B-gap man (3, 4i) from 1.1 to the tackle.
    # Two inside: over (B-gap man to the strong side, A-gap man away), under
    # (the reverse), even-wide (both in B gaps), even-tight (both in A gaps);
    # three: tite (a nose and two 4i at 1.6 or more), bear (a nose and two
    # 3s or guards), else odd3; one: odd (a nose); four or more: heavy.
    st = ts or rs or field or 1
    def units(r):
        a, k = abs(lat(r)), 1 if lat(r) > 0 else -1
        g, t = abs(lat(ol[3] if k == 1 else ol[1])), tack[k]
        return k * (a / g if a <= g else 1 + (a - g) / (t - g))
    inner = sorted((units(r) for r in front if abs(lat(r)) < tack[1 if lat(r) > 0 else -1] + .3), key=abs)
    if len(inner) == 2:
        a, b = inner
        if abs(b) < 1.1: fam = 'even-tight'
        elif abs(a) >= 1.1: fam = 'even-wide' if a * b < 0 else 'other'
        elif a * b < 0 or abs(a) < .25: fam = 'over' if b * st > 0 else 'under'
        else: fam = 'other'
    elif len(inner) == 3:
        nose, w = inner[0], sorted(abs(u) for u in inner[1:])
        if abs(nose) < .75 and inner[1] * inner[2] < 0: fam = 'tite' if w[0] >= 1.6 else 'bear' if w[0] >= .8 else 'odd3'
        else: fam = 'odd3'
    elif len(inner) == 1: fam = 'odd' if abs(inner[0]) < .75 else 'other'
    elif len(inner) >= 4: fam = 'heavy'
    else: fam = 'none'
    # The B-gap man's side in a 4-down over/under.
    t3s = (1 if inner[1] > 0 else -1) if fam in ('over', 'under') else 0
    edges = {k: sorted(abs(lat(r)) - surf[k] for r in front if lat(r) * k > 0 and abs(lat(r)) >= tack[k] + .3) for k in (1, -1)}
    t3 = t3s
    box = sum(1 for r in D if r['_x'] <= 8 and abs(lat(r)) <= surf[1 if lat(r) > 0 else -1] + 2)
    backers = [r for r in D if 2.5 <= r['_x'] <= 8 and abs(lat(r)) < surf[1 if lat(r) > 0 else -1] + 2]
    deep = sum(1 for r in D if r['_x'] > 9.5)
    dbs = sum(1 for r in D if r['position'] in DB)
    # Who answers the #2 receiver on the passing-strength side (the field side
    # when balanced)?
    side = rs or field or 1
    two = recv[side][1] if len(recv[side]) >= 2 and recv[side][1] not in te[side] else None
    answer = '-'
    if two is not None:
        y2 = lat(two)
        near = [r for r in D if r['_x'] < 8 and abs(lat(r) - y2) < 1.5]
        between = [r for r in D if 1 < r['_x'] < 8 and surf[side] + .5 < lat(r) * side < abs(y2) - 1.5]
        answer = 'over' if near else 'apex' if between else 'box'
    # Every detached inside receiver (#2 and #3 on each side, strong = the
    # receivers' side): who answers him, a defender within 1.5 yd laterally
    # under 8 deep ('over'), one between him and the next receiver inside or
    # the surface ('apex'), or nobody; and whether that defender is a back.
    inside = {}
    for k, name in ((side, 'S'), (-side, 'W')):
        for i, r2 in enumerate(recv[k][1:3], start=2):
            if r2 in te[k]:
                continue
            y2 = abs(lat(r2))
            nxt = abs(lat(recv[k][i])) if i < len(recv[k]) and recv[k][i] not in te[k] else surf[k]
            near = [d for d in D if d['_x'] < 8 and abs(lat(d) - lat(r2)) < 1.5]
            between = [d for d in D if 1 < d['_x'] < 8 and lat(d) * k > nxt + .5 and lat(d) * k < y2 - 1.5]
            who = near or between
            kind = ('over' if near else 'apex' if between else 'none') + ('' if not who else '-DB' if who[0]['position'] in DB else '-LB')
            inside[f'{name}#{i}'] = kind
    cy = lat(ol[2])
    covered = any(abs(lat(r) - cy) < 1 for r in front)
    agap = None
    if fam in ('over', 'under'):
        a = min(front, key=lambda r: abs(lat(r) - cy))
        g = ol[3] if lat(a) > cy else ol[1]
        agap = abs(lat(a) - cy) / abs(lat(g) - cy)
    try:
        togo = int(rows[0]['yardsToGo'])
    except ValueError:
        togo = 10
    down = rows[0]['down']
    return {
        'look': look, 'pers': pers, 'dist': dist, 'te': tedesc, 'gun': gun,
        'down': f"{down} {'short' if togo <= 2 else 'med' if togo <= 6 else 'long'}",
        'dpers': {4: 'base', 5: 'nickel', 6: 'dime'}.get(dbs, f'{dbs}DB'),
        'front': rows[0].get('simFront') or '', 'nfront': len(front), 'fam': fam,
        't3_te': rel(t3, ts), 't3_recv': rel(t3, rs), 't3_back': rel(t3, back), 't3_field': rel(t3, field),
        'box': box, 'nback': len(backers), 'bdepth': [r['_x'] for r in backers],
        'bwidth': [abs(lat(r)) for r in backers], 'two': answer, 'deep': deep,
        'inside': inside, 'covered': covered, 'agap': agap, 'edge': [e[-1] for e in edges.values() if e],
        'shape': ' '.join(sorted(techs[-1])) + ' | ' + ' '.join(techs[0]) + ' | ' + ' '.join(sorted(techs[1])),
    }


def rel(a, b):
    if not a:
        return 'none'
    if not b:
        return 'n/a'
    return 'toward' if a == b else 'away'


def pct(c, n, k=6):
    return ' '.join(f"{key} {100 * v / n:.0f}%" for key, v in c.most_common(k))


def q(v):
    v = sorted(v)
    if not v:
        return '-'
    return f"{v[len(v) // 4]:.1f}/{v[len(v) // 2]:.1f}/{v[3 * len(v) // 4]:.1f}"


def pq(v):
    v = sorted(v)
    return '/'.join(f"{v[int(f * (len(v) - 1))]:.2f}" for f in (.1, .5, .9))


for path in FILES:
    out = [r for r in (classify(p) for p in plays(path)) if r]
    print(f"== {path.split('/')[-1]}: {len(out)} snaps")
    groups = defaultdict(list)
    for r in out:
        key = r['look'] if BY == 'look' else r['down'] if BY == 'down' else f"{r['dpers']} {r['front']}" if BY == 'front' else r[BY]
        groups[key].append(r)
    for key in sorted(groups, key=lambda k: -len(groups[k])):
        g = groups[key]
        if len(g) < MIN:
            continue
        m = len(g)
        print(f"[{key}] n {m}  dpers: {pct(Counter(r['dpers'] for r in g), m, 3)}")
        print(f"   3-tech vs TE: {pct(Counter(r['t3_te'] for r in g), m, 4)} | vs receivers: {pct(Counter(r['t3_recv'] for r in g), m, 4)}"
              f" | vs back: {pct(Counter(r['t3_back'] for r in g), m, 4)} | vs field: {pct(Counter(r['t3_field'] for r in g), m, 4)}")
        print(f"   box: {pct(Counter(r['box'] for r in g), m, 5)} | front men: {pct(Counter(r['nfront'] for r in g), m, 4)}"
              f" | backers: {pct(Counter(r['nback'] for r in g), m, 4)} | deep: {pct(Counter(r['deep'] for r in g), m, 3)}")
        print(f"   backer depth p25/50/75 {q([d for r in g for d in r['bdepth']])}  width {q([d for r in g for d in r['bwidth']])}"
              f" | #2: {pct(Counter(r['two'] for r in g), m, 4)}")
        print(f"   family: {pct(Counter(r['fam'] for r in g), m, 7)}")
        print(f"   edge outside the surface p25/50/75 {q([e for r in g for e in r['edge']])}")
        ag = [r['agap'] for r in g if r['agap'] is not None]
        print(f"   centre covered {100 * sum(r['covered'] for r in g) / m:.0f}%"
              + (f" | over/under A-gap man, share of the centre-guard split p10/50/90 {pq(ag)} (n {len(ag)})" if ag else ''))
        for ref in ('S#2', 'S#3', 'W#2'):
            got = [r['inside'][ref] for r in g if ref in r['inside']]
            if len(got) >= MIN // 2:
                print(f"   {ref} answered: {pct(Counter(got), len(got), 6)} (n {len(got)})")
