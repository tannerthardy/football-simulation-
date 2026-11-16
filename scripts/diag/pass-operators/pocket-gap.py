# The pocket's depth against the drop (Integration, 2026-11-16, POCKET_LEVEL's engaged bit): on dropbacks to the throw,
# shotgun and under center separately (the QB's snap depth > 3 yd = gun), the QB's depth behind the line and the three
# middle OL's depth behind the line (p50 of the three) at 0.5 / 0.8 / 1.0 / 1.3 / 1.5 / 2.0 / 2.5 / 3.0 / 3.5 s, and the gap between
# them (QB minus interior). Same code on NFL tracking and sim exports.
# usage: python3 scripts/diag/pass-operators/pocket-gap.py <plays.jsonl.gz> ...
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = [0.5, 0.8, 1.0, 1.3, 1.5, 2.0, 2.5, 3.0, 3.5]
for path in sys.argv[1:]:
    A = {g: {t: ([], [], []) for t in T} for g in ('gun', 'under')}
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') != 'pass' or not r.get('xy'): continue
        p = Play(r); dt = r['dt']; n = len(r['xy'])
        at = lambda i, t: p.pos(i, min(n - 1, int(round(t / dt))))
        qb = p.who('O', 'QB'); OL = [i for i in p.who('O', 'OL') if at(i, 0)[0] is not None]
        if not qb or len(OL) < 5 or at(qb[0], 0)[0] is None: continue
        end = min((r['events'].get(k) for k in ('pass', 'pass_forward', 'sack') if r['events'].get(k) is not None), default=(n - 1) * dt)
        mid = sorted(OL, key=lambda i: at(i, 0)[1])[1:4]
        g = 'gun' if -at(qb[0], 0)[0] > 3 else 'under'
        for t in T:
            if t > end: continue
            qd = -at(qb[0], t)[0]; ods = [-at(i, t)[0] for i in mid if at(i, t)[0] is not None]
            if qd is None or len(ods) < 3: continue
            od = sorted(ods)[1]
            A[g][t][0].append(qd); A[g][t][1].append(od); A[g][t][2].append(qd - od)
    for g in ('gun', 'under'):
        print(f"{os.path.basename(path)} {g}: " + ' | '.join(f"{t} s QB {q(A[g][t][0]):.2f} OL {q(A[g][t][1]):.2f} gap {q(A[g][t][2]):.2f} (n {len(A[g][t][0])})" for t in T))
