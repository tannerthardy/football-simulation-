"""Does a rusher who reaches his tackle's hip finish? (Integration, 2026-11-13: PAST_ALONG_PATH's ride and the sack
fall.) Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/hip-finish.py <plays.jsonl.gz> [...]

Pairing as tackle-retreat.py. The first frame (ball in, from 1.0 s) at which the edge rusher is level with or past his
tackle in depth (rusher x - tackle x <= 0) while outside him (width >= 0) and within 1.2 yd: the hip. From there: was
the play a sack (no pass_forward, QB behind the line at the end); did this rusher get within 2 yd of the QB before the
throw (and how soon); did the pair stay within 1.2 yd for the next 0.5 s (ridden); the rusher's depth past the QB 0.5 s
later (+ = he went by him).
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    rows = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        n += 1; by = raw['ball_y']; fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        sacked = fw is None and p.pos(qb, kend)[0] is not None and p.pos(qb, kend)[0] <= 0
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        for side in (-1, 1):
            tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by)); ty0 = p.pos(tk, 0)[1]; cand = []
            for d in DLB:
                x0, y0 = p.pos(d, 0)
                if x0 > 1.6: continue
                w = side * (y0 - ty0)
                if w < 0 or w > 4: continue
                k1 = min(p.k(1.0), p.frames - 1)
                if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
                cand.append((w, d))
            if not cand: continue
            d = max(cand)[1]
            for k in range(p.k(1.0), kend):
                if p.pos(d, k)[0] is None or p.pos(tk, k)[0] is None: break
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                if rx - tx <= 0 and side * (ry - ty) >= 0 and p.dist(d, tk, k) <= 1.2:
                    k5 = min(kend, k + p.k(0.5))
                    ridden = all(p.pos(d, j)[0] is not None and p.pos(tk, j)[0] is not None and p.dist(d, tk, j) <= 1.2 for j in range(k, k5 + 1))
                    hit = next((j for j in range(k, kend + 1) if p.pos(qb, j)[0] is not None and p.pos(d, j)[0] is not None and p.dist(d, qb, j) <= 2.0), None)
                    rows.append({'t': k * p.dt, 'sack': sacked, 'hit': hit is not None, 'dt': (hit - k) * p.dt if hit is not None else None,
                                 'ridden': ridden, 'pastQB': (p.pos(qb, k5)[0] - p.pos(d, k5)[0]) if p.pos(qb, k5)[0] is not None and p.pos(d, k5)[0] is not None else None,
                                 'toQB': p.dist(d, qb, k) if p.pos(qb, k)[0] is not None else None})
                    break
    R = rows
    print(f"== {os.path.basename(path)}: dropbacks {n} | rushers reaching the hip {len(R)} ({100 * len(R) / max(1, n):.1f} per 100 dropbacks), at t p50 {q([r['t'] for r in R]):.2f}, {q([r['toQB'] for r in R if r['toQB'] is not None]):.2f} yd from the QB")
    if R:
        print(f"   then: within 2 yd of the QB {100 * sum(r['hit'] for r in R) / len(R):.0f}% (in p50 {q([r['dt'] for r in R if r['dt'] is not None]):.2f} s) | play a sack {100 * sum(r['sack'] for r in R) / len(R):.1f}%"
              f" | still within 1.2 yd of the tackle 0.5 s later (ridden) {100 * sum(r['ridden'] for r in R) / len(R):.0f}% | his depth past the QB 0.5 s later p50 {q([r['pastQB'] for r in R if r['pastQB'] is not None]):+.2f}")
