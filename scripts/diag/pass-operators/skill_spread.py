"""Within-position pursuit skill spread (NFL; needs player ids, e.g. nfl-plays-ids.jsonl.gz from nfl_bdb2025.py).
Per player, per measure, the median of his samples; then across players with enough samples: p10/p50/p90 of those
medians and the split-half reliability (Pearson r between medians from odd and even plays, Spearman-Brown corrected),
so a spread that is only sampling noise shows r near 0. Measures (operators as pursuit.py / flight_break.py / arrival.py):
  lead   - open-field pursuit, level geometry, 5-25 yd: intercept angle minus aim (deg; + = aims short of the intercept);
  rel    - pass: closing on the eventual catch point at the throw, defenders within 8 yd of the catch (yd/s);
  angle  - his own first arrival inside 1.5 yd of the carrier: closing angle off the line to him (deg);
  appr   - arrivers, speed in the 3-2 yd band before arrival (yd/s).
Position groups from the tracking position: DL (DE DT NT), LB (ILB MLB OLB LB), CB, S (FS SS S).
usage: python3 -I scripts/diag/pass-operators/skill_spread.py path.jsonl.gz [maxplays]"""
import sys, os, gzip, json, math, collections as C, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
POS = {'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'ILB': 'LB', 'MLB': 'LB', 'OLB': 'LB', 'LB': 'LB', 'CB': 'CB', 'FS': 'S', 'SS': 'S', 'S': 'S', 'DB': 'CB'}
MIN = {'lead': 40, 'rel': 8, 'angle': 8, 'appr': 8, 'ended': 8}
path = sys.argv[1]; mx = int(sys.argv[2]) if len(sys.argv) > 2 else 10 ** 9
S = C.defaultdict(lambda: C.defaultdict(lambda: ([], [])))   # S[measure][(group, pid)] = (odd, even)
grp_of = {}; n = 0


def intercept_angle(dx, dy, cvx, cvy, s):
    L = math.hypot(dx, dy)
    if L < 1e-6 or s < 0.5: return None
    ux, uy = dx / L, dy / L; along = cvx * ux + cvy * uy; perp = -cvx * uy + cvy * ux
    if abs(perp) >= s: return None
    a = math.asin(perp / s)
    return a if s * math.cos(a) - along > 0 else None


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
    if p.players[c]['side'] != 'O' or k0 >= kl or p.pos(c, k0)[0] is None: continue
    n += 1; half = n % 2
    kw = min(kl, k0 + round(3.0 / p.dt))
    for d in p.who('D'):
        pl = p.players[d]; g = POS.get(pl.get('pos', ''))
        if g is None or pl.get('id') is None: continue
        key = (g, pl['id'])
        ka = None
        for k in range(k0, kw + 1):
            (x, y), (cx, cy) = p.pos(d, k), p.pos(c, k)
            if x is None or cx is None: break
            dx, dy = cx - x, cy - y; dist = math.hypot(dx, dy)
            if dist <= 1.5: ka = k; break
            cvx, cvy = p.velocity(c, k); vx, vy = p.velocity(d, k); s = math.hypot(vx, vy); cs = math.hypot(cvx, cvy)
            if 5 <= dist <= 25 and s >= 1.5 and cs >= 1:
                bear = math.degrees(math.acos(max(-1, min(1, (-dx * cvx - dy * cvy) / (dist * cs)))))
                if 60 <= bear <= 120 and k % 2 == 0:
                    side = 1 if (-cvx * dy / dist + cvy * dx / dist) >= 0 else -1
                    aim = math.degrees(math.atan2((-vx * dy + vy * dx) / dist, (vx * dx + vy * dy) / dist)) * side
                    ia = intercept_angle(dx, dy, cvx, cvy, s)
                    if ia is not None: S['lead'][key][half].append(math.degrees(ia) * side - aim)
            if 2 <= dist < 3: S['appr'][key][half].append(s) if False else None
        if ka is not None:
            (x, y), (cx, cy) = p.pos(d, ka), p.pos(c, ka); vx, vy = p.velocity(d, ka)
            if math.hypot(vx, vy) > 0.5:
                S['angle'][key][half].append(abs(math.degrees(math.atan2(-vx * (cy - y) + vy * (cx - x), vx * (cx - x) + vy * (cy - y)))))
            k1 = ka + round(1.0 / p.dt)
            S['ended'][key][half].append(1.0 if kl <= k1 and p.pos(d, kl)[0] is not None and p.pos(c, kl)[0] is not None and p.dist(d, c, kl) <= 2 else 0.0)
            kb = next((k for k in range(ka, k0 - 1, -1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None and 2 <= p.dist(d, c, k) < 3), None)
            if kb is not None: S['appr'][key][half].append(p.speed(d, kb))
        if kind == 'pass' and 'pass_forward' in ev:
            kt = p.k(ev['pass_forward'])
            if k0 - kt >= 3 and p.pos(d, k0)[0] is not None and p.dist(d, c, k0) <= 8 and p.pos(d, kt)[0] is not None:
                cx, cy = p.pos(c, k0); px, py = p.pos(d, kt); vx, vy = p.velocity(d, kt); L = math.hypot(cx - px, cy - py) or 1
                S['rel'][key][half].append((vx * (cx - px) + vy * (cy - py)) / L)


def pear(a, b):
    if len(a) < 5: return float('nan')
    ma, mb = st.mean(a), st.mean(b); sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')


print(f'skill spread over {n} plays (open field from catch / carrier past the line)')
for m in ('lead', 'rel', 'angle', 'appr'):
    for g in ('DL', 'LB', 'CB', 'S'):
        keys = [k for k in S[m] if k[0] == g and len(S[m][k][0]) + len(S[m][k][1]) >= MIN[m]]
        if len(keys) < 8: continue
        med = sorted(st.median(S[m][k][0] + S[m][k][1]) for k in keys)
        both = [k for k in keys if len(S[m][k][0]) >= MIN[m] // 3 and len(S[m][k][1]) >= MIN[m] // 3]
        r = pear([st.median(S[m][k][0]) for k in both], [st.median(S[m][k][1]) for k in both])
        rsb = 2 * r / (1 + r) if r == r and r > -1 else float('nan')
        pool = [x for k in keys for x in S[m][k][0] + S[m][k][1]]
        q = lambda v, p: v[int(p * (len(v) - 1))]
        print(f'  {m:5} {g:2} players {len(keys):3}: player medians p10/p50/p90 {q(med, .1):6.1f} {q(med, .5):6.1f} {q(med, .9):6.1f} | sample sd {st.pstdev(pool):5.1f} | split-half r {r:5.2f} (corrected {rsb:5.2f}, {len(both)} players)')

print('  cross-player: does a player who ends the play at his arrival (within 1 s, within 2 yd) more often come in slower or faster, at a different angle? Pearson r of player means')
for g in ('DL', 'LB', 'CB', 'S'):
    for m in ('appr', 'angle'):
        keys = [k for k in S['ended'] if k[0] == g and len(S['ended'][k][0]) + len(S['ended'][k][1]) >= 10 and len(S[m][k][0]) + len(S[m][k][1]) >= 8]
        if len(keys) < 10: continue
        e = [st.mean(S['ended'][k][0] + S['ended'][k][1]) for k in keys]; v = [st.median(S[m][k][0] + S[m][k][1]) for k in keys]
        srt = sorted(zip(e, v)); n3 = len(srt) // 3
        print(f"    {g} {m:5} players {len(keys):3}: r {pear(e, v):5.2f} | {m} median of players in the low / high third by end rate: {st.median([x[1] for x in srt[:n3]]):.1f} / {st.median([x[1] for x in srt[-n3:]]):.1f} (end rate {st.mean([x[0] for x in srt[:n3]]):.2f} / {st.mean([x[0] for x in srt[-n3:]]):.2f})")
