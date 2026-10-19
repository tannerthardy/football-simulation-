"""Front-seven release and pursuit around the carrier's crossing, one operator
for NFL tracking and sim common plays. A defender counts as tied up when an
offensive player other than the carrier is within TIE yd of him (a
proximity proxy, not an engagement or force). For DL and
LB: share tied up at the crossing and 0.5/1.0 s later, and their speed and
closing rate toward the carrier 0.5 s after the crossing (tied-up vs free).
usage: release.py FILE [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]; TIE = 1.2
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}; runs = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    # Admit only plays live for a full second after the crossing; an index
    # past the recording must not clamp onto its final frame.
    ahead = lambda lag: kx + int(round(lag / p.dt))
    if kx is None or ahead(1.0) > end: continue
    runs += 1
    O = [i for i in p.who('O') if i != c]
    for d in p.who('D'):
        g = raw['players'][d]['group']
        if g not in ('DL', 'LB'): continue
        for lag in (0, .5, 1.0):
            k = ahead(lag)
            tied = any(p.dist(d, i, k) <= TIE for i in O)
            o.setdefault((g, lag), []).append(1 if tied else 0)
        k = ahead(.5); k0, k1 = max(0, k - 2), min(end, k + 2)
        if p.pos(d, k0)[0] is None or p.pos(d, k1)[0] is None: continue
        d0, d1 = p.dist(d, c, k0), p.dist(d, c, k1)
        tied = any(p.dist(d, i, k) <= TIE for i in O)
        o.setdefault((g, 'close', tied), []).append((d0 - d1) / ((k1 - k0) * p.dt))
        o.setdefault((g, 'speed', tied), []).append(p.speed(d, k))
print(f"{path.split('/')[-1][:22]:22s} runs {runs} (crossed, 1 s live after)")
for g in ('DL', 'LB'):
    t = ' '.join(f"+{lag}s {100*sum(o[(g, lag)])/len(o[(g, lag)]):.0f}%" for lag in (0, .5, 1.0))
    print(f"  {g}: tied up at crossing {t} | 0.5 s after: free closing p50 {q(o.get((g, 'close', False), []))} speed {q(o.get((g, 'speed', False), []))} (n {len(o.get((g, 'close', False), []))}) | tied closing {q(o.get((g, 'close', True), []))} speed {q(o.get((g, 'speed', True), []))}")
