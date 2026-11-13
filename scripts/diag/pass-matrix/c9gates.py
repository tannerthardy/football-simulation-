"""CUSHION_BREAK gates on common-format plays, the same code on NFL and sim (Defense, C9; report only).
1. Downfield body contact before the throw (Coverage's precontact definition): share of dropbacks with a pass where
   some defender (not DL) is within 0.6 yd of a receiver 5+ yd past the line at any frame before pass_forward.
2. Deep targets (target 20+ yd past the line at arrival) by speed difference: the target's peak speed from the snap
   to arrival minus the peak speed of the defender nearest him at arrival. Completion and yards per attempt.
3. Comebacks/stops: targets 8+ yd past the line at the throw whose downfield speed at arrival is below -0.5 yd/s
   (working back to the ball). Completion, yards per attempt, the nearest defender's distance at arrival.
Splits: man (C0/C1/2-Man) vs zone (C2/C3/C4/C6).
  python3 -I c9gates.py <plays.jsonl.gz>[,more] [covfam.json]"""
import sys, json, gzip, math, statistics as S, collections as C
NFL_COV = {'Cover-0': 'man', 'Cover-1': 'man', 'Cover-1 Double': 'man', '2-Man': 'man', 'Cover-2': 'zone', 'Cover-3': 'zone',
           'Cover-3 Seam': 'zone', 'Cover-3 Cloud Left': 'zone', 'Cover-3 Cloud Right': 'zone', 'Cover-3 Double Cloud': 'zone',
           'Quarters': 'zone', 'Cover 6-Left': 'zone', 'Cover-6 Right': 'zone'}
SIM = {'cover0': 'man', 'cover1': 'man', 'cover2man': 'man', 'cover2': 'zone', 'tampa2': 'zone', 'cover3': 'zone', 'cover4': 'zone', 'cover6': 'zone'}
paths = sys.argv[1].split(','); fam = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
pre = C.defaultdict(lambda: [0, 0]); deep = C.defaultdict(list); back = C.defaultdict(list)
for path in paths:
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); p = p.get('common', p)
        if p.get('kind') != 'pass': continue
        lab = (p.get('cell') or {}).get('coverage'); mz = NFL_COV.get(lab) or SIM.get(fam.get(lab, lab))
        if not mz: continue
        ev = p['events']; thr = ev.get('pass_forward')
        if thr is None: continue
        X = p['xy']; dt = p.get('dt', 0.1); kr = min(len(X) - 1, int(round(thr / dt)))
        pos = lambda d, k: (X[k][2 * d], X[k][2 * d + 1])
        O = [d for d, a in enumerate(p['players']) if a['side'] == 'O' and a['group'] not in ('OL', 'QB')]
        D = [d for d, a in enumerate(p['players']) if a['side'] == 'D' and a['group'] != 'DL']
        hit = False
        for k in range(0, kr + 1):
            for o in O:
                ox, oy = pos(o, k)
                if ox is None or ox < 5: continue
                if any(pos(d, k)[0] is not None and math.hypot(pos(d, k)[0] - ox, pos(d, k)[1] - oy) < 0.6 for d in D): hit = True; break
            if hit: break
        pre[mz][0] += hit; pre[mz][1] += 1
        t = p.get('target'); arr = ev.get('pass_arrived')
        if t is None or arr is None: continue
        ka = min(len(X) - 1, int(round(arr / dt)))
        if pos(t, ka)[0] is None or pos(t, ka - 1)[0] is None: continue
        tx, ty = pos(t, ka); caught = 'catch' in ev and p.get('receiver', t) == t and not (p.get('labels') or {}).get('interception'); yd = (p.get('yards') or 0) if caught else 0
        near = min(((math.hypot(pos(d, ka)[0] - tx, pos(d, ka)[1] - ty), d) for d in D if pos(d, ka)[0] is not None), default=None)
        if near is None: continue
        def peak(d):
            v = [math.hypot(pos(d, k)[0] - pos(d, k - 1)[0], pos(d, k)[1] - pos(d, k - 1)[1]) / dt for k in range(1, ka + 1) if pos(d, k)[0] is not None and pos(d, k - 1)[0] is not None]
            return max(v) if v else 0
        if tx >= 20: deep[mz].append((peak(t) - peak(near[1]), caught, yd))
        if pos(t, kr)[0] is not None and pos(t, kr)[0] >= 8 and (tx - pos(t, ka - 1)[0]) / dt < -0.5: back[mz].append((caught, yd, near[0]))
print(f"== {','.join(x.split('/')[-1] for x in paths)}")
for mz in ('man', 'zone'):
    h, n = pre[mz]
    print(f"  {mz:4}: downfield contact before the throw {h / max(1, n):.1%} of {n} dropbacks")
    V = deep[mz]
    for name, lo, hi in (('receiver slower (< -0.5)', -99, -0.5), ('even (+-0.5)', -0.5, 0.5), ('receiver faster (> +0.5)', 0.5, 99)):
        B = [v for v in V if lo <= v[0] < hi]
        if B: print(f"        deep, {name:26} n {len(B):4}: completion {sum(b[1] for b in B) / len(B):.1%}, yd/att {S.mean(b[2] for b in B):.1f}")
    if V: print(f"        deep, all {' ' * 22} n {len(V):4}: completion {sum(b[1] for b in V) / len(V):.1%}, yd/att {S.mean(b[2] for b in V):.1f}")
    B = back[mz]
    if B: print(f"        comeback/stop (8+ yd, working back) n {len(B)}: completion {sum(b[0] for b in B) / len(B):.1%}, yd/att {S.mean(b[1] for b in B):.1f}, nearest at arrival p50 {sorted(b[2] for b in B)[len(B) // 2]:.1f} yd")
