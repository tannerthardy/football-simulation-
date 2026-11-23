"""Rules' BDB 2024 miss-curve rows (bdb2024_miss_curves.py `extract`) built the same way from sim-tracks.mts output, so
its `tables` command reads our games unchanged. The attempt moment, look-backs and features copy its extract logic:
attempt = the first frame within CONTACT yd, or the first local minimum of distance under REACH yd if earlier; dropped
if never within DROP yd; features at 0.3 s (and 0.5 s) before the attempt.
Usage: python3 -I sim-rows.py TRACKS.json OUT.jsonl"""
import json, math, sys
CONTACT, REACH, DROP, LOOKBACKS, W = 1.0, 2.5, 2.5, (0.3, 0.5), 53.33
def unit(vx, vy, fb=(1.0, 0.0)):
    s = math.hypot(vx, vy); return (vx / s, vy / s) if s > 1.0 else fb
J = json.load(open(sys.argv[1])); out = open(sys.argv[2], 'w'); n_out = 0
for pi, p in enumerate(J['plays']):
    F = p['frames']; frames = list(range(len(F)))
    car = {i: ((F[i]['c'][0], F[i]['c'][1]), (F[i]['c'][2], F[i]['c'][3])) for i in frames}
    defs = {k: {i: F[i]['d'][k] for i in frames if k in F[i]['d']} for k in F[0]['d']}
    for n, kind in p['lab'].items():
        if n not in defs: continue
        dist = {f: math.dist(defs[n][f][:2], car[f][0]) for f in frames if f in defs[n]}
        fs = sorted(dist); closest = min(dist.values())
        row = dict(key=[J['firstSeed'], pi], id=n, kind=kind, ptype=p['ptype'], pos=p['pos'].get(n, '?'), closest=round(closest, 2))
        if closest > DROP:
            row['dropped'] = True; out.write(json.dumps(row) + '\n'); n_out += 1; continue
        contact = next((f for f in fs if dist[f] <= CONTACT), None)
        localmin = next((f for i, f in enumerate(fs) if dist[f] < REACH and (i == 0 or dist[f] <= dist[fs[i - 1]])
                         and (i == len(fs) - 1 or dist[f] < dist[fs[i + 1]])), None)
        cands = [f for f in (contact, localmin) if f is not None]
        fa = min(cands) if cands else min(dist, key=dist.get)
        row['attempt_dist'] = round(dist[fa], 2)
        for lb in LOOKBACKS:
            fl = fa - round(lb * 10)
            if fl not in car or fl not in dist: fl = fs[0]
            (cx, cy), (cvx, cvy) = car[fl]; dx, dy, dvx, dvy = defs[n][fl]
            u = unit(cvx, cvy); rx, ry = dx - cx, dy - cy
            along, lat = rx * u[0] + ry * u[1], -rx * u[1] + ry * u[0]
            near_side = -1 if cy < W / 2 else 1
            prev = fl - 3
            closing = (dist[prev] - dist[fl]) / 0.3 if prev in dist else None
            traffic = sum(1 for m, tr in defs.items() if m != n and fl in tr and math.dist(tr[fl][:2], (cx, cy)) <= 5)
            sfx = '' if lb == LOOKBACKS[0] else '_' + str(lb)
            row.update({k + sfx: v for k, v in dict(
                bearing='ahead' if along > 1 else 'behind' if along < -1 else 'level', outside=(dy - cy) * near_side > 0,
                along=round(along, 2), lat=round(lat, 2), dist=round(dist[fl], 2),
                closing=round(closing, 2) if closing is not None else None,
                cs=round(math.hypot(cvx, cvy), 2), ds=round(math.hypot(dvx, dvy), 2),
                dlat=round((dvx * -u[1] + dvy * u[0]) - (cvx * -u[1] + cvy * u[0]), 2),
                traffic=traffic, sideline=round(min(cy, W - cy), 2)).items()})
        row.update(dropped=False, t=round(F[fa]['t'], 1), yds_after=round(car[frames[-1]][0][0] - car[fa][0][0], 1))
        out.write(json.dumps(row) + '\n'); n_out += 1
print('rows', n_out)
