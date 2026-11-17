"""Do zone defenders keep their feet moving before the throw? One operator for NFL tracking and sim common plays.
Population: dropback passes with a zone-family call and pass_forward at 1.0 s or later. Every defender off the line
(2+ yd deep at the snap), by role at the snap: 'underneath LB' (group LB, 2-9 yd), 'underneath DB' (group DB, 2-9 yd),
'deep DB' (group DB, 9+ yd). At -0.5, -0.25 and 0 s relative to pass_forward: speed p25/p50/p75, the share standing
(under 1 yd/s), depth velocity p50 (+ = away from the line) and lateral speed p50; and the distance walked over the
last 0.5 s. Report only. usage: python3 -I prethrow_motion.py FILE"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
R = {}
for line in gzip.open(sys.argv[1], 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass': continue
    tt = (raw.get('events') or {}).get('pass_forward')
    if tt is None or tt < 1.0 or coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
    p = Play(raw); kt = p.k(tt)
    for d in p.who('D'):
        x0 = p.pos(d, 0)[0]
        if x0 is None or x0 < 2: continue
        g = p.players[d]['group']
        role = 'deep DB' if g == 'DB' and x0 >= 9 else 'underneath DB' if g == 'DB' else 'underneath LB' if g == 'LB' and x0 < 9 else None
        if not role: continue
        row = {}
        for off in (-0.5, -0.25, 0.0):
            k = max(0, kt + round(off / p.dt))
            if p.pos(d, k)[0] is None: break
            vx, vy = p.velocity(d, k)
            row[off] = (math.hypot(vx, vy), vx, abs(vy))
        else:
            k0 = max(0, kt - round(0.5 / p.dt)); walk = 0.0
            for k in range(k0, kt):
                a, b = p.pos(d, k), p.pos(d, k + 1)
                if a[0] is not None and b[0] is not None: walk += math.hypot(b[0] - a[0], b[1] - a[1])
            row['walk'] = walk
            R.setdefault(role, []).append(row)
print(f"{sys.argv[1]}: zone calls, pass_forward >= 1.0 s; defenders 2+ yd off at the snap")
for role in ('underneath LB', 'underneath DB', 'deep DB'):
    V = R.get(role, [])
    if not V: continue
    print(f"{role:14s} n {len(V)} | distance covered in the last 0.5 s p50 {q([v['walk'] for v in V])} yd")
    for off in (-0.5, -0.25, 0.0):
        S = [v[off] for v in V]
        print(f"    t {off:+.2f} s: speed p25/p50/p75 {q([s[0] for s in S], .25)}/{q([s[0] for s in S])}/{q([s[0] for s in S], .75)} | standing (<1 yd/s) "
              f"{sum(s[0] < 1 for s in S) / len(S):.2f} | depth velocity p50 {q([s[1] for s in S])} | lateral speed p50 {q([s[2] for s in S])}")
