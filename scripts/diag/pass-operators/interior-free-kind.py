"""What an interior 'free' pressure is made of (Integration, 2026-11-13). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/interior-free-kind.py <plays.jsonl.gz> [...]

Interior first pressers (pressure-source.py's class: a DL/LB within 1.6 yd of the line at the snap, inside the tackles'
span) who are free at pressure (no offensive non-QB within 1.0 yd). Each is classed:
  - never engaged: no offensive lineman (or back) within 1.2 yd of him from the snap to the pressure (unblocked);
  - stunt/twist: engaged at some point, and his lateral travel from his snap alignment exceeds 2 yd;
  - engaged, then free: engaged, came off his blocker (a win), lateral travel within 2 yd.
Plus the time he was last within 1.2 yd of a blocker before the pressure.
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    n = 0; rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        n += 1
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        ys = [p.pos(o, 0)[1] for o in OL]
        hit = None
        for k in range(kend + 1):
            if p.pos(qb, k)[0] is None: continue
            for d in D:
                if p.pos(d, k)[0] is not None and p.dist(qb, d, k) <= 2.0: hit = (k, d); break
            if hit: break
        if not hit: continue
        k, d = hit
        if not (p.players[d]['group'] in ('DL', 'LB') and p.pos(d, 0)[0] <= 1.6 and min(ys) <= p.pos(d, 0)[1] <= max(ys)): continue
        O = [o for o in p.who('O') if o != qb]
        if any(p.pos(o, k)[0] is not None and p.dist(o, d, k) <= 1.0 for o in O): continue
        blockers = [o for o in O if p.players[o]['group'] in ('OL', 'RB', 'TE', 'FB')]
        last = None
        for j in range(0, k + 1):
            if p.pos(d, j)[0] is None: continue
            if any(p.pos(o, j)[0] is not None and p.dist(o, d, j) <= 1.2 for o in blockers): last = j
        lateral = max(abs(p.pos(d, j)[1] - p.pos(d, 0)[1]) for j in range(0, k + 1) if p.pos(d, j)[0] is not None)
        kind = 'never engaged' if last is None else 'stunt/twist' if lateral > 2 else 'engaged, then free'
        rows.append({'kind': kind, 't': k * p.dt, 'sinceLast': None if last is None else (k - last) * p.dt})
    print(f"== {os.path.basename(path)}: dropbacks {n} | interior free first pressers {len(rows)} ({100 * len(rows) / max(1, n):.1f}% of dropbacks)")
    for kind in ('never engaged', 'stunt/twist', 'engaged, then free'):
        R = [r for r in rows if r['kind'] == kind]
        if not R: continue
        print(f"   {kind:20s} {100 * len(R) / len(rows):4.0f}% ({100 * len(R) / max(1, n):.1f}% of dropbacks) | pressure t p50 {q([r['t'] for r in R]):.2f} s"
              + (f" | last within 1.2 yd of a blocker {q([r['sinceLast'] for r in R if r['sinceLast'] is not None]):.2f} s before" if kind != 'never engaged' else ''))
