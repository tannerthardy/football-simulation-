"""Is the edge kept? One operator for NFL tracking and sim common plays
(outside/wide zone). When the carrier crosses the line (or reaches his
widest point if he never crosses): how many defenders are outside him on his
side (farther from the ball laterally) within 0-10 yd past the line, and the
nearest such defender's lateral margin and depth. "Edge lost" = none outside.
Also by width at the crossing.
usage: edgelost.py FILE [--ytg60]"""
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
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9)); by = raw['ball_y']
    k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if k is None: continue
    cx, cy = p.pos(c, k); side = 1 if cy >= by else -1
    outs = [(abs(p.pos(d, k)[1] - by) - abs(cy - by), p.pos(d, k)[0]) for d in p.who('D') if p.pos(d, k)[0] is not None
            and (p.pos(d, k)[1] - by) * side > 0 and abs(p.pos(d, k)[1] - by) > abs(cy - by) and -1 <= p.pos(d, k)[0] <= 10]
    rows.append({'w': abs(cy - by), 'n': len(outs), 'm': min(outs)[0] if outs else None, 'dep': min(outs)[1] if outs else None, 'y': raw['yards']})
n = len(rows); lost = [r for r in rows if r['n'] == 0]
print(f"{path.split('/')[-1][:24]:24s} stretch runs crossing {n}: defenders outside the runner p50 {q([r['n'] for r in rows])} | edge lost {100*len(lost)/n:.0f}% (gain p50 {q([r['y'] for r in lost])}, 10+ {100*sum(r['y']>=10 for r in lost)/max(1,len(lost)):.0f}%) vs kept gain p50 {q([r['y'] for r in rows if r['n']])} (10+ {100*sum(r['y']>=10 for r in rows if r['n'])/max(1,n-len(lost)):.0f}%) | nearest outside margin p50 {q([r['m'] for r in rows if r['m'] is not None])} yd, depth {q([r['dep'] for r in rows if r['dep'] is not None])}")
