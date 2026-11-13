"""Does a fast arrival finish? (same code NFL and sim.) Each defender's own first arrival inside 1.5 yd of the
open-field carrier (open field as pursuit.py, first 3 s): closing speed (rate the gap shrinks) and his speed there;
outcome within 1.0 s: ended (play over with him within 2 yd), past (he is > 1.5 yd away and behind the carrier),
other. Table by group (DL / LB / DB) and fixed closing-speed bands (< 2 / 2-4 / 4+ yd/s): ended% / past% (n).
usage: python3 -I scripts/diag/pass-operators/arrival_finish.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
G = {'DL': 'DL', 'LB': 'LB', 'DB': 'DB'}
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
            if kind not in ('run', 'pass'): continue
            p = Play(raw); kl = p.k(p.end)
            if kind == 'pass':
                if 'catch' not in ev or raw.get('target') is None: continue
                c = raw['target']; k0 = p.k(ev['catch'])
            else:
                c = raw.get('carrier')
                if c is None: continue
                k0 = next((k for k in range(p.k(ev.get('handoff', 0)), kl + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
                if k0 is None: continue
            if p.players[c]['side'] != 'O' or k0 >= kl: continue
            kw = min(kl, k0 + round(3 / p.dt)); s1 = max(1, round(0.1 / p.dt))
            for d in p.who('D'):
                g = G.get(p.players[d].get('group'))
                if g is None: continue
                ka = None
                for k in range(k0 + s1, kw + 1):
                    if p.pos(d, k)[0] is None or p.pos(c, k)[0] is None: break
                    if p.dist(d, c, k) <= 1.5: ka = k; break
                if ka is None or p.pos(d, ka - s1)[0] is None or p.pos(c, ka - s1)[0] is None: continue
                closing = (p.dist(d, c, ka - s1) - p.dist(d, c, ka)) / (s1 * p.dt)
                k1 = ka + round(1 / p.dt)
                if kl <= k1:
                    ke = kl
                    while ke > ka and (p.pos(d, ke)[0] is None or p.pos(c, ke)[0] is None): ke -= 1
                    out = 'ended' if p.dist(d, c, ke) <= 2 else 'other'
                else:
                    (x, y), (cx, cy) = p.pos(d, k1), p.pos(c, k1)
                    if x is None or cx is None: continue
                    cvx, cvy = p.velocity(c, k1); cs = math.hypot(cvx, cvy)
                    behind = cs > 1 and ((x - cx) * cvx + (y - cy) * cvy) / cs < 0
                    out = 'past' if p.dist(d, c, k1) > 1.5 and behind else 'other'
                band = '<2' if closing < 2 else '2-4' if closing < 4 else '4+'
                R[(kind, g, band)].append(out)
    print(f'== {name}: first arrival inside 1.5 yd, outcome within 1 s: ended% / past% (n) by closing speed')
    for kind in ('pass', 'run'):
        for g in ('DL', 'LB', 'DB'):
            cells = []
            for band in ('<2', '2-4', '4+'):
                X = R[(kind, g, band)]
                cells.append(f"{band:>3}: {100*X.count('ended')/len(X):3.0f}/{100*X.count('past')/len(X):3.0f} ({len(X)})" if len(X) >= 15 else f'{band:>3}: -')
            print(f'  {kind:4} {g}: ' + '   '.join(cells))
