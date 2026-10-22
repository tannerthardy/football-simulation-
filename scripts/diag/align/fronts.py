"""Front catalog for run and pass snaps: classify each play's defensive front
from its shape at the snap, then count fronts by offensive look, situation
and season. One operator for NFL tracking and sim exports; no labels used
for the defense (shape only). A catalog of what defenses line up in, not a
target: alignment belongs to the front called against the look.

Offense (as scripts/diag/align/presnap.py): five OL, inline TEs (within 2.6
yd outside a tackle, under 2.5 yd deep), surface each side, strength = the
side with more inline TEs, else more offensive players outside the tackles,
else the field side. Strong side is +.

Front defenders: under 2.0 yd off the ball, within the surface + 3.5 yd.
Technique from the nearest offensive lineman/TE (centre to centre):
  head-up |dy| < .3: C 0, G 2, T 4, TE 6
  shade: C 1; G 2i (inside) / 3; T 4i / 5; TE 7 (inside) / 9
  outside the last blocker: with a TE there, past 1.5 yd 'w9' (wide 9);
  with none, '6g' (ghost 6/7/9, .9-2.0 yd outside the tackle) or 'w9'
  (beyond 2.0).
Interior family (techniques inside the tackles' outside shoulders):
  tite  = 0 or 1 with 4i/4 both sides and no 2i-3
  bear  = 0/1 with 3 (or 2/2i) both sides covering both guards and center
  odd   = 0 with no guard technique (4/5 outside)
  over  = 3 to the strong side and 0/1/2i on the weak side
  under = 3 to the weak side and 0/1/2i on the strong side
  even  = 3 or 2i/2 on both guards, nobody on the center
  other = anything else (counts reported)
Edge type each side = technique of the widest front defender.
Backers: 2.5-8 yd deep within the surface + 2 yd. Deep: past 8 yd.
Context (NFL, joined from the raw plays tables): down, distance, formation,
personnel. Sim exports carry none of these; looks come from shape.

usage: fronts.py FILE [FILE ...] [--kind run|pass|all] [--min 30]"""
import csv, glob, gzip, json, sys
from collections import Counter, defaultdict

KIND = sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else 'run'
MIN = int(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 30

def context():
    ctx = {}
    for path in glob.glob('data/raw/bdb2019/**/plays.csv', recursive=True) + glob.glob('data/raw/bdb2025/**/plays.csv', recursive=True):
        for r in csv.DictReader(open(path)):
            pers = r.get('personnel.offense') or ''
            ctx[f"{r['gameId']}-{r['playId']}"] = {'down': r.get('down'), 'togo': r.get('yardsToGo'),
                'form': r.get('offenseFormation'), 'pers': pers}
    return ctx

def classify(raw):
    if KIND != 'all' and raw.get('kind') != KIND: return None
    xy, P = raw['xy'][0], raw['players']
    pos = lambda i: (xy[2 * i], xy[2 * i + 1]) if xy[2 * i] is not None else None
    O = [i for i, p in enumerate(P) if p['side'] == 'O' and pos(i)]
    D = [i for i, p in enumerate(P) if p['side'] == 'D' and pos(i)]
    ol = sorted([i for i in O if P[i]['group'] == 'OL'], key=lambda i: pos(i)[1])
    if len(ol) < 5: return None
    if len(ol) > 5:
        c = ol[len(ol) // 2]; ol = sorted(sorted(ol, key=lambda i: abs(pos(i)[1] - pos(c)[1]))[:5], key=lambda i: pos(i)[1])
    los, by = pos(ol[2])[0] + .3, pos(ol[2])[1]
    qb = [i for i in O if P[i]['group'] == 'QB']
    if not qb: return None
    gun = los - pos(qb[0])[0] > 2.5
    lat = {i: pos(i)[1] - by for i in O + D}
    te = {1: [], -1: []}
    tack = {1: abs(lat[ol[4]]), -1: abs(lat[ol[0]])}
    for i in O:
        if i in ol or P[i]['group'] in ('QB', 'RB', 'WR'): continue
        s = 1 if lat[i] > 0 else -1
        out = abs(lat[i]) - tack[s]
        if 0 < out < 2.6 and los - pos(i)[0] < 2.5: te[s].append(abs(lat[i]))
    surface = {s: max([tack[s]] + te[s]) for s in (1, -1)}
    wide = {s: sum(1 for i in O if i not in ol and P[i]['group'] != 'QB' and lat[i] * s > surface[s] + .5) for s in (1, -1)}
    st = 1 if len(te[1]) > len(te[-1]) else -1 if len(te[-1]) > len(te[1]) else (1 if wide[1] > wide[-1] else -1 if wide[-1] > wide[1] else 1)
    backs = sum(1 for i in O if P[i]['group'] == 'RB' and abs(lat[i]) < 2 and los - pos(i)[0] > 2.5)
    look = f"{'gun' if gun else 'uc'} TE{min(2, len(te[1]) + len(te[-1]))} B{min(2, backs)}"
    # Blockers by name, strong side +.
    line = [('C', 0.0)] + [('G', lat[ol[k]] * st) for k in (1, 3)] + [('T', lat[ol[k]] * st) for k in (0, 4)]
    line += [('TE', y) for y in te[st]] + [('TE', -y) for y in te[-st]]
    techs = {1: [], -1: [], 0: []}
    front = []
    for i in D:
        depth = pos(i)[0] - los
        y = lat[i] * st  # strong side +
        s = 1 if y > 0 else -1
        if depth >= 2.0 or abs(y) > surface[st if s == 1 else -st] + 3.5: continue
        name, ly = min(line, key=lambda b: abs(b[1] - y))
        dy = abs(y) - abs(ly)
        surf = surface[st if s == 1 else -st]
        hasTE = bool(te[st if s == 1 else -st])
        if abs(y) - surf > (1.5 if hasTE else .9):
            t = 'w9' if hasTE or abs(y) - surf > 2.0 else '6g'
        elif abs(y - ly) < .3:
            t = {'C': '0', 'G': '2', 'T': '4', 'TE': '6'}[name]
        elif name == 'C':
            t = '1'
        else:
            t = {'G': ('2i', '3'), 'T': ('4i', '5'), 'TE': ('7', '9')}[name][dy > 0]
        side = 0 if t in ('0',) else s
        techs[side].append((abs(y), t))
        front.append((y, t, depth))
    edge = {}
    for s in (1, -1):
        cand = techs[s]
        edge['S' if s == 1 else 'W'] = max(cand)[1] if cand else '-'
    tset = {s: {t for _, t in techs[s]} for s in (1, -1)}
    center = bool(techs[0]) or any(t == '1' for s in (1, -1) for t in tset[s])
    guard = {s: tset[s] & {'2i', '2', '3'} for s in (1, -1)}
    tackle = {s: tset[s] & {'4i', '4', '5'} for s in (1, -1)}
    if center and not guard[1] and not guard[-1] and tackle[1] & {'4i', '4'} and tackle[-1] & {'4i', '4'}: fam = 'tite'
    elif center and guard[1] and guard[-1]: fam = 'bear'
    elif techs[0] and not guard[1] and not guard[-1]: fam = 'odd'
    elif '3' in tset[1] and (('1' in tset[-1]) or ('2i' in tset[-1]) or techs[0]): fam = 'over'
    elif '3' in tset[-1] and (('1' in tset[1]) or ('2i' in tset[1]) or techs[0]): fam = 'under'
    elif not center and guard[1] and guard[-1]: fam = 'even'
    else: fam = 'other'
    backers = sum(1 for i in D if 2.5 <= pos(i)[0] - los <= 8 and abs(lat[i]) < surface[1 if lat[i] > 0 else -1] + 2)
    deep = sum(1 for i in D if pos(i)[0] - los > 8)
    return {'look': look, 'fam': fam, 'edgeS': edge['S'], 'edgeW': edge['W'], 'nfront': len(front),
            'backers': backers, 'deep': deep,
            'interior': ' '.join(t for _, t in sorted(techs[-1])[::-1] if t in INSIDE) + ' | ' + ' '.join(t for _, t in techs[0]) + ' | ' + ' '.join(t for _, t in sorted(techs[1]) if t in INSIDE),
            'depths': [d for _, _, d in front]}

INSIDE = {'1', '2i', '2', '3', '4i', '4'}

def pct(c, n): return ' '.join(f"{k} {100 * v / n:.0f}%" for k, v in c.most_common(8))

ctx = context() if any('nfl' in a for a in sys.argv[1:]) else {}
for path in [a for a in sys.argv[1:] if not a.startswith('--') and a.endswith('.gz')]:
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        r = classify(raw)
        if not r: continue
        c = ctx.get(raw['id'], {})
        r['down'] = c.get('down') or '?'
        try: tg = int(c.get('togo') or 0)
        except ValueError: tg = 0
        r['dist'] = '?' if not c else 'short(1-3)' if tg <= 3 else 'med(4-6)' if tg <= 6 else 'long(7+)'
        r['pers'] = (c.get('pers') or '?')[:20]
        cell = raw.get('cell') or {}
        r['called'] = f"{cell.get('defPersonnel')}/{cell.get('front')}" if cell.get('front') else '?'
        rows.append(r)
    print(f"== {path.split('/')[-1]} ({KIND}) n {len(rows)}")
    groups = [('all', lambda r: 'all'), ('look', lambda r: r['look']), ('down', lambda r: r['down']),
              ('distance', lambda r: r['dist']), ('called front (sim)', lambda r: r['called'])]
    for gname, key in groups:
        g = defaultdict(list)
        for r in rows: g[key(r)].append(r)
        for k in sorted(g, key=lambda k: -len(g[k])):
            rs = g[k]
            if len(rs) < MIN or k == '?': continue
            n = len(rs)
            print(f"  [{gname}] {k:12s} n {n:5d} | family: {pct(Counter(r['fam'] for r in rs), n)}")
            print(f"  {'':27s} edge strong: {pct(Counter(r['edgeS'] for r in rs), n)} | weak: {pct(Counter(r['edgeW'] for r in rs), n)}")
            print(f"  {'':27s} front men: {pct(Counter(r['nfront'] for r in rs), n)} | backers: {pct(Counter(r['backers'] for r in rs), n)} | deep: {pct(Counter(r['deep'] for r in rs), n)}")
        if gname == 'all':
            top = Counter(r['interior'] for r in rows).most_common(14)
            print('  interior shapes, techniques inside the tackles (weak | head-up center | strong):'); [print(f"    {100 * v / len(rows):4.1f}%  {k}") for k, v in top]
