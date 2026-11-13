"""The second man (Integration, 2026-11-10): after a zone run's first contact, who else is there, and why ours arrive
less often. Same code on NFL tracking and sim zone dumps (frontcourse.py's loader; groups from the NFL export's
players[].group or the dump's dg). First contact as backfield.py (first frame at or after the handoff that a defender's
centre is within 1.0 yd of the carrier's).

For every other defender at that frame:
- his distance to the runner and role (DL / LB / DB);
- blocked (an offensive non-carrier within 1.2 yd);
- his speed, and closing speed toward the runner's current position;
- whether he is within 1.0 yd of the runner by +0.5 s ("arrives");
- his velocity toward the runner, mean over the 0.5 s, and whether an offensive body stays within 1.2 yd of him throughout.
Reported by contact depth: the share of runs with a second man by +0.5 s, the count of others within 2 / 3 / 5 yd at
contact, and, for the others within 5 yd, arrival rate by role and by blocked or free, with their median closing speed.
usage: python3 -I secondman.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, os, json, gzip, math, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]   # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
sys.argv = _argv


def groups(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in ('OUTSIDE ZONE', 'INSIDE ZONE') or not p['events'].get('end'):
                continue
            yield [q['group'] for q in p['players'] if q['side'] == 'D'], p['cell']['concept'][:2]
    else:
        for l in open(path):
            r = json.loads(l); yield r['dg'], r['concept'][:2]


def rows(path):
    for (C, D, O, ho, e, *_), (G, con) in zip(fc.plays(path), groups(path)):
        h = max(1, int(round(ho * 10)))
        hit = next((f for f in range(h, e + 1) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or hit < 1:
            continue
        j = min(range(len(D[hit])), key=lambda k: math.dist(D[hit][k], C[hit]))
        f5 = min(e, hit + 5)
        others = []
        for k in range(len(D[hit])):
            if k == j:
                continue
            d = math.dist(D[hit][k], C[hit]); vx, vy = (D[hit][k][0] - D[hit-1][k][0]) * 10, (D[hit][k][1] - D[hit-1][k][1]) * 10
            rx, ry = C[hit][0] - D[hit][k][0], C[hit][1] - D[hit][k][1]
            arr = any(math.dist(D[f][k], C[f]) <= 1.0 for f in range(hit + 1, f5 + 1))
            # His velocity toward the runner, mean over the 0.5 s after contact (backward differences, each frame's line).
            tow = []
            for f in range(hit + 1, f5 + 1):
                ux, uy = C[f][0] - D[f][k][0], C[f][1] - D[f][k][1]; un = math.hypot(ux, uy) or 1e-9
                tow.append(((D[f][k][0] - D[f-1][k][0]) * ux + (D[f][k][1] - D[f-1][k][1]) * uy) * 10 / un)
            rtow = []
            for f in range(hit + 1, f5 + 1):
                ux, uy = D[f][k][0] - C[f][0], D[f][k][1] - C[f][1]; un = math.hypot(ux, uy) or 1e-9
                rtow.append(((C[f][0] - C[f-1][0]) * ux + (C[f][1] - C[f-1][1]) * uy) * 10 / un)
            still = all(any(math.dist(o, D[f][k]) <= 1.2 for o in O[f]) for f in range(hit, f5 + 1))
            others.append(dict(d=d, g=G[k] if k < len(G) else '?', blk=any(math.dist(o, D[hit][k]) <= 1.2 for o in O[hit]),
                               sp=math.hypot(vx, vy), cl=(vx * rx + vy * ry) / (d or 1e-9), arr=arr,
                               tow=sum(tow) / len(tow) if tow else None, still=still, rtow=sum(rtow) / len(rtow) if rtow else None,
                               fd=((D[f5][k][0]-D[hit][k][0])*(C[hit][0]-D[hit][k][0])+(D[f5][k][1]-D[hit][k][1])*(C[hit][1]-D[hit][k][1]))/(d or 1e-9),
                               fr=((C[f5][0]-C[hit][0])*(D[hit][k][0]-C[hit][0])+(C[f5][1]-C[hit][1])*(D[hit][k][1]-C[hit][1]))/(d or 1e-9),
                               dmin=min(math.dist(D[f][k], C[f]) for f in range(hit, f5 + 1)), dend=math.dist(D[f5][k], C[f5]),
                               jit=[math.dist(D[f+1][k], D[f-1][k]) / 2 - math.dist(D[f][k], ((D[f+1][k][0] + D[f-1][k][0]) / 2, (D[f+1][k][1] + D[f-1][k][1]) / 2)) * 0 for f in range(hit, f5)],
                               acc=[math.dist(D[f][k], ((D[f+1][k][0] + D[f-1][k][0]) / 2, (D[f+1][k][1] + D[f-1][k][1]) / 2)) for f in range(max(1, hit), min(e, f5))]))
        yield dict(con=con, depth=C[hit][0], second=any(o['arr'] for o in others), others=others, early=hit - h)


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else float('nan')


for p in sys.argv[1:]:
    R = list(rows(p))
    print(f"== {os.path.basename(p)}: {len(R)} zone runs with a first contact")
    for lab, lo, hi in (('-2..-1', -2, -1), ('-1..0', -1, 0), ('0..2', 0, 2), ('all', -99, 99)):
        S = [r for r in R if lo <= r['depth'] < hi]
        if not S:
            continue
        n = lambda dmax: med([sum(1 for o in r['others'] if o['d'] <= dmax) for r in S])
        mean_n = lambda dmax: sum(sum(1 for o in r['others'] if o['d'] <= dmax) for r in S) / len(S)
        print(f"   depth {lab:6} n {len(S):4}: second man by +0.5 s {100 * sum(r['second'] for r in S) / len(S):3.0f}% | others within 2 / 3 / 5 yd at contact (mean) {mean_n(2):.2f} / {mean_n(3):.2f} / {mean_n(5):.2f}")
        O5 = [o for r in S for o in r['others'] if o['d'] <= 5]
        parts = []
        for key, sel in (('DL', lambda o: o['g'] == 'DL'), ('LB', lambda o: o['g'] == 'LB'), ('DB', lambda o: o['g'] == 'DB'), ('blocked', lambda o: o['blk']), ('free', lambda o: not o['blk'])):
            s = [o for o in O5 if sel(o)]
            if s:
                parts.append(f"{key} {len(s)/len(S):.2f}/run arrive {100*sum(o['arr'] for o in s)/len(s):.0f}% close {med([o['cl'] for o in s]):+.1f}")
        print(f"   {'':14} within 5 yd: " + ' | '.join(parts))
        B2 = [o for o in O5 if o['d'] <= 2 and o['blk']]
        if B2:
            st2 = [o for o in B2 if o['still']]
            print(f"   {'':14}   blocked within 2 yd: velocity toward the runner over 0.5 s, mean {sum(o['tow'] for o in B2 if o['tow'] is not None)/len(B2):+.2f} yd/s"
                  f" | still blocked throughout ({100*len(st2)/len(B2):.0f}%) {sum(o['tow'] for o in st2 if o['tow'] is not None)/max(1,len(st2)):+.2f}, arrive {100*sum(o['arr'] for o in st2)/max(1,len(st2)):.0f}%"
                  f" | runner's velocity toward him {sum(o['rtow'] for o in B2 if o['rtow'] is not None)/len(B2):+.2f} yd/s | distance at contact median {med([o['d'] for o in B2]):.2f} (<= 1.5 yd {100*sum(o['d'] <= 1.5 for o in B2)/len(B2):.0f}%)")
        for lo2, hi2 in ((0, 2), (2, 3), (3, 5)):
            s = [o for o in O5 if lo2 < o['d'] <= hi2]
            if s:
                print(f"   {'':14}   at {lo2}-{hi2} yd: {len(s)/len(S):.2f}/run, blocked {100*sum(o['blk'] for o in s)/len(s):.0f}%, arrive {100*sum(o['arr'] for o in s)/len(s):.0f}% (free {100*sum(o['arr'] for o in s if not o['blk'])/max(1,sum(1 for o in s if not o['blk'])):.0f}%, blocked {100*sum(o['arr'] for o in s if o['blk'])/max(1,sum(1 for o in s if o['blk'])):.0f}%), closing {med([o['cl'] for o in s]):+.1f} yd/s, speed {med([o['sp'] for o in s]):.1f}")
