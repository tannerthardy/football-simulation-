import gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family
from lane_position import seg, q, HALF
for path in sys.argv[1:]:
    out = {}
    with gzip.open(path, 'rt') as fh:
        for line in fh:
            p = json.loads(line); ev = p.get('events', {})
            if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev: continue
            if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone': continue
            dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
            fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
            if fr - 6 - HALF < 0 or fa >= n or fa + HALF >= n: continue
            pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
            qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
            if not qbs: continue
            Q, A = pos(fr, qbs[0]), pos(fa, p['target'])
            for i, x in enumerate(pl):
                if x['side'] != 'D' or x['group'] not in ('LB', 'DB'): continue
                D = pos(fr, i)
                if seg(D, Q, A)[0] > 8: continue
                k = 'under' if 0 <= D[0] <= 12 else 'deep' if 12 < D[0] <= 30 else None
                if not k: continue
                for lag in (6, 4, 2, 0, -2):
                    f = fr - lag
                    # Closing velocity toward the true line (the line known only after the throw: a measuring frame, not his cue).
                    c = (seg(pos(f - HALF, i), Q, A)[0] - seg(pos(f + HALF, i), Q, A)[0]) / (2 * HALF * dt)
                    out.setdefault((k, -lag * dt), []).append(c)
    print(path.split('/')[-1])
    for kk in ('under', 'deep'):
        print('  ' + kk + ': closing velocity toward the true line p25/50/75 (share >= 1 yd/s) ' + ' | '.join(f"{t:+.1f}s {q(out[(kk, t)])} ({100*sum(1 for v in out[(kk, t)] if v >= 1)/len(out[(kk, t)]):.0f}%)" for t in sorted({t for (a, t) in out if a == kk})))
