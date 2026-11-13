"""Pass pocket depth by time (Integration, 2026-11-10). Same code on NFL tracking (pass plays) and the sim's pass-pocket.mts
records: x from the line of scrimmage, offense attacking +x, frame 0 the snap, 0.1 s frames. Tackles = the two outermost
OL at the snap, guards the next two, centre the middle. Reports each group's depth behind the line (-x, yd; median) and
the QB's, at 0.5 / 1.0 / 1.5 / 2.0 / 2.5 / 3.0 s, over the plays whose ball has not yet been thrown then (and the count).
usage: python3 -I pocket.py <nfl.jsonl.gz | sim pass-pocket jsonl> [...]"""
import sys, os, json, gzip, statistics as st
T = (5, 10, 15, 20, 25, 30)
def plays(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'pass':
                continue
            pl, X = p['players'], p['xy']
            OL = [i for i, q in enumerate(pl) if q.get('group') == 'OL']; QB = [i for i, q in enumerate(pl) if q.get('group') == 'QB']
            if len(OL) != 5 or len(QB) != 1:
                continue
            OL.sort(key=lambda i: X[0][2 * i + 1])
            yield [[r[2 * i] for i in OL] for r in X], [r[2 * QB[0]] for r in X], p['events'].get('pass_forward')
    else:
        for l in open(path):
            r = json.loads(l)
            yield r['ol'], [q[0] for q in r['qb']], r['throw']
for path in sys.argv[1:]:
    R = {t: {'T': [], 'G': [], 'C': [], 'QB': []} for t in T}
    n = 0
    for ol, qb, thr in plays(path):
        n += 1
        for t in T:
            if t >= len(ol) or (thr is not None and thr <= t / 10):
                continue
            f = ol[t]
            R[t]['T'] += [-f[0], -f[4]]; R[t]['G'] += [-f[1], -f[3]]; R[t]['C'].append(-f[2]); R[t]['QB'].append(-qb[t])
    print(f"== {os.path.basename(path)}: {n} dropbacks; depth behind the line (yd, median) among plays not yet thrown")
    for t in T:
        r = R[t]
        if r['QB']:
            print(f"   {t/10:.1f} s (n {len(r['QB']):5}): tackles {st.median(r['T']):.2f}  guards {st.median(r['G']):.2f}  centre {st.median(r['C']):.2f}  QB {st.median(r['QB']):.2f}  | QB - guards {st.median(r['QB']) - st.median(r['G']):.2f}")
