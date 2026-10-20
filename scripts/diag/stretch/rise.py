"""How quickly do players reach a moderate cruising speed? Episodes where a
player's speed (0.2 s central difference) rises from below 0.8 yd/s and then
holds a plateau P (all samples within +-0.35 of P for >= 0.5 s), P in a band.
Time from leaving 0.8 yd/s to first reaching 0.9 P. By plateau band, all
groups pooled and by group. Same operator for NFL (--ytg60) and sim.
usage: rise.py FILE [--ytg60]"""
import gzip, json, math, sys
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
bands = [(1.5, 2.5), (2.5, 3.5), (3.5, 4.5), (4.5, 6)]
res = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    xy, dt = raw['xy'], raw['dt']
    k1 = min(len(xy) - 2, int(4 / dt))
    for i, pl in enumerate(raw['players']):
        g = f"{pl['side']} {pl['group']}"
        s = []
        for k in range(1, k1):
            a, b = xy[k - 1], xy[k + 1]
            if a[2*i] is None or b[2*i] is None: break
            s.append(math.hypot(b[2*i] - a[2*i], b[2*i+1] - a[2*i+1]) / (2 * dt))
        k = 0
        while k < len(s) - 1:
            if s[k] < .8 <= s[k + 1]:
                start = k + 1
                # find plateau after start
                hold = int(round(.5 / dt))
                for j in range(start, len(s) - hold):
                    win = s[j:j + hold]
                    P = sum(win) / hold
                    if max(win) - P <= .35 and P - min(win) <= .35 and (j + hold >= len(s) or True):
                        break
                else:
                    k += 1; continue
                band = next((bd for bd in bands if bd[0] <= P < bd[1]), None)
                if band:
                    r = next(m for m in range(start, j + hold) if s[m] >= .9 * P)
                    t = (r - start) * dt
                    res.setdefault((band, 'all'), []).append(t); res.setdefault((band, g), []).append(t)
                k = j + hold
            else: k += 1
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))]
print(path.split('/')[-1])
for band in bands:
    keys = [k for k in res if k[0] == band]
    for k in sorted(keys, key=lambda k: (k[1] != 'all', k[1])):
        v = res[k]
        if len(v) < 30: continue
        print(f"  plateau {band[0]}-{band[1]} {k[1]:6s} n {len(v):5d} rise p25/p50/p75 {q(v,.25):.1f}/{q(v,.5):.1f}/{q(v,.75):.1f} s")
