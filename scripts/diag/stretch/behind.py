"""Gap runs: where the puller (OL with the largest lateral displacement to
1.5 s, over 2 yd) is relative to the back, x upfield, y toward the play side
(the back's lateral displacement to handoff +1.5 s), at handoff
+0.25/+0.5/+0.75/+1.0 s, and the back's velocity. NFL and sim common plays.
usage: behind.py FILE CONCEPT (NFL label or sim id prefix, case-insensitive)"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
path, want = sys.argv[1], sys.argv[2]
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
q = lambda v: f"{sorted(v)[len(v)//4]:.2f}/{sorted(v)[len(v)//2]:.2f}/{sorted(v)[3*len(v)//4]:.2f}" if v else '-'
T = (.25, .5, .75, 1.0); R = {t: ([], [], [], []) for t in T}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    con = (raw.get('cell') or {}).get('concept') or ''
    if con.lower() != want.lower(): continue
    if raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; h = (raw.get('events') or {}).get('handoff')
    if h is None or raw['players'][c]['group'] != 'RB' or not p.live(h + 1.5): continue
    ol = [i for i, pl in enumerate(raw['players']) if pl['side'] == 'O' and pl['group'] == 'OL']
    best, bd = None, 2.0
    for i in ol:
        a, b = p.pos(i, 0), p.pos(i, p.k(1.5))
        if a[0] is None or b[0] is None: continue
        if abs(b[1] - a[1]) > bd: best, bd = i, abs(b[1] - a[1])
    if best is None: continue
    side = math.copysign(1, p.pos(c, p.k(h + 1.5))[1] - p.pos(c, p.k(h))[1])
    n += 1
    for t in T:
        k = p.k(h + t); (bx, by), (px, py) = p.pos(c, k), p.pos(best, k)
        if bx is None or px is None: continue
        R[t][0].append(px - bx); R[t][1].append((py - by) * side)
        (x0, y0), (x1, y1) = p.pos(c, p.k(h + t - .05)), p.pos(c, p.k(h + t + .05))
        dt = (p.k(h + t + .05) - p.k(h + t - .05)) * p.dt
        if dt > 0 and x0 is not None and x1 is not None: R[t][2].append((y1 - y0) / dt * side); R[t][3].append((x1 - x0) / dt)
print(f"{path.split('/')[-1][:22]:22s} {want} n {n}")
for t in T: print(f"  +{t:.2f}s puller rel back: upfield {q(R[t][0])} toward play {q(R[t][1])} | back v upfield {q(R[t][3])} toward play {q(R[t][2])}")
