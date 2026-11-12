"""Open-field pursuit, whole team, same code for NFL and sim common format. Observation only.
Start of the open field (t0): on a completion the catch; on a run the first frame the carrier is past the line of
scrimmage. Each defender then, every 0.1 s until he is within 1 yd of the carrier, the play ends, or +3.0 s, while he is
2-25 yd away and moving faster than 1.5 yd/s:
  - geometry: his bearing from the carrier relative to the carrier's heading: ahead (< 60 deg), level (60-120),
    trailing (> 120); distance band 2-5 / 5-10 / 10-25 yd;
  - aim: the angle between his velocity and the line to the carrier (0 = straight at him);
  - intercept: the angle, off that same line, of the straight course that meets the carrier if the carrier holds his
    velocity and the defender holds his own speed (none when no such course exists);
  - lead = intercept angle minus aim, both measured toward the carrier's heading side (positive = he aims less ahead
    than the intercept would; negative = more); his speed.
Reach: time from t0 to within 1 yd (never by +3.0 s), by his distance and geometry at t0.
Rally: at t0 +1.0 and +2.0 s, defenders within 5 and 2 yd; for each within 5 yd his leverage on the carrier:
  outside (between the carrier and the near sideline, not behind him), inside (between him and the far side, ahead or
  level), trailing (behind him); the spread of their bearings (circular, 0 = all on one line, 1 = spread evenly).
Split by defender group (DL / LB / DB) and kind (run / pass).
usage: python3 -I scripts/diag/pass-operators/pursuit.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
FIELD_W = 53.33


def q(v, f='{:.0f}'):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f.format(v[int(p * (len(v) - 1))]) for p in (.25, .5, .75))


def intercept_angle(dx, dy, cvx, cvy, s):
    """Angle (rad) off the line to the carrier of the straight course at speed s meeting a carrier moving at (cvx, cvy)."""
    L = math.hypot(dx, dy)
    if L < 1e-6 or s < 0.5: return None
    ux, uy = dx / L, dy / L
    along = cvx * ux + cvy * uy            # carrier speed away from him along the line
    perp = -cvx * uy + cvy * ux            # carrier speed across the line (left positive)
    if abs(perp) >= s: return None
    a = math.asin(perp / s)                # match the carrier's cross speed
    closing = s * math.cos(a) - along
    return a if closing > 0 else None


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    A = C.defaultdict(list); reach = C.defaultdict(list); rally = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            kind = raw.get('kind')
            if kind not in ('run', 'pass') or raw.get('carrier') is None and raw.get('target') is None: continue
            p = Play(raw); kl = p.k(p.end)
            if kind == 'pass':
                if 'catch' not in ev or raw.get('target') is None: continue
                c = raw['target']; k0 = p.k(ev['catch'])
            else:
                c = raw.get('carrier')
                if c is None: continue
                k0 = next((k for k in range(p.k(ev.get('handoff', 0)), kl + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
                if k0 is None: continue
            if p.players[c]['side'] != 'O' or k0 >= kl: continue
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            for d in D:
                g = p.players[d]['group']
                hit = None; first = None
                for k in range(k0, min(kl, k0 + round(3.0 / p.dt)) + 1):
                    (x, y), (cx, cy) = p.pos(d, k), p.pos(c, k)
                    if x is None or cx is None: break
                    dx, dy = cx - x, cy - y; dist = math.hypot(dx, dy)
                    if dist <= 1.0: hit = (k - k0) * p.dt; break
                    cvx, cvy = p.velocity(c, k); vx, vy = p.velocity(d, k); s = math.hypot(vx, vy); cs = math.hypot(cvx, cvy)
                    if first is None:
                        bear = math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (dist * cs))))) if cs > 1 else None
                        first = (dist, 'ahead' if bear is not None and bear < 60 else 'level' if bear is not None and bear <= 120 else 'trailing' if bear is not None else 'still')
                    if not (2 <= dist <= 25) or s < 1.5 or cs < 1.0: continue
                    bear = math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (dist * cs)))))
                    geo = 'ahead' if bear < 60 else 'level' if bear <= 120 else 'trailing'
                    band = '2-5' if dist < 5 else '5-10' if dist < 10 else '10-25'
                    # side of the line to the carrier toward which the carrier is heading (+1 left of the line)
                    side = 1 if (-cvx * dy / dist + cvy * dx / dist) >= 0 else -1
                    cross = (-vx * dy + vy * dx) / dist; along = (vx * dx + vy * dy) / dist
                    aim = math.degrees(math.atan2(cross, along)) * side          # + = aimed toward where the carrier is going
                    ia = intercept_angle(dx, dy, cvx, cvy, s)
                    ia = math.degrees(ia) * side if ia is not None else None
                    A[(kind, g, geo, band)].append((aim, ia, s, (ia - aim) if ia is not None else None))
                if first: reach[(kind, g, first[1], '2-5' if first[0] < 5 else '5-10' if first[0] < 10 else '10-25')].append(hit)
            for m in (1.0, 2.0):
                k = k0 + round(m / p.dt)
                if k > kl or p.pos(c, k)[0] is None: continue
                cx, cy = p.pos(c, k); cvx, cvy = p.velocity(c, k); cs = math.hypot(cvx, cvy)
                near = [d for d in D if p.pos(d, k)[0] is not None and p.dist(d, c, k) <= 5]
                roles = C.Counter(); bearings = []
                out = -1 if cy < FIELD_W / 2 else 1   # toward the near sideline in y
                for d in near:
                    x, y = p.pos(d, k)
                    bearings.append(math.atan2(y - cy, x - cx))
                    behind = cs > 1 and ((x - cx) * cvx + (y - cy) * cvy) < -0.3 * math.hypot(x - cx, y - cy) * cs
                    roles['trailing' if behind else 'outside' if (y - cy) * out > 0.5 else 'inside' if (y - cy) * out < -0.5 else 'square'] += 1
                spread = (1 - math.hypot(sum(math.cos(b) for b in bearings), sum(math.sin(b) for b in bearings)) / len(bearings)) if len(bearings) >= 2 else None
                rally[(kind, m)].append((len(near), sum(1 for d in D if p.pos(d, k)[0] is not None and p.dist(d, c, k) <= 2), roles, spread))
    print(f'== {name}')
    print('  aim / intercept / lead (deg, + = toward where the carrier is going; lead = intercept - aim), his speed (yd/s); p25/p50/p75')
    for kind in ('run', 'pass'):
        for geo in ('ahead', 'level', 'trailing'):
            for band in ('2-5', '5-10', '10-25'):
                X = sum((A[(kind, g, geo, band)] for g in ('DL', 'LB', 'DB')), [])
                if len(X) < 30: continue
                print(f"    {kind:4} {geo:8} {band:5} n {len(X):5}: aim {q([x[0] for x in X])} | intercept {q([x[1] for x in X])} | lead {q([x[3] for x in X])} | speed {q([x[2] for x in X], '{:.1f}')}")
    print('  by group (all geometry, 2-25 yd): aim p50 / lead p50 (IQR) / speed p50')
    for kind in ('run', 'pass'):
        for g in ('DL', 'LB', 'DB'):
            X = sum((A[(kind, g, geo, b)] for geo in ('ahead', 'level', 'trailing') for b in ('2-5', '5-10', '10-25')), [])
            if len(X) < 30: continue
            print(f"    {kind:4} {g}: n {len(X):5} aim {q([x[0] for x in X])} | lead {q([x[3] for x in X])} | speed {q([x[2] for x in X], '{:.1f}')}")
    print('  reach within 1 yd by +3.0 s, by start geometry / distance: share, time p25/p50/p75')
    for kind in ('run', 'pass'):
        for geo in ('ahead', 'level', 'trailing'):
            for band in ('2-5', '5-10', '10-25'):
                R = sum((reach[(kind, g, geo, band)] for g in ('DL', 'LB', 'DB')), [])
                if len(R) < 30: continue
                got = [r for r in R if r is not None]
                print(f"    {kind:4} {geo:8} {band:5} n {len(R):5}: {len(got) / len(R):4.0%}  {q(got, '{:.1f}')} s")
    print('  rally: defenders within 5 / 2 yd (mean), leverage of those within 5 yd (share), bearing spread p50')
    for kind in ('run', 'pass'):
        for m in (1.0, 2.0):
            X = rally[(kind, m)]
            if not X: continue
            tot = C.Counter(); [tot.update(x[2]) for x in X]; T = sum(tot.values()) or 1
            print(f"    {kind:4} +{m:.0f} s n {len(X):5}: within 5 {st.mean(x[0] for x in X):.2f}, within 2 {st.mean(x[1] for x in X):.2f} | "
                  + ', '.join(f'{r} {tot[r] / T:.0%}' for r in ('outside', 'inside', 'square', 'trailing')) + f" | spread {q([x[3] for x in X], '{:.2f}')}")
