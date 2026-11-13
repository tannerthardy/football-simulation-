"""usage: dlflow.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Defensive linemen on runs (DL group, within 2 yd of the line and 6 yd of the ball
at the snap): depth (yd past the line) and lateral travel toward the play side
(the side the carrier is on at first contact, else at the end) at 0.5 / 1.0 /
1.5 / 2.0 s, by concept family. One operator for NFL tracking and sim."""
import gzip, json, sys, re
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
def fam(c):
    c = (c or '').lower()
    if re.search(r'power|counter|trap|pull|gap', c): return 'gap'
    if re.search(r'zone|duo|man', c): return 'zone/duo'
    return None
q = lambda v: round(sorted(v)[len(v)//2], 2) if v else None
T = (5, 10, 15, 20)
for path in sys.argv[1:]:
    out = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        f = fam((raw.get('cell') or {}).get('concept'))
        if not f: continue
        p = Play(raw); c = raw['carrier']; by = raw['ball_y']
        kc = int(round((raw['events'].get('first_contact') or raw['events'].get('end', 3)) / p.dt))
        kc = min(kc, len(raw['xy']) - 1)
        if p.pos(c, kc)[0] is None: continue
        side = 1 if p.pos(c, kc)[1] > by else -1

        for d in p.who('D', 'DL'):
            x0, y0 = p.pos(d, 0)
            if x0 is None or x0 > 2 or abs(y0 - by) > 6: continue
            fk = f + (" backside" if (y0 - by) * side < -0.5 else " playside")
            g = out.setdefault(fk, {t: ([], []) for t in T})
            for t in T:
                if t >= len(raw['xy']): break
                x, y = p.pos(d, t)
                if x is None: break
                g[t][0].append(x); g[t][1].append((y - y0) * side)
    for f, g in sorted(out.items()):
        print(path.split('/')[-1], f, 'depth', '/'.join(str(q(g[t][0])) for t in T), '| toward play', '/'.join(str(q(g[t][1])) for t in T), f'(n {len(g[5][0])})')
