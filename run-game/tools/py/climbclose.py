"""Zone climbs (block_climb events) on sim traces: over the 0.5 s after the climb decision, the climber's speed, his
velocity toward his target backer, the backer's velocity away from him, net closing on the target and on the nearest LB,
and what the climber was doing (engaged with whom, near another body)."""
import json, sys, math, statistics as st
from collections import Counter, defaultdict
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ"}
R = defaultdict(lambda: defaultdict(list)); C = defaultdict(Counter)
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; fr = p['frames']
        fam = next((v for k, v in FAM.items() if s.get('concept', '').startswith(k)), None)
        if not fam or not fr: continue
        lbs = [i for i, a in enumerate(ag) if a['team'] == 'D' and a['pos'] == 'LB']
        for ev in p['events']:
            if ev['type'] != 'block_climb' or ev['b'] is None: continue
            k0 = round(ev['t'] / 0.1); k1 = k0 + 5
            if k1 >= len(fr): continue
            m, tgt = ev['a'], ev['b']
            P = lambda k, i: fr[k]['a'][i]
            d = lambda k, a, b: math.dist(P(k, a)[:2], P(k, b)[:2])
            r = R[fam]
            r['close_target'].append(d(k0, m, tgt) - d(k1, m, tgt))
            if lbs:
                nl = min(lbs, key=lambda l: d(k0, m, l)); r['close_nearest'].append(d(k0, m, nl) - d(k1, m, nl))
                C[fam]['target is nearest LB' if nl == tgt else 'target not nearest LB'] += 1
            r['dist0'].append(d(k0, m, tgt))
            sp = []; tow = []; away = []
            for k in range(k0, k1):
                ux, uy = P(k, tgt)[0] - P(k, m)[0], P(k, tgt)[1] - P(k, m)[1]; n = math.hypot(ux, uy) or 1; ux /= n; uy /= n
                sp.append(math.hypot(P(k, m)[2], P(k, m)[3])); tow.append(P(k, m)[2] * ux + P(k, m)[3] * uy)
                away.append(P(k, tgt)[2] * ux + P(k, tgt)[3] * uy)
                eng = P(k, m)[5]
                C[fam]['tick ' + ('engaged w/ ' + ('target' if eng == tgt else ag[eng]['pos']) if eng >= 0 else 'free')] += 1
                near = min((math.dist(P(k, m)[:2], P(k, j)[:2]) for j in range(len(ag)) if j not in (m, tgt)), default=9)
                C[fam]['tick ' + ('within 1.0 yd of another body' if near < 1.0 else 'clear')] += 1
                C[fam]['tick kind ' + str(P(k, m)[8])] += 1
            r['speed'].append(st.mean(sp)); r['toward'].append(st.mean(tow)); r['backer_away'].append(st.mean(away))
for fam in sorted(R):
    r = R[fam]; n = len(r['speed'])
    print(f"{fam}: climbs {n} | dist to target {st.median(r['dist0']):.2f} | closing on target {st.median(r['close_target']):.2f} yd/0.5s | on nearest LB {st.median(r['close_nearest']):.2f}")
    print(f"   climber speed {st.median(r['speed']):.2f} | toward target {st.median(r['toward']):.2f} | backer away from him {st.median(r['backer_away']):.2f} yd/s")
    tot = sum(v for k, v in C[fam].items() if k.startswith('tick within') or k.startswith('tick clear'))
    print('   ' + '; '.join(f"{k} {v/tot:.2f}" for k, v in C[fam].most_common() if k.startswith('tick')))
    print('   ' + '; '.join(f"{k} {v}" for k, v in C[fam].items() if not k.startswith('tick')))
