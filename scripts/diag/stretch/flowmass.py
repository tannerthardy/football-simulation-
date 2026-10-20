"""How much does each group move in the first 3 s, and how fast while in
contact range? One operator for NFL tracking and sim common plays (raw 10 Hz).
Per player, snap to min(end, 3.0 s): path length and net displacement; and
speed while within 1.2 yd of an opponent (in contact range) vs while free.
usage: flowmass.py FILE [--ytg60] [--concepts power,counter]"""
import gzip, json, math, sys
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = [c.lower() for c in opt('--concepts', '').split(',') if c]
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))] if v else float('nan')
G = {}
n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    con = str((raw.get('cell') or {}).get('concept') or '').lower()
    if want and not any(str(raw['id']).lower().startswith(c + '/') or con == c for c in want): continue
    dt, xy, ev = raw['dt'], raw['xy'], raw.get('events') or {}
    k1 = int(round(min(ev.get('end', 3.0), 3.0, (len(xy) - 2) * dt) / dt))
    if k1 < 20: continue
    n += 1
    P = raw['players']
    for i, pl in enumerate(P):
        if i == raw['carrier'] or pl['group'] in ('WR', 'QB'): continue
        pts = [(xy[k][2 * i], xy[k][2 * i + 1]) for k in range(0, k1 + 1)]
        if any(p[0] is None for p in pts): continue
        g = G.setdefault(pl['side'] + ' ' + pl['group'], {'len': [], 'net': [], 'vc': [], 'vf': []})
        g['len'].append(sum(math.dist(pts[k], pts[k + 1]) for k in range(k1)))
        g['net'].append(math.dist(pts[0], pts[-1]))
        opp = [j for j, q2 in enumerate(P) if q2['side'] != pl['side']]
        for k in range(1, k1):
            v = math.dist(pts[k - 1], pts[k + 1]) / (2 * dt)
            near = any(xy[k][2 * j] is not None and math.hypot(xy[k][2 * j] - pts[k][0], xy[k][2 * j + 1] - pts[k][1]) < 1.2 for j in opp)
            (g['vc'] if near else g['vf']).append(v)
print(f"{path.split('/')[-1][:26]:26s} runs {n} | per player, 0-3 s")
for k, g in sorted(G.items()):
    print(f"  {k:5s} path {q(g['len'], .5):4.1f} yd (p90 {q(g['len'], .9):4.1f}) net {q(g['net'], .5):4.1f} | speed in contact range p50/p90 {q(g['vc'], .5):4.2f}/{q(g['vc'], .9):4.2f} ({100 * len(g['vc']) / max(1, len(g['vc']) + len(g['vf'])):3.0f}% of time) | free {q(g['vf'], .5):4.2f}/{q(g['vf'], .9):4.2f}")
