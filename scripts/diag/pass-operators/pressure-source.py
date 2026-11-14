"""Where pressure comes from (Integration, 2026-11-12: with TACKLE_SET + EDGE_ARC + OPEN_HANDS pressure is 38-47%
against the NFL's 33%, while edge rushers who get past do not close more). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/pressure-source.py <plays.jsonl.gz> [...]

Pressure: the first frame, before the ball is out, at which any defender is within 2.0 yd of the QB (as
pressure-time.py). The presser is classed by who he is and where he started:
  - 'edge rusher': the paired edge rusher on either side (pairing as edge-rush.py), with his state against his tackle
    at that moment: past outside / level or in front / inside (edge-rush.py's win states);
  - 'interior DL/LB': another DL or LB who started within 1.6 yd of the line inside the tackles' snap span;
  - 'other': everyone else (DBs, second-level backers, wide men not paired).
Also whether he was free then (no offensive non-QB within 1.0 yd), the time, and whether the dropback ended in a sack
(no pass_forward and the QB behind the line at the end, as pressure-time.py): sacks per pressure by presser class.
Per dropback rates and shares, and the rate of each class's pressure arriving before 2.5 s.
"""
import sys, os, json, gzip, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.1f}%" if b else '-'

for path in sys.argv[1:]:
    n = 0; cnt = C.Counter(); free = C.Counter(); sk = C.Counter(); times = C.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        n += 1; by = raw['ball_y']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        DLB = [d for d in D if p.players[d]['group'] in ('DL', 'LB')]
        edge = {}
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
            if cand: edge[max(cand)[1]] = (side, tk)
        ys = [p.pos(o, 0)[1] for o in OL]
        hit = None
        for k in range(kend + 1):
            if p.pos(qb, k)[0] is None: continue
            for d in D:
                if p.pos(d, k)[0] is not None and p.dist(qb, d, k) <= 2.0: hit = (k, d); break
            if hit: break
        if not hit: continue
        k, d = hit
        if d in edge:
            side, tk = edge[d]; rx, ry = p.pos(d, k); tx, ty = p.pos(tk, k)
            width = side * (ry - by) - side * (ty - by)
            st = 'inside' if width < -0.3 else 'past outside' if rx - tx < -0.3 else 'level/in front'
            cls = f'edge rusher: {st}'
        elif p.players[d]['group'] in ('DL', 'LB') and p.pos(d, 0)[0] <= 1.6 and min(ys) <= p.pos(d, 0)[1] <= max(ys):
            cls = 'interior DL/LB'
        else: cls = 'other'
        cnt[cls] += 1; times[cls].append(k * p.dt)
        O = [o for o in p.who('O') if o != qb and p.pos(o, k)[0] is not None]
        free[cls] += not any(p.dist(o, d, k) <= 1.0 for o in O)
        kfin = min(p.frames - 1, p.k(p.end))
        sk[cls] += fw is None and p.pos(qb, kfin)[0] is not None and p.pos(qb, kfin)[0] <= 0
    tot = sum(cnt.values())
    print(f"== {os.path.basename(path)}: dropbacks {n} | pressured {pct(tot, n)}")
    for cls in ('edge rusher: past outside', 'edge rusher: level/in front', 'edge rusher: inside', 'interior DL/LB', 'other'):
        print(f"   {cls:28s} {pct(cnt[cls], n)} of dropbacks ({pct(cnt[cls], tot)} of pressure) | free then {pct(free[cls], cnt[cls])} | time p50 {q(times[cls]):.2f} s | by 2.5 s {pct(sum(t < 2.5 for t in times[cls]), n)} of dropbacks | sacked per pressure {pct(sk[cls], cnt[cls])}")
    print(f"   all pressure: sacked per pressure {pct(sum(sk.values()), tot)}")
