"""OZ box backers: NFL group LB / sim LB slots, 2.5-7 yd deep within 4.5 yd of the OL centre at the snap. Lateral speed
toward the play (sign of mean OL lateral displacement at 1.0 s) per 0.1 s, 0.1-1.5 s, by third (backside / middle / play
side at the snap). NFL shifted 0.1 s. Sim from dump-zone.mts (defender groups 'dg')."""
import sys, gzip, json, math, statistics as st, collections
for path in sys.argv[1:]:
    R = collections.defaultdict(list); nfl = path.endswith('.gz'); sh = 1 if nfl else 0
    src = gzip.open(path, 'rt') if nfl else open(path)
    for line in src:
        if not line.startswith('{'): continue
        p = json.loads(line)
        if nfl:
            if p['kind'] != 'run' or p['cell'].get('concept') != 'OUTSIDE ZONE': continue
            pl = p['players']; X = p['xy']
            OL = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']; LB = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['group'] == 'LB']
            if len(OL) != 5 or len(X) < 17: continue
            ol = lambda f: [(X[f][2*i], X[f][2*i+1]) for i in OL]; lb = lambda f: [(X[f][2*i], X[f][2*i+1]) for i in LB]
        else:
            if p['concept'] != 'OUTSIDE ZONE': continue
            if len(p['def']) < 17: continue
            LB = [j for j, g in enumerate(p['dg']) if g == 'LB']
            ol = lambda f, p=p: [(0, y) for y in p['ol'][f]]; lb = lambda f, p=p, LB=LB: [tuple(p['def'][f][j]) for j in LB]
        y0 = [o[1] for o in ol(sh)]; cy = sum(y0) / 5
        ps = math.copysign(1, sum(o[1] for o in ol(10 + sh)) - sum(y0))
        for j, (x, y) in enumerate(lb(sh)):
            if not (2.5 <= x <= 7 and abs(y - cy) <= 4.5): continue
            off = (y - cy) * ps; third = 'play side' if off > 1.5 else 'backside' if off < -1.5 else 'middle'
            for b in range(1, 16):
                f = b + sh
                if f >= len(p['def'] if not nfl else X): break
                R[(third, b)].append((lb(f)[j][1] - lb(f - 1)[j][1]) * 10 * ps)
    print('==', path.split('/')[-1])
    for third in ('backside', 'middle', 'play side'):
        print(f"  {third:9} " + ' '.join(f"{b/10:.1f}:{st.mean(R[(third,b)]):+.2f}" for b in range(2, 16, 1) if R[(third, b)]))
