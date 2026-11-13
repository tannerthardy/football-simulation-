"""What NFL corners' lead trait goes with (within each corner's main pre-snap role, as role_spread.py). Per player:
  lead    - open-field lead median (intercept minus aim, level, 5-25 yd), main role only;
  vmax    - his 98th-percentile speed over all his frames in these windows (yd/s);
  accel   - his median acceleration while speeding up from < 3 yd/s in the open field (yd/s^2);
  rel     - closing on the catch point at the throw (passes, within 8 yd of the catch);
  redirect- his heading change over the first 0.5 s after the catch / carrier past the line, when moving > 2 yd/s.
Prints Pearson r of lead with each across corners (with n) and lead in the low/high third of each.
usage: python3 -I scripts/diag/pass-operators/cb_trait.py path.jsonl.gz [maxplays]"""
import sys, os, gzip, json, math, collections as C, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
path = sys.argv[1]; mx = int(sys.argv[2]) if len(sys.argv) > 2 else 10 ** 9
L = C.defaultdict(lambda: C.defaultdict(list)); F = C.defaultdict(lambda: C.defaultdict(list)); n = 0
def ia_(dx, dy, cvx, cvy, s):
    Lr = math.hypot(dx, dy)
    if Lr < 1e-6 or s < .5: return None
    ux, uy = dx / Lr, dy / Lr; along = cvx * ux + cvy * uy; perp = -cvx * uy + cvy * ux
    if abs(perp) >= s: return None
    a = math.asin(perp / s); return a if s * math.cos(a) - along > 0 else None
for line in gzip.open(path, 'rt'):
    if n >= mx: break
    raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
    if kind not in ('run', 'pass'): continue
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
    n += 1; by = raw.get('ball_y', 26.65); kw = min(kl, k0 + round(3 / p.dt))
    for d in p.who('D'):
        pl = p.players[d]
        if pl.get('pos') not in ('CB', 'DB') or pl.get('id') is None or p.pos(d, 0)[0] is None: continue
        pid = pl['id']; x0, y0 = p.pos(d, 0)
        role = ('<5' if x0 < 5 else '5-10' if x0 < 10 else '10+') + '/' + ('in' if abs(y0 - by) < 8 else 'wide')
        sp = [p.speed(d, k) for k in range(max(0, k0 - round(1 / p.dt)), kw + 1) if p.pos(d, k)[0] is not None]
        F[pid]['speeds'] += sp
        for k in range(k0, kw - 2):
            if p.pos(d, k)[0] is None or p.pos(d, k + 2)[0] is None: break
            s0 = p.speed(d, k)
            if s0 < 3: F[pid]['accel'].append((p.speed(d, k + 2) - s0) / (2 * p.dt))
        k5 = k0 + round(.5 / p.dt)
        if k5 <= kl and p.pos(d, k5)[0] is not None and p.speed(d, k0) > 2 and p.speed(d, k5) > 2:
            v0, v1 = p.velocity(d, k0), p.velocity(d, k5)
            F[pid]['redirect'].append(abs((math.degrees(math.atan2(v1[1], v1[0]) - math.atan2(v0[1], v0[0])) + 540) % 360 - 180))
        if kind == 'pass' and 'pass_forward' in ev:
            kt = p.k(ev['pass_forward'])
            if p.pos(d, k0)[0] is not None and p.pos(c, k0)[0] is not None and p.dist(d, c, k0) <= 8 and p.pos(d, kt)[0] is not None:
                cx, cy = p.pos(c, k0); px, py = p.pos(d, kt); vx, vy = p.velocity(d, kt); Lr = math.hypot(cx - px, cy - py) or 1
                F[pid]['rel'].append((vx * (cx - px) + vy * (cy - py)) / Lr)
        for k in range(k0, kw + 1, 2):
            (x, y), (cx, cy) = p.pos(d, k), p.pos(c, k)
            if x is None or cx is None: break
            dx, dy = cx - x, cy - y; dist = math.hypot(dx, dy)
            if dist <= 1.5: break
            cvx, cvy = p.velocity(c, k); vx, vy = p.velocity(d, k); s = math.hypot(vx, vy); cs = math.hypot(cvx, cvy)
            if not (5 <= dist <= 25 and s >= 1.5 and cs >= 1): continue
            bear = math.degrees(math.acos(max(-1, min(1, (-dx * cvx - dy * cvy) / (dist * cs)))))
            if not 60 <= bear <= 120: continue
            side = 1 if (-cvx * dy / dist + cvy * dx / dist) >= 0 else -1
            aim = math.degrees(math.atan2((-vx * dy + vy * dx) / dist, (vx * dx + vy * dy) / dist)) * side
            ia = ia_(dx, dy, cvx, cvy, s)
            if ia is not None: L[pid][role].append(math.degrees(ia) * side - aim)
def pear(a, b):
    ma, mb = st.mean(a), st.mean(b); d = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / d if d else float('nan')
rows = []
for pid, roles in L.items():
    role, v = max(roles.items(), key=lambda kv: len(kv[1]))
    if len(v) < 26: continue
    f = F[pid]
    if len(f['speeds']) < 100: continue
    sp = sorted(f['speeds'])
    rows.append(dict(role=role, lead=st.median(v), vmax=sp[int(.98 * (len(sp) - 1))], accel=st.median(f['accel']) if len(f['accel']) >= 10 else None,
                     rel=st.median(f['rel']) if len(f['rel']) >= 6 else None, redirect=st.median(f['redirect']) if len(f['redirect']) >= 6 else None))
# remove each role's lead mean so roles do not drive it
rm = C.defaultdict(list)
for r in rows: rm[r['role']].append(r['lead'])
for r in rows: r['lead_c'] = r['lead'] - st.mean(rm[r['role']])
print(f'cb trait over {n} plays: corners {len(rows)} (main role with >= 26 lead samples), roles ' + ', '.join(f'{k} {len(v)}' for k, v in rm.items()))
for key in ('vmax', 'accel', 'rel', 'redirect'):
    X = [r for r in rows if r[key] is not None]
    if len(X) < 10: print(f'  {key}: too few'); continue
    s = sorted(X, key=lambda r: r[key]); t = len(s) // 3
    print(f"  lead (role-centred) vs {key:8}: r {pear([r[key] for r in X], [r['lead_c'] for r in X]):5.2f} (n {len(X)}) | {key} p10/p50/p90 "
          f"{s[int(.1*(len(s)-1))][key]:.2f}/{s[len(s)//2][key]:.2f}/{s[int(.9*(len(s)-1))][key]:.2f} | lead_c low / high third {st.mean(r['lead_c'] for r in s[:t]):.1f} / {st.mean(r['lead_c'] for r in s[-t:]):.1f}")
