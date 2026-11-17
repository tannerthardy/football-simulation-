"""Zone pursuers from zone-man-after.mts rows: first tick 2.5-6 yd from a carrier > 6 yd/s, not ahead of him.
Over the next 0.5 s: velocity angle off his request (p50); then his closest approach for the rest of the play and
whether he is behind the carrier there (>= 120 deg off his run). usage: pursuer-geo.py DIR"""
import json, glob, math, sys
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
offs, clo, beh = [], [], []
for p in sorted(glob.glob(sys.argv[1] + '/cover[2-6].json')):
    for r in json.load(open(p)):
        tr = r['tr']
        for i in [d['i'] for d in tr[0]['d']]:
            D = [next(x for x in f['d'] if x['i'] == i) for f in tr]
            k0 = None
            for k, (f, d) in enumerate(zip(tr, D)):
                c = f['c']; cs = math.hypot(c['vx'], c['vy']); dx, dy = d['x'] - c['x'], d['y'] - c['y']; L = math.hypot(dx, dy)
                if cs > 6 and 2.5 <= L < 6 and (dx * c['vx'] + dy * c['vy']) / (L * cs) <= 0.5 and not d['eng']:
                    k0 = k; break
            if k0 is None: continue
            for d in D[k0:k0 + 6]:
                rq, v = math.hypot(d['rvx'], d['rvy']), math.hypot(d['vx'], d['vy'])
                if rq > 0.5 and v > 0.5: offs.append(math.degrees(math.acos(max(-1, min(1, (d['vx'] * d['rvx'] + d['vy'] * d['rvy']) / (rq * v))))))
            dist = [math.hypot(f['c']['x'] - d['x'], f['c']['y'] - d['y']) for f, d in zip(tr[k0:], D[k0:])]
            j = dist.index(min(dist)); f, d = tr[k0 + j], D[k0 + j]; c = f['c']; cs = math.hypot(c['vx'], c['vy'])
            clo.append(min(dist))
            if cs > 1 and min(dist) > 0: beh.append(((d['x'] - c['x']) * c['vx'] + (d['y'] - c['y']) * c['vy']) / (min(dist) * cs) <= -0.5)
print(f"pursuers {len(clo)}: velocity off request p50 {q(offs):.0f} deg | closest approach p50 {q(clo):.2f} yd, inside 1 yd {mean([x <= 1 for x in clo]):.0%} | behind at closest {mean(beh):.0%}")
