"""When do box backers' run and dropback motions split? 2022 run-film archive (or a sim dump in
the same format). Box LB: 1.6-7 yd deep within 6 yd of the OL centre at the snap. Groups: zone
runs (OZ/IZ), zone play action (pass with an OZ/IZ concept), dropbacks (pass, no run concept).
Downhill speed = toward the LOS, 0.2 s central difference; frames from the snap (NFL +0.1 s).
'moving at the snap' = speed over the first 0.1 s > 0.5 yd/s. Per rep, 'trigger' = first time
downhill speed >= 1.0 yd/s held for 0.2 s (a commitment, not a read). usage: readsplit.py FILE..."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as f:
        for line in f:
            p = json.loads(line); c = p['cell'].get('concept')
            g = ('run' if c in ('OUTSIDE ZONE', 'INSIDE ZONE') else None) if p['kind'] == 'run' else ('pa' if c in ('OUTSIDE ZONE', 'INSIDE ZONE') else 'drop' if c in ('NA', None, 'UNDEFINED') else None)
            if g: yield g, p, (1 if path.endswith('.gz') else 0)
def q(v, a): v = sorted(v); return v[int(a * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    D = collections.defaultdict(list); T = collections.defaultdict(list)
    for g, p, sh in plays(path):
        pl, X = p['players'], p['xy']
        OL = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'OL']
        if len(OL) != 5 or len(X) < 14 + sh: continue
        cy = sum(X[sh][2 * i + 1] for i in OL) / 5
        for j, x in enumerate(pl):
            if x['side'] != 'D' or x['group'] != 'LB': continue
            x0, y0 = X[sh][2 * j], X[sh][2 * j + 1]
            if not (1.6 < x0 <= 7 and abs(y0 - cy) <= 6): continue
            mv = math.hypot(X[sh + 1][2 * j] - x0, X[sh + 1][2 * j + 1] - y0) / .1 > .5
            dn = [-(X[f + 1][2 * j] - X[f - 1][2 * j]) / .2 for f in range(sh + 1, min(len(X) - 1, sh + 13))]
            for k, v in enumerate(dn, 1): D[(g, mv, k)].append(v); D[(g, 'all', k)].append(v)
            trig = next((k for k in range(1, len(dn) - 1) if dn[k - 1] >= 1 and dn[k] >= 1 and dn[k + 1] >= 1), None)
            T[(g, mv)].append(trig / 10 if trig else None); T[(g, 'all')].append(trig / 10 if trig else None)
    print('==', path.split('/')[-1])
    for mv in ('all', False, True):
        lab = {'all': 'all', False: 'still at snap', True: 'moving at snap'}[mv]
        n = {g: len(T[(g, mv)]) for g in ('run', 'pa', 'drop')}
        print(f'  [{lab}] reps run {n["run"]} pa {n["pa"]} drop {n["drop"]}')
        print('    t(s)  downhill p50: run / pa / drop   (run-drop)')
        split = None
        for k in range(1, 12):
            r, a, d = (st.median(D[(g, mv, k)]) if D[(g, mv, k)] else float('nan') for g in ('run', 'pa', 'drop'))
            if split is None and r - d >= 0.5: split = k / 10
            if k in (1, 2, 3, 4, 5, 6, 8, 10): print(f'    {k/10:.1f}   {r:+.2f} / {a:+.2f} / {d:+.2f}   ({r-d:+.2f})')
        for g in ('run', 'pa', 'drop'):
            v = [x for x in T[(g, mv)] if x is not None]
            print(f'    trigger (downhill >= 1 yd/s for 0.2 s) {g}: {100*len(v)/max(1,len(T[(g,mv)])):.0f}% by 1.1 s, p25/p50/p75 {q(v,.25):.1f}/{q(v,.5):.1f}/{q(v,.75):.1f} s')
        print(f'    split (run median >= drop + 0.5 yd/s) at {split} s')
