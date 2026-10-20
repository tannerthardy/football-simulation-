"""Do defenders go to the ball once the run shows? One operator for NFL
tracking and sim common plays (raw 10 Hz, 0.01 yd). From the handoff + 0.5 s
to the end (or first contact + 0.5 s) by defensive group: the share of time
moving slower than 1.5 yd/s (parked), median speed, and the share of time
whose motion closes on the carrier (velocity component toward him > 1 yd/s).
usage: purpose.py FILE [--ytg60] [--concepts power,counter]"""
import gzip, json, math, sys
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = [c.lower() for c in opt('--concepts', '').split(',') if c]
grp = {}
n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    con = str((raw.get('cell') or {}).get('concept') or '').lower()
    if want and not any(str(raw['id']).lower().startswith(c + '/') or con == c for c in want): continue
    ev = raw.get('events') or {}; h = ev.get('handoff')
    if h is None: continue
    dt, xy, c = raw['dt'], raw['xy'], raw['carrier']
    end = min(ev.get('end', 99), ev.get('first_contact', 99) + .5, (len(xy) - 2) * dt)
    k0, k1 = int(round((h + .5) / dt)), int(round(end / dt))
    if k1 - k0 < 3: continue
    n += 1
    for i, pl in enumerate(raw['players']):
        if pl['side'] != 'D': continue
        g = grp.setdefault(pl['group'], {'park': 0, 'close': 0, 'all': 0, 'speed': []})
        for k in range(max(1, k0), k1):
            a, b, cp = xy[k - 1], xy[k + 1], xy[k]
            if None in (a[2 * i], b[2 * i], cp[2 * c], cp[2 * i]): continue
            vx, vy = (b[2 * i] - a[2 * i]) / (2 * dt), (b[2 * i + 1] - a[2 * i + 1]) / (2 * dt)
            s = math.hypot(vx, vy)
            dx, dy = cp[2 * c] - cp[2 * i], cp[2 * c + 1] - cp[2 * i + 1]; d = math.hypot(dx, dy) or 1
            g['all'] += 1; g['speed'].append(s)
            g['park'] += s < 1.5
            g['close'] += (vx * dx + vy * dy) / d > 1
print(f"{path.split('/')[-1][:26]:26s} runs {n}")
for k, g in sorted(grp.items()):
    sp = sorted(g['speed'])
    print(f"  {k:3s} parked {100 * g['park'] / g['all']:4.0f}% | speed p50 {sp[len(sp) // 2]:4.2f} | closing on the carrier {100 * g['close'] / g['all']:4.0f}%")
