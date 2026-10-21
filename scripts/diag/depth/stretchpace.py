"""The ball carrier's pace on stretch runs (outside/wide zone), one operator for
NFL tracking and sim common plays: lateral speed toward the play side and
depth from the line at handoff + 0.5 / 1.0 / 1.5 s, and when he crosses the
line. usage: stretchpace.py FILE [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import play_side  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != 'outside_zone': continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; s = play_side(p); h = (raw.get('events') or {}).get('handoff')
    if s is None or h is None: continue
    for dt in (.5, 1.0, 1.5):
        t = h + dt
        if not p.live(t): continue
        k = p.k(t); a, b = max(0, k - 2), min(p.frames - 1, k + 2)
        (xa, ya), (xb, yb) = p.pos(c, a), p.pos(c, b)
        if None in (xa, xb): continue
        o.setdefault(('lat', dt), []).append((yb - ya) * s / ((b - a) * p.dt))
        o.setdefault(('x', dt), []).append(p.pos(c, k)[0])
    kx = next((k for k in range(p.frames) if (p.pos(c, k)[0] or -99) > 0), None)
    if kx is not None: o.setdefault('cross', []).append(kx * p.dt - h)
print(f"{path.split('/')[-1][:24]:24s} stretch runs {len(o.get('cross', []))} crossing | crosses at handoff + p50 {q(o.get('cross', []))} s")
for dt in (.5, 1.0, 1.5):
    print(f"  handoff+{dt}: lateral toward play p25/50/75 {q(o.get(('lat', dt), []), .25)}/{q(o.get(('lat', dt), []))}/{q(o.get(('lat', dt), []), .75)} yd/s | depth p50 {q(o.get(('x', dt), []))}")
