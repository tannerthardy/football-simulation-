"""Variant (d2) of cue_onset.py's QB-shoulders cue (Defense, 2026-11-16; written by Tools against Defense's operator): the first frame where the QB's chest-to-target angle starts closing from its plant value.
Population, the first arriver and his onset are cue_onset.py's, unchanged (imported by copy of its operator). The QB's chest angle is |orientation 'o' - bearing from the QB to the target| (deg). The plant is the QB-set frame of cue (b)
(under 1 yd/s after giving 1+ yd; no plant, no row). The angle is closing at frame k when it is 4 deg or more smaller than 0.2 s earlier. The cue is the start of the last run of closing frames that lasts to the throw, found at or after the plant.
Reports the chest angle at the plant (the QB lane's read: 30-75 deg off the line at the plant), how long before the throw the cue is, and the defender onset minus the cue, by layer.
usage: python3 -I cue_chest_close.py FILE (export with 'o')"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
out = []
for line in gzip.open(sys.argv[1], 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None or not raw.get('o'): continue
    ev = raw.get('events') or {}; tc, tt = ev.get('catch'), ev.get('pass_forward')
    if tc is None or tt is None or tt <= 0.5: continue
    if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
    p = Play(raw); r = raw['target']; kc, kt = p.k(tc), p.k(tt)
    x = p.pos(r, kc)[0]
    if x is None or not (0 <= x <= 12): continue
    D = [d for d in p.who('D') if p.pos(d, kc)[0] is not None and p.pos(d, 0)[0] is not None]
    if len(D) < 2: continue
    f = min(D, key=lambda d: p.dist(d, r, kc)); d0 = p.pos(f, 0)[0]
    if d0 < 2: continue
    layer = 'underneath' if d0 < 9 else 'deep'
    def close(k):
        (dx, dy), (rx, ry) = p.pos(f, k), p.pos(r, k)
        if dx is None or rx is None: return None
        vx, vy = p.velocity(f, k); L = math.hypot(rx - dx, ry - dy) or 1
        return (vx * (rx - dx) + vy * (ry - dy)) / L
    onset = None
    if (close(kt) or 0) > 0.5:
        k = kt
        while k > 0 and (close(k - 1) or 0) > 0.5: k -= 1
        onset = k * p.dt
    if onset is None: continue
    qb = next((i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] == 'QB'), None)
    if qb is None or p.pos(qb, 0)[0] is None: continue
    x0 = p.pos(qb, 0)[0]; back = False; plant = None
    for k in range(1, kt + 1):
        if p.pos(qb, k)[0] is None: continue
        if x0 - p.pos(qb, k)[0] >= 1: back = True
        if back and p.speed(qb, k) < 1: plant = k; break
    if plant is None: continue
    O = raw['o']
    def ang(k):
        if k >= len(O) or O[k][qb] is None or p.pos(qb, k)[0] is None or p.pos(r, k)[0] is None: return None
        (qx, qy), (rx, ry) = p.pos(qb, k), p.pos(r, k)
        return abs((O[k][qb] - math.degrees(math.atan2(ry - qy, rx - qx)) + 540) % 360 - 180)
    a0 = ang(plant)
    if a0 is None: continue
    cue = None
    for k in range(kt, plant + 1, -1):
        a, b = ang(k), ang(k - 2)
        if a is None or b is None or b - a < 4: break
        cue = k - 2
    out.append({'layer': layer, 'a0': a0, 'cue': None if cue is None else cue * p.dt, 'throw': kt * p.dt, 'onset': onset, 'plant': plant * p.dt})
print(f'{sys.argv[1]}: zone first arrivers closing at the throw, QB plant found')
for layer in ('underneath', 'deep', 'all'):
    R = [o for o in out if layer == 'all' or o['layer'] == layer]
    if not R: continue
    C = [o for o in R if o['cue'] is not None]
    print(f"{layer:10s} n {len(R)} | chest angle at the plant p25/50/75 {q([o['a0'] for o in R], .25)}/{q([o['a0'] for o in R])}/{q([o['a0'] for o in R], .75)} deg, 30-75 deg on {sum(30 <= o['a0'] <= 75 for o in R) / len(R):.2f} | closing run to the throw found {len(C)} ({len(C) / len(R):.2f})")
    if C:
        dt = [o['onset'] - o['cue'] for o in C]
        print(f"           cue before the throw p50 {q([o['throw'] - o['cue'] for o in C])} s | onset minus cue p25/p50/p75 {q(dt, .25)}/{q(dt)}/{q(dt, .75)} s | onsets after the cue {sum(x >= 0 for x in dt) / len(dt):.2f}, 0.2+ s after {sum(x >= 0.2 for x in dt) / len(dt):.2f}")
