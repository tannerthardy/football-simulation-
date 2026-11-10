"""Front-on first contacts on zone runs, split by carrier speed at contact and hitter class. Same contact, front-on and
gain rules as hitterback.py (first defender within 1.0 yd after the handoff; carrier depth -1..3; hitter within 45 deg
ahead of the carrier's travel; gain = carrier x from contact to the end). Hitter class as hitblk.py: blocked (an
offensive non-carrier within 1.2 yd of him), shed (not blocked, but within 1.2 yd of one on >= 3 of the previous 10
frames), free. Carrier speed from the frame before contact (yd/s).
Question: is the sim's front-on gain short at a given approach speed and hitter class, or does it arrive slower /
into more blocked hitters? usage: python3 -I hitterback-split.py <nfl.jsonl.gz | sim zone dump (with off)> [...]"""
import sys, json, gzip, math, statistics as st, collections


def plays(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in ('OUTSIDE ZONE', 'INSIDE ZONE'):
                continue
            end = p['events'].get('end')
            if not end:
                continue
            c = p['carrier']; X = p['xy']; pl = p['players']
            D = [i for i, q in enumerate(pl) if q['side'] == 'D']
            O = [i for i, q in enumerate(pl) if q['side'] == 'O' and i != c]
            yield ([(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X],
                   [[(r[2*i], r[2*i+1]) for i in O] for r in X], p['events'].get('handoff') or 0, min(int(round(end*10)), len(X)-1))
    else:
        for l in open(path):
            r = json.loads(l)
            if not r.get('off'):
                sys.exit('sim dump needs the "off" frames (dump-zone.mts "$PWD" off)')
            yield [tuple(x) for x in r['car']], r['def'], r['off'], r['handoff'], len(r['car'])-1


def speed_bin(v):
    return '<3' if v < 3 else '3-5' if v < 5 else '5+'


for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for C, D, O, ho, e in plays(path):
        h = max(1, int(round(ho*10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or e - hit < 2 or hit < 1 or not (-1 <= C[hit][0] < 3):
            continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        vx, vy = C[hit][0] - C[hit-1][0], C[hit][1] - C[hit-1][1]; sp = math.hypot(vx, vy)
        rx, ry = D[hit][j][0] - C[hit][0], D[hit][j][1] - C[hit][1]; rd = math.hypot(rx, ry) or 1
        if not (sp > 0.05 and (rx * vx + ry * vy) / (rd * sp) > math.cos(math.radians(45))):
            continue
        near = lambda f: any(math.dist(o, D[f][j]) <= 1.2 for o in O[f])
        cls = 'blocked' if near(hit) else 'shed' if sum(near(f) for f in range(max(0, hit-10), hit)) >= 3 else 'free'
        g = C[e][0] - C[hit][0]
        R[(cls, speed_bin(sp * 10))].append(g)
        R[('all', speed_bin(sp * 10))].append(g)
        R[(cls, 'all')].append(g)
        R[('all', 'all')].append(g)
    print('==', path.split('/')[-1], ' front-on first contacts at -1..3 yd: carrier gain to the end, median [n]')
    tot = len(R[('all', 'all')]) or 1
    for cls in ('all', 'blocked', 'shed', 'free'):
        cells = []
        for sb in ('<3', '3-5', '5+', 'all'):
            v = R.get((cls, sb), [])
            cells.append(f"{sb:>4}: {st.median(v):+.2f} [{len(v):3d}]" if v else f"{sb:>4}:    -   [  0]")
        share = len(R.get((cls, 'all'), [])) / tot
        print(f"   {cls:8} ({100*share:3.0f}%)  " + '   '.join(cells))
    sp = {sb: len(R.get(('all', sb), [])) / tot for sb in ('<3', '3-5', '5+')}
    print('   approach speed mix: ' + '  '.join(f"{k} {100*v:.0f}%" for k, v in sp.items()))
