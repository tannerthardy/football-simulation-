"""Does the tackle retreat because the rusher is gaining on his hip? (Flex, 2026-11-12: the anchor proposal's
pre-build diagnostic.) Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/hip-gain.py <plays.jsonl.gz> [...]

Pairing and the engaged-in-front frames as tackle-retreat.py (rusher within 1.2 yd of his tackle, not past, not
inside, ball in the QB's hands), from 1.0 s. `along` is PAST_ALONG_PATH's measure: the tackle's position relative to
the rusher projected on the rusher's direction of travel (negative = the rusher is ahead of him along his path).
Its rate (0.2 s differences, rusher speed >= 1 yd/s at both ends) is how fast the rusher is gaining on the hip:
negative = gaining. Per bin of that rate (and, second, per bin of the tackle's depth over the QB and of his depth
behind the line of scrimmage): the tackle's and the rusher's x-velocity (negative = toward the offence's
goal) and the share of frames with the tackle retreating faster than 1 yd/s.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BINS = ((-99, -1.5), (-1.5, -0.75), (-0.75, -0.25), (-0.25, 0.25), (0.25, 99))


def along(p, d, tk, k):
    vx, vy = p.velocity(d, k); sp = math.hypot(vx, vy)
    if sp < 1: return None
    (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
    return ((tx - rx) * vx + (ty - ry) * vy) / sp


for path in sys.argv[1:]:
    acc = {b: {'tv': [], 'rv': []} for b in BINS}; slow = {'tv': [], 'rv': []}
    DB = ((3, 99), (2, 3), (1.5, 2), (1, 1.5), (0, 1), (-99, 0)); dacc = {b: [] for b in DB}
    LB_ = ((-99, -7), (-7, -6), (-6, -5), (-5, -4), (-4, -3), (-3, 99)); lacc = {b: [] for b in LB_}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        by = raw['ball_y']; fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        for side in (-1, 1):
            tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by)); ty0 = p.pos(tk, 0)[1]; cand = []
            for d in DLB:
                x0, y0 = p.pos(d, 0)
                if x0 > 1.6: continue
                w = side * (y0 - ty0)
                if w < 0 or w > 4: continue
                k1 = min(p.k(1.0), p.frames - 1)
                if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
                cand.append((w, d))
            if not cand: continue
            d = max(cand)[1]
            for k in range(p.k(1.0), kend):
                (rx, ry), (tx, ty), (qx, _) = p.pos(d, k), p.pos(tk, k), p.pos(qb, k)
                if None in (rx, tx, qx) or p.pos(d, k + 1)[0] is None or p.pos(tk, k + 1)[0] is None: break
                if p.dist(d, tk, k) > 1.2 or rx - tx < -0.3 or side * (ry - by) - side * (ty - by) < -0.3: continue
                a0, a1 = along(p, d, tk, k - 1), along(p, d, tk, k + 1)
                tv, rv = p.velocity(tk, k)[0], p.velocity(d, k)[0]
                for b in DB:
                    if b[0] <= tx - qx < b[1]: dacc[b].append(tv)
                for b in LB_:
                    if b[0] <= tx < b[1]: lacc[b].append(tv)
                if a0 is None or a1 is None:
                    slow['tv'].append(tv); slow['rv'].append(rv); continue
                rate = (a1 - a0) / (2 * p.dt)
                for b in BINS:
                    if b[0] <= rate < b[1]: acc[b]['tv'].append(tv); acc[b]['rv'].append(rv)
    n = sum(len(a['tv']) for a in acc.values()) + len(slow['tv'])
    print(f"== {os.path.basename(path)}: engaged, rusher in front, from 1.0 s, ball in (frames {n})")
    for b in BINS:
        a = acc[b]
        if len(a['tv']) < 10: continue
        lab = f"{b[0]:+.2f}..{b[1]:+.2f}".replace('-99.00', ' -inf').replace('+99.00', '+inf')
        print(f"   gaining on the hip at {lab} yd/s ({100 * len(a['tv']) / n:4.1f}% of frames): tackle x-vel p25/50/75"
              f" {q(a['tv'], .25):+.2f}/{q(a['tv']):+.2f}/{q(a['tv'], .75):+.2f} (retreat > 1 yd/s {100 * sum(v < -1 for v in a['tv']) / len(a['tv']):.0f}%)"
              f" | rusher x-vel p50 {q(a['rv']):+.2f}")
    if slow['tv']:
        print(f"   rusher slower than 1 yd/s ({100 * len(slow['tv']) / n:4.1f}%): tackle x-vel p50 {q(slow['tv']):+.2f} | rusher {q(slow['rv']):+.2f}")
    for name, tab in (("tackle minus QB depth", dacc), ("tackle depth past the line (x)", lacc)):
        print(f"   by {name}:")
        for b, v in tab.items():
            if len(v) < 10: continue
            lab = f"{b[0]:+.1f}..{b[1]:+.1f}".replace('-99.0', '-inf').replace('+99.0', '+inf')
            print(f"     {lab:12s} ({100 * len(v) / n:4.1f}%): tackle x-vel p50 {q(v):+.2f} (retreat > 1 yd/s {100 * sum(x < -1 for x in v) / len(v):.0f}%)")
