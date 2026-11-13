"""Zone OL running flat (Integration, 2026-11-10: the backside tackle on zone runs). NFL run records
(out/mechanics/nfl-plays.jsonl.gz) or the sim's dump-zone/run-frames records with cell.concept / concept. Outside- and
inside-zone runs; OL ordered by y at the snap; run direction = the sign of the carrier's lateral move by 1.5 s; the
backside tackle = the end OL away from it, the playside tackle the other end, guards next in. Start = first 0.1 s frame
displaced 0.25 yd from his snap spot; after it, displacement (yd) and speed (yd/s, 0.2 s window) at +0.5 / +1.0 / +1.5 s,
and the lateral part of his speed toward the run. p50 / p75 / p90.
usage: python3 -I ol-flat.py <nfl.jsonl.gz> [concept substring, default ZONE]"""
import sys, json, gzip, math, collections as C
path = sys.argv[1]; want = sys.argv[2] if len(sys.argv) > 2 else 'ZONE'
R = C.defaultdict(lambda: C.defaultdict(list))
for l in gzip.open(path, 'rt'):
    p = json.loads(l)
    if p.get('kind') != 'run' or want not in str((p.get('cell') or {}).get('concept', '')) or p.get('carrier') is None:
        continue
    X, pl, c = p['xy'], p['players'], p['carrier']
    if len(X) < 18:
        continue
    OL = sorted([i for i, q in enumerate(pl) if q['group'] == 'OL'], key=lambda i: X[0][2 * i + 1])
    if len(OL) != 5:
        continue
    sgn = 1 if X[15][2 * c + 1] - X[0][2 * c + 1] >= 0 else -1
    roles = {'backside T': OL[0] if sgn > 0 else OL[4], 'playside T': OL[4] if sgn > 0 else OL[0], 'backside G': OL[1] if sgn > 0 else OL[3], 'playside G': OL[3] if sgn > 0 else OL[1]}
    for role, i in roles.items():
        x0, y0 = X[0][2 * i], X[0][2 * i + 1]
        s = next((f for f in range(1, len(X)) if math.hypot(X[f][2 * i] - x0, X[f][2 * i + 1] - y0) >= 0.25), None)
        if s is None:
            continue
        R[role]['start'].append(s * 0.1)
        for k in (5, 10, 15):
            f = s + k
            if f + 1 < len(X):
                R[role][f'd{k}'].append(math.hypot(X[f][2 * i] - X[s][2 * i], X[f][2 * i + 1] - X[s][2 * i + 1]))
                vx, vy = (X[f + 1][2 * i] - X[f - 1][2 * i]) / 0.2, (X[f + 1][2 * i + 1] - X[f - 1][2 * i + 1]) / 0.2
                R[role][f'v{k}'].append(math.hypot(vx, vy)); R[role][f'lat{k}'].append(vy * sgn)
pc = lambda a, q: sorted(a)[int(q * (len(a) - 1))] if a else float('nan')
for role in ('backside T', 'backside G', 'playside G', 'playside T'):
    r = R[role]
    print(f"{role:10s} n {len(r['d5']):5d} start p50 {pc(r['start'], .5):.1f} s")
    for k in (5, 10, 15):
        print(f"   +{k / 10:.1f} s  disp p50/p75/p90 {pc(r[f'd{k}'], .5):.2f} {pc(r[f'd{k}'], .75):.2f} {pc(r[f'd{k}'], .9):.2f} | speed {pc(r[f'v{k}'], .5):.2f} {pc(r[f'v{k}'], .75):.2f} {pc(r[f'v{k}'], .9):.2f} | toward the run {pc(r[f'lat{k}'], .5):.2f} {pc(r[f'lat{k}'], .75):.2f} {pc(r[f'lat{k}'], .9):.2f}")
