# The underneath layer (Defense, UNDER_PASS witnesses). One operator over the common play format (xy at 10 Hz,
# offence attacks +x, frame 0 = the snap) for the NFL and the sim, geometric only (no route or coverage labels).
#
# A. Depth under an in-breaker.  At the throw (events.pass_forward): an intermediate in-breaker is a receiver 10-15 yd
#    past the line moving inside (toward the ball's y at the snap) faster than downfield over the last 0.3 s, at 3+ yd/s;
#    "with a shallow under it" when another receiver is 0-6 yd past the line moving across (lateral faster than
#    downfield, 3+ yd/s) the same way.  For each in-breaker: the nearest defender shallower than him (not a deep man):
#    his depth, the in-breaker's depth minus his, the distance between them; and, when the throw went to the in-breaker,
#    completion.
# B. The curl-flat's first second.  Pass plays thrown at 1.5 s or later.  On each side with two or more receivers
#    detached from the formation (3+ yd outside the tackles' snap width): No. 1 the widest, No. 2 the next.  The apex is
#    the off-ball defender (2-8 yd past the line at the snap) nearest No. 2 and not the nearest defender to No. 1.  His
#    depth at the snap, 1.0 and 1.5 s, by No. 2's release over 0.5-1.0 s: vertical (downfield faster than lateral),
#    out, in.  A defender at or past the line (within 1.5 yd) by 2.0 s is a rusher and left out.
#   python3 -I underneath.py nfl=PLAYS.jsonl.gz sim=PLAYS.jsonl.gz
import sys, gzip, json, math
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j):
    if f < 0 or f >= len(P['xy']): return None
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def disp(P, f0, f1, j):
    a, b = at(P, f0, j), at(P, f1, j)
    return None if a is None or b is None else ((b[0] - a[0]) / ((f1 - f0) * P['dt']), (b[1] - a[1]) / ((f1 - f0) * P['dt']))
def q(v, p):
    v = sorted(x for x in v if x is not None)
    return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
def part_a(P, out):
    ev = P.get('events', {})
    if P.get('kind') != 'pass' or 'pass_forward' not in ev or not P.get('bxy'): return
    F = int(round(ev['pass_forward'] / P['dt']))
    if F < 4: return
    los, by = P['bxy'][0]
    off = [j for j, p in enumerate(P['players']) if p['side'] == 'O' and p.get('group') in ('WR', 'TE', 'RB')]
    dfn = [j for j, p in enumerate(P['players']) if p['side'] == 'D']
    mv = {}
    for j in off:
        p, v = at(P, F, j), disp(P, F - 3, F, j)
        if p and v: mv[j] = (p, v)
    for j, (p, v) in mv.items():
        dep = p[0] - los; inward = -math.copysign(1, p[1] - by) if abs(p[1] - by) > 0.5 else 0
        if not (10 <= dep <= 15 and inward and v[1] * inward > abs(v[0]) and math.hypot(*v) >= 3): continue
        shallow = any(k != j and 0 <= pk[0] - los <= 6 and abs(vk[1]) > abs(vk[0]) and math.hypot(*vk) >= 3 and vk[1] * inward > 0 for k, (pk, vk) in mv.items())
        best = None
        for d in dfn:
            a = at(P, F, d)
            if a is None or a[0] - los >= dep: continue
            dd = math.hypot(a[0] - p[0], a[1] - p[1])
            if best is None or dd < best[0]: best = (dd, a[0] - los)
        if best is None: continue
        thrown = P.get('target') == j
        out.append(dict(shallow=shallow, dep=dep, hisDepth=best[1], gap=dep - best[1], dist=best[0], thrown=thrown, cmp=thrown and P.get('_cmp', False)))
def part_b(P, out):
    ev = P.get('events', {})
    if P.get('kind') != 'pass' or ev.get('pass_forward', 0) < 1.5 or not P.get('bxy') or len(P['xy']) < 16: return
    los, by = P['bxy'][0]
    ol = [at(P, 0, j) for j, p in enumerate(P['players']) if p['side'] == 'O' and p.get('group') == 'OL']
    ol = [a for a in ol if a]
    if len(ol) < 4: return
    lo, hi = min(a[1] for a in ol), max(a[1] for a in ol)
    off = [(j, at(P, 0, j)) for j, p in enumerate(P['players']) if p['side'] == 'O' and p.get('group') in ('WR', 'TE', 'RB')]
    dfn = [(j, at(P, 0, j)) for j, p in enumerate(P['players']) if p['side'] == 'D']
    dfn = [(j, a) for j, a in dfn if a]
    for sgn, edge in ((1, hi), (-1, lo)):
        rec = sorted([(j, a) for j, a in off if a and sgn * (a[1] - edge) > 3], key=lambda t: -sgn * t[1][1])
        if len(rec) < 2: continue
        (j1, a1), (j2, a2) = rec[0], rec[1]
        n1 = min(dfn, key=lambda t: math.hypot(t[1][0] - a1[0], t[1][1] - a1[1]))[0]
        cand = [(j, a) for j, a in dfn if j != n1 and 2 <= a[0] - los <= 8]
        if not cand: continue
        ap, aa = min(cand, key=lambda t: math.hypot(t[1][0] - a2[0], t[1][1] - a2[1]))
        if math.hypot(aa[0] - a2[0], aa[1] - a2[1]) > 6: continue
        v2 = disp(P, 5, 10, j2)
        if v2 is None: continue
        rel = 'vertical' if v2[0] > abs(v2[1]) else ('out' if sgn * v2[1] > 0 else 'in')
        d10, d15, d20 = at(P, 10, ap), at(P, 15, ap), at(P, 20, ap)
        if d10 is None or d15 is None: continue
        if d20 is not None and d20[0] - los < 1.5: continue  # a rusher: at or past the line by 2.0 s
        out.append(dict(rel=rel, d0=aa[0] - los, d10=d10[0] - los, d15=d15[0] - los))
for spec in sys.argv[1:]:
    kind, files = spec.split('=', 1); files = files.split(',')
    cmp = {}
    if kind.startswith('nfl') and len(files) > 1:
        for b in jl(files[1]): cmp[b['id']] = b.get('passResult') == 'C'
    A, B = [], []
    for P in jl(files[0]):
        if kind.startswith('nfl'): P['_cmp'] = cmp.get(P['id'], False)
        else:
            lab = P.get('labels', {}); P['_cmp'] = 'catch' in P.get('events', {}) and not lab.get('interception')
        part_a(P, A); part_b(P, B)
    print(f'== {kind}')
    for lab, S in (('in-breaker 10-15 yd, shallow under it', [r for r in A if r['shallow']]), ('in-breaker 10-15 yd, no shallow', [r for r in A if not r['shallow']])):
        T = [r for r in S if r['thrown']]
        print(f"  A {lab:38s} n {len(S):5d} | nearest shallower defender depth p25/p50/p75 {q([r['hisDepth'] for r in S], .25):4.1f}/{q([r['hisDepth'] for r in S], .5):4.1f}/{q([r['hisDepth'] for r in S], .75):4.1f} | "
              f"under the route by {q([r['gap'] for r in S], .5):4.1f} yd | distance {q([r['dist'] for r in S], .5):4.1f} | thrown to {len(T)}, completion {sum(r['cmp'] for r in T) / max(1, len(T)):.2f}")
    for rel in ('vertical', 'out', 'in'):
        S = [r for r in B if r['rel'] == rel]
        print(f"  B apex over No. 2, No. 2 {rel:8s} n {len(S):5d} | depth at the snap {q([r['d0'] for r in S], .5):4.1f}, at 1.0 s {q([r['d10'] for r in S], .25):4.1f}/{q([r['d10'] for r in S], .5):4.1f}/{q([r['d10'] for r in S], .75):4.1f}, at 1.5 s {q([r['d15'] for r in S], .25):4.1f}/{q([r['d15'] for r in S], .5):4.1f}/{q([r['d15'] for r in S], .75):4.1f}")
