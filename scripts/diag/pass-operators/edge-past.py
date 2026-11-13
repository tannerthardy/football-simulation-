"""After the edge rusher gets past the tackle (Integration, 2026-11-12: EDGE_ARC gets ours around but not winning
around). Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/edge-past.py <plays.jsonl.gz> [...]

Pairing as edge-rush.py (the outermost OL at the snap; the widest DL/LB within 1.6 yd of the line and 0-4 yd outside
him who rushes). Past: the first frame from 0.5 s, ball still in, at which the rusher is more than 0.3 yd deeper than
the tackle and not inside him (width >= -0.3). At that frame:
  - the rusher's depth against the QB (rusher x minus QB x; positive = still short of the QB's depth, negative = run
    by the pocket), his distance to the QB and speed, his separation from the tackle;
  - the tackle's hips where the record has orientation (NFL 'o', same frame as atan2): square (facing within 45 deg of
    downfield) or turned.
After it, at +0.3 / +0.6 / +0.9 s while the ball is in: separation from the tackle, the tackle within 1.2 yd, distance
to the QB. His turn over the first 0.5 s after past: heading change rate (deg/s), the radius it implies (speed /
rate), his speed toward the QB. Close: within 2.0 yd of the QB before the ball is out, and the time from past.
Limits: geometric proxies (alignment, not assignment); positions at 0.1 yd and 0.1 s; headings from 0.2 s differences.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'
AFTER = (0.3, 0.6, 0.9)


def pairs(p, raw):
    qbs = p.who('O', 'QB')
    if not qbs: return []
    OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
    if len(OL) < 5: return []
    by = raw['ball_y']
    D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
    out = []
    for side in (-1, 1):
        tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by)); ty0 = p.pos(tk, 0)[1]
        cand = []
        for d in D:
            x0, y0 = p.pos(d, 0)
            if x0 > 1.6: continue
            w = side * (y0 - ty0)
            if w < 0 or w > 4: continue
            k1 = min(p.k(1.0), p.frames - 1)
            if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
            cand.append((w, d))
        if cand: out.append((side, tk, max(cand)[1], qbs[0]))
    return out


def heading(p, i, k):
    vx, vy = p.velocity(i, k)
    return math.atan2(vy, vx), math.hypot(vx, vy), (vx, vy)


for path in sys.argv[1:]:
    rows = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; by = raw['ball_y']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        o = raw.get('o')
        for side, tk, d, qb in pairs(p, raw):
            n += 1
            kp = None
            for k in range(p.k(0.5), kend + 1):
                rx, ry = p.pos(d, k); tx, ty = p.pos(tk, k)
                if None in (rx, tx) or p.pos(qb, k)[0] is None: break
                if rx - tx < -0.3 and side * (ry - by) - side * (ty - by) >= -0.3: kp = k; break
            if kp is None: continue
            rx, ry = p.pos(d, kp); qx, qy = p.pos(qb, kp)
            r = {'t': kp * p.dt, 'vsQB': rx - qx, 'toQB': p.dist(d, qb, kp), 'speed': p.speed(d, kp), 'sep': p.dist(d, tk, kp), 'hips': None}
            if o and kp < len(o) and o[kp][tk] is not None:
                r['hips'] = 'square' if abs((o[kp][tk] + 180) % 360 - 180) <= 45 else 'turned'
            r['after'] = {}
            for a in AFTER:
                k = kp + p.k(a)
                if k > kend or p.pos(d, k)[0] is None or p.pos(qb, k)[0] is None: break
                r['after'][a] = {'sep': p.dist(d, tk, k), 'on': p.dist(d, tk, k) <= 1.2, 'toQB': p.dist(d, qb, k)}
            k2 = min(kend, kp + p.k(0.5))
            if k2 - kp >= 3:
                h0, s0, _ = heading(p, d, kp); h1, s1, _ = heading(p, d, k2)
                dh = abs((math.degrees(h1 - h0) + 180) % 360 - 180); rate = dh / ((k2 - kp) * p.dt)
                r['rate'] = rate; r['radius'] = (0.5 * (s0 + s1)) / math.radians(rate) if rate > 1 else float('inf')
                _, _, (vx, vy) = heading(p, d, (kp + k2) // 2); mx, my = p.pos(d, (kp + k2) // 2); qx2, qy2 = p.pos(qb, (kp + k2) // 2)
                L = math.hypot(qx2 - mx, qy2 - my) or 1; r['toward'] = (vx * (qx2 - mx) + vy * (qy2 - my)) / L
            r['close'] = None
            for k in range(kp, kend + 1):
                if p.pos(d, k)[0] is not None and p.pos(qb, k)[0] is not None and p.dist(d, qb, k) <= 2.0: r['close'] = (k - kp) * p.dt; break
            rows.append(r)
    R = rows
    print(f"== {os.path.basename(path)}: edge rushes {n} | got past the tackle before the ball was out {len(R)} ({pct(len(R), n)}), at p50 {q([r['t'] for r in R]):.2f} s")
    if not R: continue
    print(f"   at past: rusher vs QB depth p25/50/75 {q([r['vsQB'] for r in R], .25):+.2f}/{q([r['vsQB'] for r in R]):+.2f}/{q([r['vsQB'] for r in R], .75):+.2f} (<= 0, at or beyond the QB: {pct(sum(r['vsQB'] <= 0 for r in R), len(R))})"
          f" | to QB p50 {q([r['toQB'] for r in R]):.1f} yd | speed {q([r['speed'] for r in R]):.1f} | separation from the tackle {q([r['sep'] for r in R]):.2f}"
          + (f" | tackle hips turned {pct(sum(r['hips'] == 'turned' for r in R), sum(r['hips'] is not None for r in R))}" if any(r['hips'] for r in R) else ''))
    for a in AFTER:
        S = [r['after'][a] for r in R if a in r['after']]
        if S: print(f"   +{a:.1f} s (n {len(S)}): separation p50 {q([s['sep'] for s in S]):.2f} yd | tackle within 1.2 yd {pct(sum(s['on'] for s in S), len(S))} | to QB p50 {q([s['toQB'] for s in S]):.1f} yd")
    T = [r for r in R if 'rate' in r]
    if T: print(f"   turn over 0.5 s after past (n {len(T)}): heading change p50 {q([r['rate'] for r in T]):.0f} deg/s | radius p50 {q([r['radius'] for r in T]):.1f} yd | speed toward the QB p50 {q([r['toward'] for r in T]):.1f} yd/s")
    c = [r['close'] for r in R if r['close'] is not None]
    print(f"   closed within 2 yd of the QB after past: {pct(len(c), len(R))}, time from past p50 {q(c):.2f} s")
    for lab, g in (('short of the QB', [r for r in R if r['vsQB'] > 0]), ('at/beyond the QB', [r for r in R if r['vsQB'] <= 0])):
        if g: print(f"     {lab:16s} n {len(g):4d}: closed {pct(sum(r['close'] is not None for r in g), len(g))} | to QB at past p50 {q([r['toQB'] for r in g]):.1f}")
