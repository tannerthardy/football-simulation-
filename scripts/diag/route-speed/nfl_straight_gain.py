"""The straight-row witness (Tools, 2026-11-16, for Integration's straight-sprint term): NFL defenders within 8 yd of a short completion's carrier at the catch (0-12 yd past the line), velocity within 45 deg of the line to the carrier,
back to the QB (body within 90 deg... not: facing more than 90 deg off the line back to the QB at the throw), moving 1+ yd/s, not within 1 yd of the carrier or bonded for 0.5 s. Speed along the line to the carrier at the catch and at +0.25 / +0.5 s,
by speed at the catch, so the gain from a given starting speed is read directly. usage: python3 -I nfl_straight_gain.py PLAYS.jsonl.gz BALL.jsonl.gz   (the common format with bxy not needed)"""
import sys, gzip, json, math
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j):
    if f < 0 or f >= len(P['xy']): return None
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def vel(P, f, j):
    a, b = at(P, f - 1, j), at(P, f + 1, j)
    return None if a is None or b is None else ((b[0] - a[0]) / (2 * P['dt']), (b[1] - a[1]) / (2 * P['dt']))
def ang(a, b): return abs(math.degrees((a - b + math.pi) % (2 * math.pi) - math.pi))
ball = {b['id']: b for b in jl(sys.argv[2])}
rows = []
for P in jl(sys.argv[1]):
    b = ball.get(P['id'])
    if P['kind'] != 'pass' or P.get('target') is None or not b or b.get('passResult') != 'C' or 'o' not in P: continue
    ev = P['events']; dt = P['dt']; c = ev.get('catch', ev.get('pass_arrived'))
    if 'pass_forward' not in ev: continue
    if c is None: continue
    F = int(round(c / dt)); T = int(round(ev['pass_forward'] / dt)); n = len(P['xy'])
    if F + 6 >= n or 'end' in ev and ev['end'] < c + 0.55: continue
    carrier = P['target']
    if at(P, F, carrier) is None: continue
    # depth past the line: the ball's x at the snap is 0 in this frame
    if not (0 <= at(P, F, carrier)[0] <= 12): continue
    qb = [j for j, q in enumerate(P['players']) if q['pos'] == 'QB']
    if not qb: continue
    for j, pl in enumerate(P['players']):
        if pl['side'] != 'D': continue
        p = at(P, F, j); v = vel(P, F, j); cp = at(P, F, carrier)
        if not p or not v or not cp: continue
        L = math.hypot(cp[0] - p[0], cp[1] - p[1])
        if L > 8 or L < 1.5 or math.hypot(*v) < 1: continue
        line = math.atan2(cp[1] - p[1], cp[0] - p[0])
        if ang(math.atan2(v[1], v[0]), line) >= 45: continue
        qp = at(P, T, qb[0]); o = P['o'][F][j]
        if qp is None or o is None: continue
        if ang(math.radians(o), math.atan2(qp[1] - p[1], qp[0] - p[0])) <= 90: continue   # facing the QB: not the straight, hips-on-the-line row
        ok = True; gain = {}
        for k in range(0, 6):
            pk = at(P, F + k, j); ck = at(P, F + k, carrier)
            if not pk or not ck or math.hypot(ck[0] - pk[0], ck[1] - pk[1]) < 1.0: ok = False; break
        if not ok: continue
        def along(k):
            vk = vel(P, F + k, j); pk = at(P, F + k, j); ck = at(P, F + k, carrier)
            if not vk or not pk or not ck: return None
            l = math.atan2(ck[1] - pk[1], ck[0] - pk[0]); return vk[0] * math.cos(l) + vk[1] * math.sin(l)
        a0, a2, a5 = along(0), along(2), along(5)
        if None in (a0, a2, a5): continue
        rows.append((a0, a2, a5, L))
q = lambda v, p: sorted(v)[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
print(f'NFL straight row, unbroken 0.5 s, 0-12 yd completions: n {len(rows)}')
for lo, hi in [(1, 3), (3, 3.5), (3.5, 4.5), (4.5, 5.5), (5.5, 7), (7, 12)]:
    R = [r for r in rows if lo <= r[0] < hi]
    if len(R) < 15: continue
    print(f'  speed at the catch {lo}-{hi}: n {len(R):4} | at catch {q([r[0] for r in R], .5):.2f}  +0.25 s {q([r[1] for r in R], .5):.2f}  +0.5 s {q([r[2] for r in R], .5):.2f} | gain +0.25 {q([r[1]-r[0] for r in R], .5):+.2f}  +0.5 {q([r[2]-r[0] for r in R], .5):+.2f}  (p25/p75 of the +0.5 gain {q([r[2]-r[0] for r in R], .25):+.2f}/{q([r[2]-r[0] for r in R], .75):+.2f})')
