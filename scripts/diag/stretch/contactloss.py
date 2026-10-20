"""Speed the runner keeps through encounters that do not end the play, one
operator for NFL tracking and sim common plays. Past FROM yd, each
defender's first approach within R yd of the carrier; kept only when the run
then continues at least 3 more yards. The carrier's speed at the approach and
his lowest speed over the next 0.5 s, by defender approach (behind: moving
with the carrier, cos > 0.5; otherwise side/head-on).
usage: contactloss.py FILE [FROM=5] [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, FROM, R = args[0], float(args[1]) if len(args) > 1 else 5.0, 1.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    seen = set()
    for k in range(end + 1):
        cx = p.pos(c, k)[0]
        if cx is None or cx < FROM: continue
        for d in p.who('D'):
            if d in seen or p.dist(c, d, k) > R: continue
            seen.add(d)
            if max(p.pos(c, j)[0] or -99 for j in range(k, end + 1)) < cx + 3: continue
            k1 = min(end, k + 5)
            v0 = p.speed(c, k); vmin = min(p.speed(c, j) for j in range(k, k1 + 1))
            vc, vd = p.velocity(c, k), p.velocity(d, k)
            cos = (vc[0] * vd[0] + vc[1] * vd[1]) / ((math.hypot(*vc) or 1) * (math.hypot(*vd) or 1))
            g = 'behind' if cos > .5 else 'side/head-on'
            r = o.setdefault(g, {'v0': [], 'vmin': [], 'loss': []}); r['v0'].append(v0); r['vmin'].append(vmin); r['loss'].append(v0 - vmin)
print(f"{path.split('/')[-1][:24]:24s} encounters past +{FROM:.0f} that the run continues 3+ yd beyond:")
for g, r in o.items():
    print(f"  {g:13s} n {len(r['v0']):4d} | carrier speed at approach p50 {q(r['v0'])} | lowest next 0.5 s p50 {q(r['vmin'])} | speed lost p25/p50/p75 {q(r['loss'],.25)}/{q(r['loss'])}/{q(r['loss'],.75)}")
