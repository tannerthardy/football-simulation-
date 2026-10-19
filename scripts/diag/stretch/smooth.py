"""How smooth is movement? One operator for NFL tracking and sim common plays,
both at 10 Hz and 0.01 yd. Per player, from the snap to min(end, 3.5 s), by
group (and the carrier separately, after the handoff):
  speed      median and p90 of speed (0.2 s central difference), yd/s
  pulses/s   speed oscillations: local speed extrema per second whose swing
             to the next extremum is at least 0.5 yd/s
  turn       median heading change per 0.1 s while moving faster than 2 yd/s
  wobble/s   reversals per second of the turning direction (left/right),
             counting turns of at least 5 degrees per 0.1 s
  lat rev/s  reversals per second of lateral velocity (beyond 0.5 yd/s)
Each count is also split by whether the player was within 1.2 yd of an
opponent at that frame (contact or about to be) or free; seconds likewise.
Raw coordinates (not metrics.Play, which rounds to 0.1 yd).
usage: smooth.py FILE [--ytg60] [--concepts power,counter] (sim id prefixes or NFL labels)"""
import gzip, json, math, sys
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = [c.lower() for c in opt('--concepts', '').split(',') if c]
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))] if v else float('nan')
acc = {}


def add(key, **vals):
    row = acc.setdefault(key, {'speed': [], 'pulses': 0.0, 'turn': [], 'wobble': 0.0, 'lat': 0.0, 'sec': 0.0,
                               'pc': 0.0, 'wc': 0.0, 'secc': 0.0})
    for k, v in vals.items():
        if isinstance(row[k], list): row[k].extend(v)
        else: row[k] += v


def measure(xy, i, k0, k1, dt, opp):
    pts = [(xy[k][2 * i], xy[k][2 * i + 1]) for k in range(k0, k1 + 1)]
    if any(p[0] is None for p in pts) or len(pts) < 6: return None
    near = [any(xy[k][2 * j] is not None and math.hypot(xy[k][2 * j] - pts[k - k0][0], xy[k][2 * j + 1] - pts[k - k0][1]) < 1.2 for j in opp)
            for k in range(k0, k1 + 1)][1:-1]
    v = [((pts[k + 1][0] - pts[k - 1][0]) / (2 * dt), (pts[k + 1][1] - pts[k - 1][1]) / (2 * dt)) for k in range(1, len(pts) - 1)]
    s = [math.hypot(*u) for u in v]
    # Speed extrema with a swing of at least 0.5 yd/s (hysteresis).
    ext, extc, last, direction = 0, 0, s[0], 0
    for idx, x in enumerate(s[1:], 1):
        if direction >= 0 and x < last - .5: ext += direction > 0; extc += direction > 0 and near[idx]; direction, last = -1, x
        elif direction <= 0 and x > last + .5: ext += direction < 0; extc += direction < 0 and near[idx]; direction, last = 1, x
        elif (direction >= 0 and x > last) or (direction <= 0 and x < last): last = x
    turns, wob, wobc, sign = [], 0, 0, 0
    for idx, (a, b, sa, sb) in enumerate(zip(v, v[1:], s, s[1:])):
        if sa < 2 or sb < 2: continue
        d = math.degrees(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]))
        turns.append(abs(d))
        sg = (d > 5) - (d < -5)
        if sg and sign and sg != sign: wob += 1; wobc += near[idx + 1]
        if sg: sign = sg
    lat, ls = 0, 0
    for u in v:
        sg = (u[1] > .5) - (u[1] < -.5)
        if sg and ls and sg != ls: lat += 1
        if sg: ls = sg
    secs = (len(pts) - 1) * dt
    return dict(speed=s, pulses=ext, turn=turns, wobble=wob, lat=lat, sec=secs, pc=extc, wc=wobc, secc=sum(near) * dt)


n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    con = str((raw.get('cell') or {}).get('concept') or '').lower()
    if want and not any(str(raw['id']).lower().startswith(c + '/') or con == c for c in want): continue
    dt, xy, ev = raw['dt'], raw['xy'], raw.get('events') or {}
    end = min(ev.get('end', 3.5), 3.5, (len(xy) - 1) * dt)
    k1 = int(round(end / dt))
    if k1 < 8: continue
    n += 1
    side = {pl['side'] for pl in raw['players']}
    opp = {sd: [j for j, q2 in enumerate(raw['players']) if q2['side'] != sd] for sd in side}
    for i, pl in enumerate(raw['players']):
        if i == raw['carrier']: continue
        m = measure(xy, i, 0, k1, dt, opp[pl['side']])
        if m: add(f"{pl['side']} {pl['group']}", **m)
    h = ev.get('handoff')
    if h is not None and raw['players'][raw['carrier']]['group'] == 'RB':
        m = measure(xy, raw['carrier'], int(round(h / dt)), k1, dt, opp['O'])
        if m: add('O carrier after the handoff', **m)

print(f"{path.split('/')[-1][:26]:26s} runs {n}{' (' + ','.join(want) + ')' if want else ''}")
print(f"  {'group':28s} {'speed p50/p90':>14s} {'pulses/s':>9s} {'turn deg':>9s} {'wobble/s':>9s} {'lat rev/s':>9s} | near opp: share, pulses/s, wobble/s | free: pulses/s, wobble/s")
for key in sorted(acc):
    r = acc[key]
    if r['sec'] <= 0: continue
    fs = max(1e-9, r['sec'] - r['secc']); cs = max(1e-9, r['secc'])
    print(f"  {key:28s} {q(r['speed'], .5):6.2f}/{q(r['speed'], .9):5.2f}   {r['pulses'] / r['sec']:7.2f}   {q(r['turn'], .5):7.1f}   {r['wobble'] / r['sec']:7.2f}   {r['lat'] / r['sec']:7.2f}"
          f" | {r['secc'] / r['sec']:4.0%} {r['pc'] / cs:5.2f} {r['wc'] / cs:5.2f} | {(r['pulses'] - r['pc']) / fs:5.2f} {(r['wobble'] - r['wc']) / fs:5.2f}")
