"""Edge alignment relative to the offense's own play-side surface, NFL vs sim,
same population filter as scripts/diag/gap/force/edgespace.py (under-center RB
power/counter/trap with a >=1.5 yd play-side kicker and the play side from the
back's first-second path). Edge = widest play-side defender at depth -0.5..2
within 7 yd of the ball (as edgespace/kickout-timing). Surface = widest
play-side OL, and widest attached TE (TE at x>=-2.5 within 2.6 yd outside the
tackle). Reports edge lateral, tackle lateral, TE presence, edge minus surface.
usage: edgealign.py NFL.jsonl.gz SIM.jsonl.gz"""
import gzip, json, math, sys
from collections import defaultdict, Counter
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
FAM = {'POWER': 'power', 'COUNTER': 'counter', 'TRAP': 'trap', 'power': 'power', 'counter': 'counter', 'trap': 'trap'}
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None


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
    kicker = max(cand, key=lambda i: (p.pos(i, k12)[1] - p.pos(i, 0)[1]) * s)
    if (p.pos(kicker, k12)[1] - p.pos(kicker, 0)[1]) * s < 1.5:
        return None
    edge = max(line, key=lambda i: L(p.pos(i, 0)[1]))
    ol = [L(p.pos(i, 0)[1]) for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
    tack = max(ol)
    tes = [L(p.pos(i, 0)[1]) for i in p.who('O', 'TE') if p.pos(i, 0)[0] is not None and p.pos(i, 0)[0] >= -2.5 and 0 < L(p.pos(i, 0)[1]) - tack <= 2.6]
    surf = max(tes) if tes else tack
    # nearest defender to the edge-of-surface + 2 yd point at the snap, who and depth
    return {'fam': fam, 'id': raw['id'], 'edge': L(p.pos(edge, 0)[1]), 'edge_x': p.pos(edge, 0)[0], 'edge_g': p.players[edge]['group'],
            'tack': tack, 'te': bool(tes), 'surf': surf, 'rel': L(p.pos(edge, 0)[1]) - surf,
            'split': (sorted(ol)[-1] - sorted(ol)[-2]) if len(ol) >= 2 else None, 'yards': raw['yards']}


for path in sys.argv[1:]:
    tag = 'NFL' if 'nfl' in path else 'sim'
    rows = [r for r in (one(json.loads(l)) for l in gzip.open(path, 'rt')) if r]
    for fam in ('power', 'counter', 'trap'):
        for te in (True, False):
            sel = [r for r in rows if r['fam'] == fam and r['te'] == te]
            if not sel:
                continue
            f = lambda k: f"{q([r[k] for r in sel],.25)}/{q([r[k] for r in sel])}/{q([r[k] for r in sel],.75)}"
            rel = [r['rel'] for r in sel]
            print(f"{tag} {fam:8s} TE={'y' if te else 'n'} n={len(sel):3d} edge {f('edge')} tackle {f('tack')} surface {f('surf')} edge-surface {f('rel')} | inside surface {100*sum(v < -.4 for v in rel)/len(rel):.0f}% head-up(+-0.4) {100*sum(abs(v) <= .4 for v in rel)/len(rel):.0f}% outside {100*sum(v > .4 for v in rel)/len(rel):.0f}% | edge grp {Counter(r['edge_g'] for r in sel).most_common(3)}")
    if tag == 'sim':
        by = defaultdict(list)
        for r in rows:
            by[(r['id'].split('/')[3], r['te'])].append(r['rel'])
        print('sim edge-surface p50 by look/TE:', {f'{k[0]}/{"TE" if k[1] else "noTE"}': (q(v), len(v)) for k, v in sorted(by.items())})
