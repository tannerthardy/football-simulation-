"""Second-level motion before the crossing, one operator for NFL tracking and
sim common plays. Second-level defenders: 2-8 yd deep and within 7 yd of the
ball laterally at the snap. At the handoff, handoff + 0.5 s and the carrier's
crossing: speed, downhill velocity (toward the line, +), lateral velocity
toward the carrier's side (+), depth, and distance to the carrier.
usage: lbmotion.py FILE [--ytg60] [--fam inside_zone]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}; runs = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    concept = raw['id'].split('/')[0] if raw.get('source') == 'sim' else (raw.get('cell') or {}).get('concept')
    if fam and CONCEPT_FAMILY.get(concept) != fam: continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if ev.get('handoff') is None: continue
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if kx is None: continue
    runs += 1
    side = math.copysign(1, p.pos(c, kx)[1] - by)
    sec = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and 2 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - by) <= 7]
    for tag, k in (('hand', p.k(ev['handoff'])), ('h+.5', p.k(ev['handoff'] + .5)), ('cross', kx)):
        if k > end: continue
        for d in sec:
            a, b = max(0, k - 2), min(end, k + 2)
            if p.pos(d, a)[0] is None or p.pos(d, b)[0] is None: continue
            vx = (p.pos(d, b)[0] - p.pos(d, a)[0]) / ((b - a) * p.dt); vy = (p.pos(d, b)[1] - p.pos(d, a)[1]) / ((b - a) * p.dt)
            for key, val in (('speed', math.hypot(vx, vy)), ('down', -vx), ('lat', vy * side), ('depth', p.pos(d, k)[0]), ('dist', p.dist(c, d, k))):
                o.setdefault((tag, key), []).append(val)
print(f"{path.split('/')[-1][:22]:22s} runs {runs} {fam or ''}")
for tag in ('hand', 'h+.5', 'cross'):
    print(f"  at {tag:5s}: " + ' | '.join(f"{key} {q(o.get((tag, key), []))}" for key in ('speed', 'down', 'lat', 'depth', 'dist')))
