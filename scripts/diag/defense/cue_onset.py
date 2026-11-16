"""What the zone defender breaks on before the throw: one operator for NFL tracking and sim common plays (sim from
scripts/mechanics/sim-export.ts with EXPORT_FACING=1 for 'o'). Population as prethrow.py: completed passes with a
known man/zone family, caught 0-12 yd past the line, pass_forward > 0.5 s; zone calls only. The first arriver is the
defender nearest the target at the catch; he is "underneath" when 2-9 yd off the line at the snap, "deep" when 9+.

His onset is the start of his last run of closing on the target (his velocity along the line to the target, the
target's own motion not in it) above +0.5 yd/s that lasts to the throw; no onset when he is not closing at the throw.
The cues, each the first frame at or before the throw where it holds:
  (a) route break: the target's heading turns 40+ deg within 0.5 s at 2+ yd/s, or he stops (under half his running
      peak and under 2.5 yd/s, after 3+ yd/s),
      0.5 s or more after the snap and 1+ yd past the line;
  (b) QB set: the QB under 1 yd/s after giving 1+ yd behind his snap spot;
  (d) QB shoulders: his orientation ('o') within 30 deg of the bearing to the target and staying there to the throw.
(c) the QB's eyes are not in the tracking; the sim's are measured by scripts/diag/defense/prethrow.mts.
Reports onset minus each cue (s; + = the onset follows the cue), the share of onsets that come after each cue, by
underneath / deep. usage: python3 -I cue_onset.py FILE [--rows N] (N plays listed for hand-checking (a))"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
path = sys.argv[1]
nrows = int(sys.argv[sys.argv.index('--rows') + 1]) if '--rows' in sys.argv else 0
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
out = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None: continue
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
    # (a) route break
    a = None; peak = 0.0
    for k in range(1, kt + 1):
        if p.pos(r, k)[0] is None: continue
        v1 = p.velocity(r, k); s1 = math.hypot(*v1); peak = max(peak, s1)
        if k < p.k(0.5) or p.pos(r, k)[0] < 1: continue
        v0 = p.velocity(r, max(0, k - 5)); s0 = math.hypot(*v0)
        if s1 > 2 and s0 > 2:
            t = abs(math.degrees(math.atan2(v0[0] * v1[1] - v0[1] * v1[0], v0[0] * v1[0] + v0[1] * v1[1])))
            if t >= 40: a = k * p.dt; break
        if peak >= 3 and s1 < min(2.5, 0.5 * peak): a = k * p.dt; break
    # (b) QB set
    qb = next((i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] == 'QB'), None)
    b = None
    if qb is not None and p.pos(qb, 0)[0] is not None:
        x0 = p.pos(qb, 0)[0]; back = False
        for k in range(1, kt + 1):
            if p.pos(qb, k)[0] is None: continue
            if x0 - p.pos(qb, k)[0] >= 1: back = True
            if back and p.speed(qb, k) < 1: b = k * p.dt; break
    # (d) QB shoulders
    dd = None; O = raw.get('o')
    if qb is not None and O:
        for k in range(kt, -1, -1):
            if k >= len(O) or O[k][qb] is None or p.pos(qb, k)[0] is None or p.pos(r, k)[0] is None: break
            (qx, qy), (rx, ry) = p.pos(qb, k), p.pos(r, k)
            bear = math.degrees(math.atan2(ry - qy, rx - qx))
            if abs((O[k][qb] - bear + 540) % 360 - 180) > 30: break
            dd = k * p.dt
    out.append({'layer': layer, 'onset': onset, 'throw': kt * p.dt, 'a': a, 'b': b, 'd': dd, 'id': raw.get('id'),
                'route': (p.players[r].get('route') if r < len(p.players) else None)})
print(f'{path}: zone first arrivers, catches 0-12 yd')
for layer in ('underneath', 'deep', 'all'):
    R = [o for o in out if layer == 'all' or o['layer'] == layer]; O = [o for o in R if o['onset'] is not None]
    if not R: continue
    print(f"{layer:10s} n {len(R)} | closing at the throw (onset found) {len(O)} ({len(O) / len(R):.2f}) | onset before the throw p25/p50/p75 "
          f"{q([o['onset'] - o['throw'] for o in O], .25)}/{q([o['onset'] - o['throw'] for o in O])}/{q([o['onset'] - o['throw'] for o in O], .75)} s")
    for c, lab in (('a', 'route break'), ('b', 'QB set'), ('d', 'QB shoulders on target')):
        C = [o for o in O if o[c] is not None]
        if not C: print(f"    {lab:24s} no cue found"); continue
        dt = [o['onset'] - o[c] for o in C]
        print(f"    {lab:24s} cue found {len(C)}/{len(O)} | cue before the throw p50 {q([o['throw'] - o[c] for o in C])} s | onset minus cue p25/p50/p75 "
              f"{q(dt, .25)}/{q(dt)}/{q(dt, .75)} s | onsets after the cue {sum(x >= 0 for x in dt) / len(dt):.2f}, 0.2+ s after {sum(x >= 0.2 for x in dt) / len(dt):.2f}")
if nrows:
    print('hand-check rows for (a): id, layer, target route, route-break t, throw t, onset t')
    for o in [o for o in out if o['onset'] is not None and o['a'] is not None][:nrows]:
        print(f"  {o['id']} {o['layer']} {o['route']} break {o['a']:.1f} throw {o['throw']:.1f} onset {o['onset']:.1f}")
