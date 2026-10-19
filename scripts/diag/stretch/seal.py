"""Blocking leverage around the carrier as he crosses the line, one operator
for NFL tracking and sim common plays. At the carrier's first frame at or
past the line (and 0.5 s later), every defender within R yd of him is:
  free     no offensive player (not the carrier) within 1.2 yd of him;
  walled   a blocker within 1.2 yd stands between him and the carrier (at
           least 0.2 yd toward the carrier along the line joining them, and
           within 0.9 yd of that line);
  outside  blocked, but no blocker is between him and the carrier (he has
           the leverage: the blocker is beside or behind him).
Then whether he comes within 1 yd of the carrier within the next 1.5 s (his
play on the ball; a proximity proxy, not a tackle label). Proximity and
geometry only: not engagement, force or legal holds.
usage: seal.py FILE [--ytg60] [--concept power] [--at 0|0.5] [--r 4]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
concept = opt('--concept'); AT = float(opt('--at', '0')); R = float(opt('--r', '4'))
LABEL = {'pull_lead': 'PULL LEAD', 'oz': 'OUTSIDE ZONE', 'iz': 'INSIDE ZONE', 'duo': 'MAN'}
rows, runs = [], 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if concept:
        nfl = (raw.get('cell') or {}).get('concept')
        if not (str(raw['id']).startswith(concept + '/') or nfl == LABEL.get(concept, concept.upper())): continue
    p = Play(raw); c = raw['carrier']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kc = next((k for k in range(end + 1) if (p.pos(c, k)[0] if p.pos(c, k)[0] is not None else -99) >= 0), None)
    if kc is None: continue
    k = kc + int(round(AT / p.dt))
    if k > end: continue
    runs += 1
    blockers = [i for i in p.who('O') if i != c]
    cx, cy = p.pos(c, k)
    for d in p.who('D'):
        dx, dy = p.pos(d, k)
        if dx is None: continue
        dist = math.hypot(cx - dx, cy - dy)
        if dist > R or dist < 1e-6: continue
        ux, uy = (cx - dx) / dist, (cy - dy) / dist
        near = [b for b in blockers if p.dist(b, d, k) <= 1.2]
        state = 'free'
        if near:
            state = 'outside'
            for b in near:
                bx, by = p.pos(b, k)
                along = (bx - dx) * ux + (by - dy) * uy
                off = abs((bx - dx) * uy - (by - dy) * ux)
                if along >= .2 and along <= dist and off <= .9: state = 'walled'; break
        kmax = min(end, k + int(round(1.5 / p.dt)))
        reach = any(p.dist(c, d, kk) <= 1.0 for kk in range(k, kmax + 1))
        rows.append((raw['players'][d]['group'], 'near' if dist < 2.5 else 'mid', state, reach))
print(f"{path.split('/')[-1][:24]:24s} {concept or 'all'} runs crossing {runs} (at crossing+{AT:g}s, within {R:g} yd)")
for g in ('DL', 'LB', 'DB'):
    s = [r for r in rows if r[0] == g]
    if not s: continue
    parts = []
    for st in ('free', 'walled', 'outside'):
        t = [r for r in s if r[2] == st]
        parts.append(f"{st} {len(t)/max(1,runs):.2f}/run reach {100*sum(r[3] for r in t)/max(1,len(t)):3.0f}%")
    print(f"  {g}  n {len(s)/max(1,runs):.2f}/run (<2.5 yd {sum(r[1]=='near' for r in s)/max(1,runs):.2f}) | " + ' | '.join(parts))
