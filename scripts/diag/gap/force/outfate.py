"""Fate of the defenders aligned outside the play-side surface at the snap
(outside.py's region: lateral surface+0.5..+9, depth <=8), at the moment the
back reaches x>=-2 (edgespace.py's kd and B point). For each such defender:
engaged (within 1.2 yd of an OL/TE/non-carrier RB), else his lateral relative
to B (inside / within 3 yd / outside) and depth. Sim split by look.
usage: outfate.py NFL.jsonl.gz SIM.jsonl.gz"""
import gzip, json, math, sys
from collections import Counter, defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
FAM = {'POWER': 'power', 'COUNTER': 'counter', 'TRAP': 'trap', 'power': 'power', 'counter': 'counter', 'trap': 'trap'}


def one(raw):
    fam = FAM.get((raw.get('cell') or {}).get('concept'))
    if raw.get('kind') != 'run' or not fam:
        return None
    p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
    if c is None or h is None or p.players[c]['group'] != 'RB' or not p.live(h + 1.0):
        return None
    qbs = p.who('O', 'QB')
    if not qbs or p.pos(qbs[0], 0)[0] is None or p.pos(qbs[0], 0)[0] <= -2.5:
        return None
    x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
    if x0 is None or x1 is None:
        return None
    s = 1 if y1 - y0 >= 0 else -1; by = raw['ball_y']
    L = lambda y: (y - by) * s
    line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7 and L(p.pos(i, 0)[1]) > 0]
    k12 = p.k(1.2)
    cand = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB') and p.pos(i, 0)[0] is not None and p.pos(i, k12)[0] is not None]
    if not line or not cand:
        return None
    edge = max(line, key=lambda i: L(p.pos(i, 0)[1]))
    kicker = max(cand, key=lambda i: (p.pos(i, k12)[1] - p.pos(i, 0)[1]) * s)
    if (p.pos(kicker, k12)[1] - p.pos(kicker, 0)[1]) * s < 1.5:
        return None
    end = p.k(p.end)
    kd = next((k for k in range(p.k(h), end + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= -2), None)
    if kd is None or p.pos(edge, kd)[0] is None or p.pos(kicker, kd)[0] is None:
        return None
    ol = [L(p.pos(i, 0)[1]) for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
    tack = max(ol)
    tes = [L(p.pos(i, 0)[1]) for i in p.who('O', 'TE') if p.pos(i, 0)[0] is not None and p.pos(i, 0)[0] >= -2.5 and 0 < L(p.pos(i, 0)[1]) - tack <= 2.6]
    surf = max(tes) if tes else tack
    blockers = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB')]
    eng = lambda d, k: any(p.pos(b, k)[0] is not None and math.hypot(p.pos(b, k)[0] - p.pos(d, k)[0], p.pos(b, k)[1] - p.pos(d, k)[1]) <= 1.2 for b in blockers)
    blat = max(L(p.pos(edge, kd)[1]), L(p.pos(kicker, kd)[1])) + 2.0
    o = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.pos(d, 0)[0] <= 8 and surf + .5 <= L(p.pos(d, 0)[1]) <= surf + 9]
    fates = []
    for d in o:
        if p.pos(d, kd)[0] is None:
            continue
        dd = math.hypot(p.pos(d, kd)[0] - 1.0, L(p.pos(d, kd)[1]) - blat)
        g = p.players[d]['group']
        if d == edge:
            g += '(edge)'
        if eng(d, kd):
            f = 'engaged'
        elif dd <= 3:
            f = 'free<=3 of B'
        elif L(p.pos(d, kd)[1]) < blat:
            f = 'free inside B'
        else:
            f = 'free outside B'
        fates.append((g, f, round(p.pos(d, kd)[0], 1)))
    return {'fam': fam, 'id': raw['id'], 'fates': fates, 'n': len(o)}


for path in sys.argv[1:]:
    tag = 'NFL' if 'nfl' in path else 'sim'
    g = defaultdict(list)
    for l in gzip.open(path, 'rt'):
        raw = json.loads(l); r = one(raw)
        if not r:
            continue
        g['all'].append(r)
        if tag == 'sim':
            g[raw['id'].split('/')[3]].append(r)
    for k, sel in sorted(g.items()):
        fc = Counter(f for r in sel for _, f, _ in r['fates'])
        tot = sum(fc.values())
        gc = Counter((gg, f) for r in sel for gg, f, _ in r['fates'])
        print(f"{tag} {k:7s} plays {len(sel):4d} outside-aligned defenders/play {tot/len(sel):.2f} | at kd: " + ', '.join(f"{f} {fc[f]/len(sel):.2f}" for f in ('engaged', 'free<=3 of B', 'free inside B', 'free outside B')) + f" | top {gc.most_common(4)}")
