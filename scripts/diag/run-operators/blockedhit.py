"""After a blocked defender's first contact: how far does the runner get? The tracking reference for the one-armed grab
from inside a block (ONE_ARM_HOLD; docs/reviews/contact-to-whistle.md): in the sim 20% of those grabs break and the
runner goes on, so the question is what NFL runners do after a blocked defender first gets to them.

Same code on NFL tracking and sim dumps (dump-zone / dump-gap with `off`). First contact as hitblk.py: the first frame
after the handoff that any defender's centre is within 1.0 yd of the carrier's. Hitter class as hitblk.py: blocked (an
offensive non-carrier within 1.2 yd of him at that frame), shed, free. For each class: yards after contact (carrier x
from contact to the end; NFL end = events.end, sim = last frame) as median and shares >= 3 / >= 5 yd, contact to end
time, and the share where a second defender comes within 1.0 yd before the end. Split by carrier depth at contact.
usage: python3 -I blockedhit.py "<concepts, e.g. OUTSIDE ZONE,INSIDE ZONE>" <nfl.jsonl.gz | sim dumps> [...]"""
import sys, json, gzip, math, statistics as st, collections

CON = set(sys.argv[1].split(','))


def plays(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in CON:
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
            if r['concept'] not in CON:
                continue
            if not r.get('off'):
                sys.exit('sim dump needs the "off" frames (dump-zone.mts / dump-gap.mts "$PWD" off)')
            yield [tuple(x) for x in r['car']], r['def'], r['off'], r['handoff'], len(r['car'])-1


DEPTH = [(-99, 0, 'behind LOS'), (0, 3, '0..3'), (3, 99, '3+')]
for path in sys.argv[2:]:
    R = collections.defaultdict(list)
    for C, D, O, ho, e in plays(path):
        h = max(1, int(round(ho*10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or e - hit < 1:
            continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        near = lambda f: any(math.dist(o, D[f][j]) <= 1.2 for o in O[f])
        cls = 'blocked' if near(hit) else 'shed' if sum(near(f) for f in range(max(0, hit-10), hit)) >= 3 else 'free'
        second = any(any(k != j and math.dist(D[f][k], C[f]) <= 1.0 for k in range(len(D[f]))) for f in range(hit+1, e+1))
        depth = next(lab for lo, hi, lab in DEPTH if lo <= C[hit][0] < hi)
        row = (C[e][0] - C[hit][0], (e - hit) / 10, second)
        R[(cls, depth)].append(row); R[(cls, 'all')].append(row)
    print('==', path.split('/')[-1], ' first contact by hitter class: yards after contact, contact -> end, 2nd defender')
    for cls in ('blocked', 'shed', 'free'):
        for depth in ('all', 'behind LOS', '0..3', '3+'):
            v = R.get((cls, depth), [])
            if not v:
                continue
            g = [a for a, _, _ in v]
            print(f"   {cls:8} {depth:10} n {len(v):4}: after contact median {st.median(g):+.2f} yd, >=3 yd {100*sum(x >= 3 for x in g)/len(v):3.0f}%,"
                  f" >=5 yd {100*sum(x >= 5 for x in g)/len(v):3.0f}% | contact->end p50 {st.median(t for _, t, _ in v):.1f} s | 2nd defender {100*sum(s for *_, s in v)/len(v):3.0f}%")
