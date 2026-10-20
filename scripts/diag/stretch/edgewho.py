"""Who keeps the edge on stretch runs, and where? Same operator for NFL and
sim (outside/wide zone). At the crossing frame and 0.8 s earlier: the
runner's width from the ball, defenders outside him on his side (-1..10 yd
past the line) by group, and the nearest outside DB's margin and depth.
usage: edgewho.py FILE [--ytg60]"""
import gzip, json, sys
from collections import Counter
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
res = {lag: {'w': [], 'grp': Counter(), 'db': [], 'dbd': [], 'any': 0, 'n': 0} for lag in (0, 8)}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if raw.get('source') == 'sim':
        if raw['id'].split('/')[0] not in ('oz', 'wz'): continue
    else:
        if ytg is not None and ytg.get(raw['id'], 0) < 60: continue
        if (raw.get('cell') or {}).get('concept') != 'OUTSIDE ZONE': continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9)); by = raw['ball_y']
    k0 = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if k0 is None: continue
    side = 1 if p.pos(c, k0)[1] >= by else -1
    for lag, R in res.items():
        k = k0 - lag
        if k < 0: continue
        cx, cy = p.pos(c, k); w = (cy - by) * side
        R['n'] += 1; R['w'].append(w)
        outs = [(d, (p.pos(d, k)[1] - by) * side - w, p.pos(d, k)[0]) for d in p.who('D') if p.pos(d, k)[0] is not None
                and (p.pos(d, k)[1] - by) * side > w and -1 <= p.pos(d, k)[0] <= 10]
        for d, m, x in outs: R['grp'][p.players[d]['group']] += 1
        R['any'] += bool(outs)
        dbs = [(m, x) for d, m, x in outs if p.players[d]['group'] in ('DB', 'CB', 'S', 'SAF')]
        if dbs: m, x = min(dbs); R['db'].append(m); R['dbd'].append(x)
for lag, R in res.items():
    n = R['n']
    print(f"{path.split('/')[-1][:22]:22s} t-{lag/10:.1f}s n {n}: runner width {q(R['w'])} | outside per run " +
          ' '.join(f"{g} {R['grp'][g]/n:.2f}" for g in sorted(R['grp'])) +
          f" | none {100*(n-R['any'])/n:.0f}% | outside DB present {100*len(R['db'])/n:.0f}% margin {q(R['db'])} depth {q(R['dbd'])}")
