"""The Cover 2 middle hole (Coverage, 2026-11-24, HALF_ALIGN: halves standing on #2 like the NFL's may open the hole between
them). Tools' open-census play format (scripts/diag/census nfl_plays.py, sim_plays.mts), the same operator as
open_census_report.py: per route runner at the release and at 1.5 / 2.0 / 2.5 / 3.0 s while the ball is held, d1 = distance to
the nearest defender; wide open = d1 beyond the NFL's own p90 for that (moment kind, depth band). Here only Cover 2 (PFF
Cover-2; ours cover2 / tampa2) and receivers between the hashes (23 yd or more from both sidelines), in the 10-15 and 15-20
yd bands: receiver-moments, wide-open share, and the throws targeted there (the target at the release in that cell): per
team-game, completion share.
usage: python3 -I scripts/diag/defense-film/middle_hole.py NFL.jsonl.gz LABEL SIM.jsonl.gz [LABEL SIM.jsonl.gz ...]"""
import gzip, json, sys, math
import numpy as np

FIXED = (15, 20, 25, 30)
BANDS = [(-99, 0, 'behind'), (0, 5, '0-5'), (5, 10, '5-10'), (10, 15, '10-15'), (15, 20, '15-20'), (20, 99, '20+')]
band = lambda d: next(l for a, b, l in BANDS if a <= d < b)


def c2(p):
    if p['src'] == 'nfl': return 'cover-2' in (p.get('cov') or '').lower()
    return p.get('fam') in ('cover2', 'tampa2')


def rows(path):
    out, plays, games = [], 0, set()
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); games.add(p['id'].rsplit('-', 1)[0])
        if not c2(p): continue
        plays += 1
        X, Y = np.array(p['x']), np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p['rel']
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]
        dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        tgt = p.get('recv') if p['src'] == 'sim' else next((i for i, r in enumerate(pl) if r.get('target')), None)
        comp = (p.get('catch') is not None) if p['src'] == 'sim' else p.get('result') == 'C'
        ms = ([('rel', rel)] if rel is not None and rel < nf else []) + [('fix', f) for f in FIXED if f < nf and (rel is None or f < rel)]
        for kind, f in ms:
            for i in rec:
                rx, ry = X[i, f], Y[i, f]
                d1 = min(math.hypot(X[j, f] - rx, Y[j, f] - ry) for j in dfs)
                out.append(dict(kind=kind, band=band(float(rx)), mid=min(ry, 53.33 - ry) >= 23, d1=d1, target=(kind == 'rel' and i == tgt), comp=comp))
    return out, plays, games


nfl = rows(sys.argv[1])
thr = {}
for k in ('rel', 'fix'):
    for _, _, b in BANDS:
        v = [r['d1'] for r in nfl[0] if r['kind'] == k and r['band'] == b]
        if len(v) >= 30: thr[(k, b)] = float(np.percentile(v, 90))
print('| sample | Cover 2 plays | band | moment | between-hash receiver-moments | wide-open share | throws there per team-game | completion |')
print('|---|---|---|---|---|---|---|---|')
samples = [('NFL', nfl)] + [(sys.argv[i], rows(sys.argv[i + 1])) for i in range(2, len(sys.argv), 2)]
for lab, (R, n, g) in samples:
    tg = 2 * len(g)
    for b in ('10-15', '15-20'):
        for k in ('rel', 'fix'):
            S = [r for r in R if r['mid'] and r['band'] == b and r['kind'] == k]
            if not S or (k, b) not in thr: continue
            T = [r for r in S if r['target']]
            tail = f"{len(T) / tg:.2f} | {np.mean([r['comp'] for r in T]) if T else float('nan'):.2f} (n {len(T)}) |" if k == 'rel' else '- | - |'
            print(f"| {lab} | {n} | {b} | {'release' if k == 'rel' else 'fixed'} | {len(S)} | {np.mean([r['d1'] > thr[(k, b)] for r in S]):.3f} | " + tail)
