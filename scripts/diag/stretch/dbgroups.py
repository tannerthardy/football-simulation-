"""Secondary depth on runs by snap alignment group, one operator for NFL
tracking and sim common plays. Defenders >= 5 yd off the ball at the snap:
deep (>= 10), off-wide (5-10, > 8 yd from the ball laterally: off corners),
mid-inside (5-10, within 8 yd). Per group: n, depth past the line at the
snap, at handoff +0.5 s and when the carrier crosses, and how much depth they
gave up before the crossing (p25/50/75). usage: dbgroups.py FILE [--ytg60] [--sim-form F]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if raw.get('source') == 'sim' and opt('--sim-form') and not raw['id'].split('/')[2].startswith(opt('--sim-form')): continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    kh = p.k(ev['handoff'] + .5) if ev.get('handoff') is not None else None
    if kx is None or kh is None or kh > end: continue
    for d in p.who('D'):
        x0, y0 = p.pos(d, 0)
        if x0 is None or x0 < 5 or p.pos(d, kh)[0] is None or p.pos(d, kx)[0] is None: continue
        g = 'deep' if x0 >= 10 else 'off-wide' if abs(y0 - by) > 8 else 'mid-inside'
        o.setdefault(g, {}).setdefault('snap', []).append(x0)
        o[g].setdefault('h', []).append(p.pos(d, kh)[0]); o[g].setdefault('x', []).append(p.pos(d, kx)[0])
        o[g].setdefault('give', []).append(x0 - p.pos(d, kx)[0])
    o.setdefault('_n', []).append(kx * p.dt)
print(f"{path.split('/')[-1][:22]:22s} runs {len(o.get('_n', []))}, carrier crosses at p50 {q(o.get('_n', []))} s")
for g in ('deep', 'off-wide', 'mid-inside'):
    v = o.get(g)
    if not v: continue
    print(f"  {g:10s} n/run {len(v['snap'])/len(o['_n']):.2f} | depth snap {q(v['snap'])} h+.5 {q(v['h'])} cross {q(v['x'])} | depth given up by crossing p25/50/75 {q(v['give'], .25)}/{q(v['give'])}/{q(v['give'], .75)}")
