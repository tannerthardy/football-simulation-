"""How wide stretch runs go before turning up, one operator for NFL tracking
and sim common plays (outside/wide zone). Per run: the carrier's lateral
distance from the ball when he crosses the line (or his widest point behind
it if he never crosses), the time of the crossing, and whether the run lost
yards. Distribution, and the loss rate by width.
usage: bounce.py FILE [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
rows = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if raw.get('source') == 'sim':
        if raw['id'].split('/')[0] not in ('oz', 'wz'): continue
    else:
        if ytg is not None and ytg.get(raw['id'], 0) < 60: continue
        if (raw.get('cell') or {}).get('concept') != 'OUTSIDE ZONE': continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    by = raw['ball_y']
    k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if k is not None: w, t = abs(p.pos(c, k)[1] - by), k * p.dt
    else: w, t = max(abs((p.pos(c, j)[1] or by) - by) for j in range(end + 1)), None
    rows.append({'w': w, 't': t, 'neg': raw['yards'] < 0, 'crossed': k is not None, 'y': raw['yards']})
n = len(rows)
print(f"{path.split('/')[-1][:24]:24s} stretch runs {n}: crossed {100*sum(r['crossed'] for r in rows)/n:.0f}% | width at crossing p25/p50/p75 {q([r['w'] for r in rows if r['crossed']],.25)}/{q([r['w'] for r in rows if r['crossed']])}/{q([r['w'] for r in rows if r['crossed']],.75)} yd, crossing time p50 {q([r['t'] for r in rows if r['crossed']])} s | loss rate: " + '  '.join(f"{lo}-{hi} yd {100*sum(r['neg'] for r in s)/len(s):.0f}% of {100*len(s)/n:.0f}%" for lo, hi in ((0, 3), (3, 6), (6, 9), (9, 99)) for s in [[r for r in rows if lo <= r['w'] < hi]] if s))
