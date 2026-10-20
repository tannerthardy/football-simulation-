"""Pursuit angles on long runs, one operator for NFL tracking and sim common
plays. For runs reaching REF yd, at that frame each defender gets the
straight-line intercept test of pursuit.py (his whole-play peak speed, 0.3 s
to react, 1 yd reach) against the runner's actual later path. For every
defender who could intercept before REF+30: did he actually get within
REACH yd of the runner, and if not, at his closest approach was he behind
the runner (beaten angle) or level/ahead but wide; plus his mean speed over
the following second as a share of his peak. Split by whether the run went 40+.
usage: angles.py FILE [REF=10] [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, REF = args[0], float(args[1]) if len(args) > 1 else 10.0
REACT, REACH, FLOOR = 0.3, 1.0, 5.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
out = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k0 = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= REF), None)
    if k0 is None: continue
    later = [(k, p.pos(c, k)) for k in range(k0, end + 1) if p.pos(c, k)[0] is not None]
    key = '40+' if raw['yards'] >= 40 else '<40'
    o = out.setdefault(key, {'runs': 0, 'feas': 0, 'got': 0, 'behind': 0, 'wide': 0, 'eff': [], 'gotEff': []})
    o['runs'] += 1
    for d in p.who('D'):
        x0, y0 = p.pos(d, k0)
        if x0 is None: continue
        peak = max([p.speed(d, k) or 0 for k in range(0, end + 1, 2)] + [FLOOR])
        feas = False
        for k, (cx, cy) in later:
            if cx >= REF + 30: break
            if math.hypot(cx - x0, cy - y0) <= peak * max(0, (k - k0) * p.dt - REACT) + REACH: feas = True; break
        if not feas: continue
        o['feas'] += 1
        dmin, kmin = min((p.dist(c, d, k), k) for k, _ in later)
        k1 = min(end, k0 + 10)
        eff = sum(p.speed(d, k) for k in range(k0, k1 + 1)) / max(1, k1 - k0 + 1) / peak
        if dmin <= 1.5: o['got'] += 1; o['gotEff'].append(eff)
        else:
            o['eff'].append(eff)
            if (p.pos(d, kmin)[0] or 0) < p.pos(c, kmin)[0] - .5: o['behind'] += 1
            else: o['wide'] += 1
print(f"{path.split('/')[-1][:24]:24s} at +{REF:.0f}")
for key in ('<40', '40+'):
    o = out.get(key)
    if not o: continue
    miss = o['feas'] - o['got']
    print(f"  {key}: runs {o['runs']} | feasible interceptors {o['feas']/o['runs']:.2f}/run, got within 1.5 yd {100*o['got']/max(1,o['feas']):.0f}% | missed: closest while behind him {100*o['behind']/max(1,miss):.0f}%, level/ahead but wide {100*o['wide']/max(1,miss):.0f}% | next-second speed / peak: missed p50 {q(o['eff'])}, got p50 {q(o['gotEff'])}")
