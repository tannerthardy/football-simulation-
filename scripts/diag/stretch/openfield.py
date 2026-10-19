"""Open-field encounters, one operator for NFL tracking and sim common plays.
For runs reaching FROM yd past the line, every defender's first frame within
R yd of the carrier while the carrier is FROM+ yd downfield is an encounter.
Outcome: 'ended' if the play ends within 1.0 s, 'broken' if the carrier is
still >= 4 yd/s 0.5 s later and gains >= 5 more yards, else 'slowed'. Also
the carrier's and defender's speed and their approach angle (behind: the
defender moves with the carrier, cos > 0.5; head-on: cos < -0.5).
usage: openfield.py FILE [FROM=8] [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, FROM, R = args[0], float(args[1]) if len(args) > 1 else 8.0, 1.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
rows = []; runs = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if not any((p.pos(c, k)[0] or -99) >= FROM for k in range(end + 1)): continue
    runs += 1
    for d in p.who('D'):
        k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= FROM and p.dist(c, d, k) <= R), None)
        if k is None: continue
        cx = p.pos(c, k)[0]
        a, b = max(0, k - 2), min(end, k + 2)
        vc = ((p.pos(c, b)[0] - p.pos(c, a)[0]), (p.pos(c, b)[1] - p.pos(c, a)[1]))
        vd = ((p.pos(d, b)[0] - p.pos(d, a)[0]), (p.pos(d, b)[1] - p.pos(d, a)[1]))
        nc, nd = math.hypot(*vc), math.hypot(*vd)
        cos = (vc[0] * vd[0] + vc[1] * vd[1]) / (nc * nd) if nc > 1e-6 and nd > 1e-6 else 0
        k5 = p.k(k * p.dt + .5)
        if (end - k) * p.dt <= 1.0: out = 'ended'
        elif k5 <= end and p.speed(c, k5) >= 4 and max(p.pos(c, kk)[0] for kk in range(k, end + 1)) - cx >= 5: out = 'broken'
        else: out = 'slowed'
        rows.append({'band': '8-20' if cx < 20 else '20+', 'out': out, 'cs': p.speed(c, k), 'ds': p.speed(d, k),
                     'ang': 'behind' if cos > .5 else 'headon' if cos < -.5 else 'side', 'group': raw['players'][d]['group']})
print(f"{path.split('/')[-1][:22]:22s} runs reaching {FROM:.0f}: {runs}, encounters {len(rows)} ({len(rows)/max(1,runs):.2f}/run)")
for band in ('8-20', '20+'):
    s = [r for r in rows if r['band'] == band]
    if not s: continue
    f = lambda o, sel: 100 * sum(1 for r in sel if r['out'] == o) / max(1, len(sel))
    print(f"  carrier at {band:5s} n {len(s):4d} | ended {f('ended', s):4.0f}% broken {f('broken', s):4.0f}% slowed {f('slowed', s):4.0f}% | carrier speed p50 {q([r['cs'] for r in s])} defender {q([r['ds'] for r in s])}")
    for ang in ('behind', 'side', 'headon'):
        t = [r for r in s if r['ang'] == ang]
        if t: print(f"     {ang:6s} {100*len(t)/len(s):3.0f}% n {len(t):4d} | ended {f('ended', t):4.0f}% broken {f('broken', t):4.0f}% | carrier speed p50 {q([r['cs'] for r in t])} defender {q([r['ds'] for r in t])}")
