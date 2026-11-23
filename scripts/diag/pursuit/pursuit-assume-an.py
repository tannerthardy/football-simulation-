"""Stale-spot row from pursuit-assume.mts output. Usage: python3 -I pursuit-assume-an.py ROWS.json"""
import json, sys, math, collections
W = 53.33
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
R = json.load(open(sys.argv[1]))
for who in ('nearest', 'front'):
  for lab, keep in (('all', lambda r: True), ('outside (<= 12 yd from the sideline)', lambda r: min(r['frames'][0]['car'][1], W - r['frames'][0]['car'][1]) <= 12)):
    rows = []; stages = collections.Counter()
    for r in R:
        if not keep(r): continue
        F = r['frames']; f0 = F[0]; c0 = f0['car']; s0 = math.hypot(c0[2], c0[3]); u = (c0[2] / s0, c0[3] / s0) if s0 > 1 else (1, 0)
        cand = {k: d for k, d in f0['d'].items()}
        if who == 'front': cand = {k: d for k, d in cand.items() if (d['pos'][0] - c0[0]) * u[0] + (d['pos'][1] - c0[1]) * u[1] >= -1}
        if not cand: continue
        k = min(cand, key=lambda k: math.hypot(cand[k]['pos'][0] - c0[0], cand[k]['pos'][1] - c0[1]))
        sp = {round(f['t'], 1): math.hypot(f['car'][2], f['car'][3]) for f in F}
        lag = []; first = None
        for f in F:
            d = f['d'][k]; t = round(f['t'], 1)
            if math.hypot(d['pos'][0] - f['car'][0], d['pos'][1] - f['car'][1]) <= 1.0: break
            if d['stage']: stages[d['stage']] += 1
            if d['stage'] in ('meeting spot', 'on-top point') and d['assumedV'] is not None:
                lag.append(sp[t] - d['assumedV'])
                if first is None: first = (t, d['assumedV'], d['stage'], d.get('ahead'), d.get('commit'))
        if first:
            t, v, st, ah, cm = first
            rows.append(dict(t=t, v=v, st=st, ah=ah, cm=cm, now=sp.get(t), p05=sp.get(round(t + 0.5, 1)), p10=sp.get(round(t + 1.0, 1)), lag=q(lag, .5)))
    if not rows: continue
    n = len(rows)
    print(f"{who} defender, {lab}: n {n}; first pursuit stage at +{q([r['t'] for r in rows], .5):.1f} s p50 ({', '.join(f'{k} {100 * v / n:.0f}%' for k, v in collections.Counter(r['st'] for r in rows).most_common())})")
    print(f"  carrier speed assumed at commitment p50 {q([r['v'] for r in rows], .5):.1f}; actual then {q([r['now'] for r in rows], .5):.1f}, +0.5 s {q([r['p05'] for r in rows], .5):.1f}, +1.0 s {q([r['p10'] for r in rows], .5):.1f} yd/s")
    print(f"  actual minus assumed: at +0.5 s p50 {q([r['p05'] - r['v'] for r in rows if r['p05'] is not None], .5):+.1f} (p75 {q([r['p05'] - r['v'] for r in rows if r['p05'] is not None], .75):+.1f}); at +1.0 s p50 {q([r['p10'] - r['v'] for r in rows if r['p10'] is not None], .5):+.1f}; during pursuit (each tick vs that tick) p50 {q([r['lag'] for r in rows], .5):+.2f}")
    A = [r for r in rows if r['ah']]
    if A: print(f"  forecast speed (the meeting-spot forecast's own, where traced, n {len(A)}): +0.5 s p50 {q([r['ah'][0] for r in A], .5):.1f} vs actual {q([r['p05'] for r in A], .5):.1f} (actual minus forecast p50 {q([r['p05'] - r['ah'][0] for r in A if r['p05'] is not None], .5):+.1f}); +1.0 s {q([r['ah'][1] for r in A], .5):.1f} vs {q([r['p10'] for r in A], .5):.1f} (p50 {q([r['p10'] - r['ah'][1] for r in A if r['p10'] is not None], .5):+.1f}); heading commitment p50 {q([r['cm'] for r in A if r['cm'] is not None], .5):.2f} (p25 {q([r['cm'] for r in A if r['cm'] is not None], .25):.2f})")
    tot = sum(stages.values()); print('  pursuit ticks by stage before contact range: ' + ', '.join(f'{k} {100 * v / tot:.0f}%' for k, v in stages.most_common()))
