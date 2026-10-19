"""Openings in the line as the runner approaches it, one operator for NFL
tracking and sim common plays. When the carrier first reaches DEPTH yd behind
the line (default -2): bodies within 1.6 yd of the line and 8 yd of the ball
(both teams, not the carrier or QB), taken as 0.3 yd discs and sorted
laterally (signed by his first track, as lanes.py). An opening is clear
space between neighbouring discs of at least MIN yd; each is labelled by its
centre: cutback (< -1), middle (-1..1), playside (1..4), outside (> 4).
Reported per lane: share of plays with an opening there, median width, and
how often the runner then crossed in that lane. usage: lineholes.py FILE
[--ytg60] [--fam F] [--nfl-forms F,..] [--depth -2] [--min 1.0]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = opt('--fam'); forms = tuple(opt('--nfl-forms').split(',')) if opt('--nfl-forms') else None
F = json.load(open('out/mechanics/nfl-formation.json')) if forms else {}
DEPTH, MIN, R = float(opt('--depth', -2)), float(opt('--min', 1.0)), 0.3
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
lane = lambda y: 'cutback' if y < -1 else 'middle' if y <= 1 else 'playside' if y <= 4 else 'outside'
o = {}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if fam and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    if forms and raw.get('source') != 'sim' and F.get(raw['id']) not in forms: continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if ev.get('handoff') is None: continue
    k1 = p.k(ev['handoff'] + .3)
    kd = next((k for k in range(p.k(ev['handoff']), end + 1) if (p.pos(c, k)[0] or -99) >= DEPTH), None)
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if kd is None or kx is None or k1 > end or p.pos(c, k1)[1] is None: continue
    s = 1 if p.pos(c, k1)[1] - p.pos(c, 0)[1] >= 0 else -1
    qb = set(p.who('O', 'QB'))
    ys = sorted((p.pos(i, kd)[1] - by) * s for i in range(p.n) if i != c and i not in qb and p.pos(i, kd)[0] is not None
                and abs(p.pos(i, kd)[0]) <= 1.6 and abs(p.pos(i, kd)[1] - by) <= 8)
    if len(ys) < 5: continue
    n += 1
    took = lane((p.pos(c, kx)[1] - by) * s)
    seen = {}
    for a, b in zip(ys, ys[1:]):
        w = b - a - 2 * R
        if w >= MIN:
            L = lane((a + b) / 2); seen[L] = max(seen.get(L, 0), w)
    combo = ('P' if 'playside' in seen else 'p') + ('M' if 'middle' in seen else 'm')
    o.setdefault(('combo', combo), []).append(took)
    for L in ('cutback', 'middle', 'playside', 'outside'):
        if L in seen:
            o.setdefault((L, 'open'), []).append(seen[L]); o.setdefault((L, 'took'), []).append(1 if took == L else 0)
        o.setdefault((L, 'cross'), []).append(1 if took == L else 0)
print(f"{path.split('/')[-1][:22]:22s} {fam or 'all'} plays {n} (runner at {DEPTH} yd, openings >= {MIN} yd)")
for L in ('cutback', 'middle', 'playside', 'outside'):
    op = o.get((L, 'open'), [])
    print(f"  {L:8s} opening {100*len(op)/max(1,n):3.0f}% width p50 {q(op)} | runner took it when open {100*sum(o.get((L,'took'),[]))/max(1,len(op)):3.0f}% | crossed there overall {100*sum(o.get((L,'cross'),[]))/max(1,n):3.0f}%")
print('  by openings (P/p playside open/closed, M/m middle):')
for combo in ('PM', 'Pm', 'pM', 'pm'):
    t = o.get(('combo', combo), [])
    if t: print(f"    {combo} {100*len(t)/n:3.0f}% of plays -> crossed " + ' '.join(f"{L} {100*t.count(L)/len(t):.0f}%" for L in ('cutback', 'middle', 'playside', 'outside')))
