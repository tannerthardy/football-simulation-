"""Is NFL DB open-field lead a player trait or a role? Lead as skill_spread.py (open field, level geometry, 5-25 yd,
intercept minus aim). Each sample carries the defender's pre-snap alignment at the play's first frame: depth past the
line (< 5 / 5-10 / 10+ yd) and width from the ball (< 8 / 8+ yd). Split-half reliability of player medians:
  all     - every sample (as skill_spread.py);
  within  - per (player, role) cell, players' medians within their most frequent role only;
  role    - how much of the between-player spread role alone explains (spread of role medians).
usage: python3 -I scripts/diag/pass-operators/role_spread.py path.jsonl.gz [maxplays]"""
import sys, os, gzip, json, math, collections as C, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
POS = {'CB': 'CB', 'DB': 'CB', 'FS': 'S', 'SS': 'S', 'S': 'S'}
path = sys.argv[1]; mx = int(sys.argv[2]) if len(sys.argv) > 2 else 10 ** 9
A = C.defaultdict(lambda: ([], [])); R = C.defaultdict(lambda: C.defaultdict(lambda: ([], []))); n = 0
def ia_(dx, dy, cvx, cvy, s):
    L = math.hypot(dx, dy)
    if L < 1e-6 or s < .5: return None
    ux, uy = dx / L, dy / L; along = cvx * ux + cvy * uy; perp = -cvx * uy + cvy * ux
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
    n += 1; half = n % 2; by = raw.get('ball_y', 26.65)
    for d in p.who('D'):
        pl = p.players[d]; g = POS.get(pl.get('pos', ''))
        if g is None or pl.get('id') is None or p.pos(d, 0)[0] is None: continue
        x0, y0 = p.pos(d, 0)
        role = ('<5' if x0 < 5 else '5-10' if x0 < 10 else '10+') + '/' + ('in' if abs(y0 - by) < 8 else 'wide')
        for k in range(k0, min(kl, k0 + round(3 / p.dt)) + 1, 2):
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
            if ia is None: continue
            v = math.degrees(ia) * side - aim
            A[(g, pl['id'])][half].append(v); R[(g, pl['id'])][role][half].append(v)
def pear(a, b):
    if len(a) < 5: return float('nan')
    ma, mb = st.mean(a), st.mean(b); sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')
sb = lambda r: 2 * r / (1 + r) if r == r and r > -1 else float('nan')
print(f'role spread over {n} plays')
for g in ('CB', 'S'):
    keys = [k for k in A if k[0] == g and min(len(A[k][0]), len(A[k][1])) >= 13]
    r_all = pear([st.median(A[k][0]) for k in keys], [st.median(A[k][1]) for k in keys])
    within = []
    for k in keys:
        role, (h0, h1) = max(R[k].items(), key=lambda kv: len(kv[1][0]) + len(kv[1][1]))
        if min(len(h0), len(h1)) >= 10: within.append((role, st.median(h0), st.median(h1)))
    r_w = pear([w[1] for w in within], [w[2] for w in within])
    # within a role: remove each role's mean from both halves (players compared only to others in the same role)
    rm = C.defaultdict(list)
    for w in within: rm[w[0]].append((w[1] + w[2]) / 2)
    cen = [(w[1] - st.mean(rm[w[0]]), w[2] - st.mean(rm[w[0]])) for w in within if len(rm[w[0]]) >= 3]
    r_c = pear([c[0] for c in cen], [c[1] for c in cen])
    roles = C.Counter(w[0] for w in within)
    allrole = C.defaultdict(list)
    for k in keys:
        for role, (h0, h1) in R[k].items(): allrole[role] += h0 + h1
    print(f'  {g}: players {len(keys)} | all-sample split-half r {r_all:5.2f} (corrected {sb(r_all):5.2f})')
    print(f'      main role only: players {len(within)}, r {r_w:5.2f} (corrected {sb(r_w):5.2f}) | after removing each role\'s mean: r {r_c:5.2f} (corrected {sb(r_c):5.2f}, {len(cen)} players)')
    print('      role medians: ' + ', '.join(f'{r} {st.median(v):.1f} (n {len(v)})' for r, v in sorted(allrole.items()) if len(v) >= 100) + ' | main roles: ' + ', '.join(f'{r} {c}' for r, c in roles.most_common()))
