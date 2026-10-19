"""Open-field pursuit feasibility, one operator for NFL tracking and sim common
plays. For runs reaching REF yd past the line, at that frame every defender
gets a straight-line intercept test against the runner's actual later path:
he can be there if dist <= V * (dt - REACT) + REACH, where V is his own peak
speed observed in the play (floor FLOOR yd/s). Reported: how many defenders
could intercept before the runner reaches +20 / +40 yd past REF, the earliest
feasible intercept depth, and where the run actually ended; split by whether
the run went 40+. Ignores blockers, cuts and tackling: a placement measure.
usage: pursuit.py FILE.jsonl.gz [REF=10] [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, REF = args[0], float(args[1]) if len(args) > 1 else 10.0
REACT, REACH, FLOOR = 0.3, 1.0, 5.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
rows = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line)
    raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k0 = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= REF), None)
    if k0 is None: continue
    later = [(k, p.pos(c, k)) for k in range(k0, end + 1) if p.pos(c, k)[0] is not None]
    feas20 = feas40 = 0; earliest = None
    for d in p.who('D'):
        x0, y0 = p.pos(d, k0)
        if x0 is None: continue
        peak = max([p.speed(d, k) or 0 for k in range(0, end + 1, 2)] + [FLOOR])
        for k, (cx, cy) in later:
            dt = (k - k0) * p.dt
            if math.hypot(cx - x0, cy - y0) <= peak * max(0, dt - REACT) + REACH:
                if cx < REF + 20: feas20 += 1
                if cx < REF + 40: feas40 += 1
                earliest = cx if earliest is None else min(earliest, cx)
                break
    final = max(x for _, (x, _) in later)
    rows.append({'feas20': feas20, 'feas40': feas40, 'earliest': earliest, 'final': final, 'long': raw['yards'] >= 40,
                 'ahead': sum(1 for d in p.who('D') if (p.pos(d, k0)[0] or -99) > p.pos(c, k0)[0])})
n = len(rows)
print(f"{path.split('/')[-1]:24s} runs reaching {REF:.0f} yd: {n}")
for label, sel in (('all', rows), ('ended 40+', [r for r in rows if r['long']]), ('ended <40', [r for r in rows if not r['long']])):
    if not sel: continue
    none = sum(1 for r in sel if r['feas40'] == 0)
    print(f"  {label:9s} n {len(sel):4d} | defenders ahead p50 {q([r['ahead'] for r in sel])} | can intercept within +20: p50 {q([r['feas20'] for r in sel])}  within +40: p50 {q([r['feas40'] for r in sel])}, none {100*none/len(sel):.0f}% | earliest feasible depth p50 {q([r['earliest'] for r in sel if r['earliest'] is not None])} | actual end p50 {q([r['final'] for r in sel])}")
