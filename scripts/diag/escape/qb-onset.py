"""QB lane, 2026-11-13: when a set QB starts to move, and what he could see then. Same code, NFL and sim.
Dropbacks (designed boots/rollouts dropped as escape.py does where labelled). SET = first frame from 1.0 s where his
speed has been < 1 yd/s for 0.3 s. ONSET = first later frame before the throw where his speed is >= 2.5 yd/s and stays
so for 0.3 s (frames at onset-0.3 are the 'before' picture). Reports share of set dropbacks with an onset, hold time,
direction, nearest rusher (DL/LB) distance and closing speed at onset-0.3 s, vs the same for set QBs who threw without
moving (at throw-0.5 s), and what follows. usage: python3 -I onset.py <plays.jsonl.gz> [--plays-csv plays.csv]"""
import sys, json, gzip, math, csv, re, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def held_end(raw, p, qb, kend):
    """Last frame the QB can still have the ball on a play with no forward pass: the frame before the ball's track
    (sim exports' `bxy`) is first more than 2.5 yd from him (a strip, a fumble, a lateral). Without it a strip-sack's
    return is read as the QB running (he is chasing the returner). NFL files carry no ball track or fumble event."""
    b = raw.get('bxy')
    if not b or raw['events'].get('pass_forward') is not None: return kend
    for k in range(min(kend, len(b) - 1) + 1):
        x, y = p.pos(qb, k); bb = b[k]
        if x is None or not bb or bb[0] is None: continue
        if math.hypot(bb[0] - x, bb[1] - y) > 2.5: return max(0, k - 1)
    return kend

args = sys.argv[1:]; PFF = {}
if '--plays-csv' in args:
    i = args.index('--plays-csv')
    for r in csv.DictReader(open(args[i + 1])): PFF[f"{r['gameId']}-{r['playId']}"] = r
    del args[i:i + 2]
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
for path in args:
    R = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        pf = PFF.get(raw['id'])
        if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
        if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs or p.pos(qbs[0], 0)[0] is None: continue
        qb = qbs[0]; ev = raw['events']; fw = ev.get('pass_forward'); n += 1
        kend = min(p.frames - 1, p.k(fw if fw is not None else p.end)); w = p.k(0.3)
        kend = held_end(raw, p, qb, kend)
        def sp(k):
            a, b = p.pos(qb, k), p.pos(qb, k - 1)
            return None if a[0] is None or b[0] is None else math.hypot(a[0] - b[0], a[1] - b[1]) / p.dt
        ks = None
        for k in range(p.k(1.0), kend + 1):
            if all((sp(j) is not None and sp(j) < 1) for j in range(k - w + 1, k + 1)): ks = k; break
        if ks is None: R.append(dict(set=False)); continue
        ko = None
        for k in range(ks + 1, kend - w + 1):
            if all((sp(j) is not None and sp(j) >= 2.5) for j in range(k, k + w)): ko = k; break
        RU = [d for d in p.who('D') if p.players[d]['group'] in ('DL', 'LB')]
        def rush(k):
            best = (99, 0)
            if k < 2: return best
            qx, qy = p.pos(qb, k)
            for d in RU:
                a, b = p.pos(d, k), p.pos(d, k - 2)
                if a[0] is None or b[0] is None or qx is None: continue
                dist = math.hypot(a[0] - qx, a[1] - qy); d0 = math.hypot(b[0] - qx, b[1] - qy)
                if dist < best[0]: best = (dist, (d0 - dist) / (2 * p.dt))
            return best
        out = 'throw' if fw is not None else ('run' if any(p.pos(qb, k)[0] is not None and p.pos(qb, k)[0] > 0 for k in range(kend + 1)) else 'sack')
        if ko is None:
            kb = max(ks, kend - p.k(0.5)); d, c = rush(kb)
            R.append(dict(set=True, onset=False, out=out, d=d, c=c, hold=(kend - ks) * p.dt, tset=ks * p.dt)); continue
        kb = max(ks, ko - w); d, c = rush(kb)
        a, b = p.pos(qb, min(kend, ko + p.k(0.5))), p.pos(qb, ko)
        dx, dy = a[0] - b[0], a[1] - b[1]
        dirn = 'up' if dx > abs(dy) else 'back' if -dx > abs(dy) else 'lateral'
        R.append(dict(set=True, onset=True, out=out, d=d, c=c, hold=(ko - ks) * p.dt, tset=ks * p.dt, t=ko * p.dt, dirn=dirn,
                      after=(fw - ko * p.dt) if fw is not None else None))
    S = [r for r in R if r['set']]; O = [r for r in S if r['onset']]; N = [r for r in S if not r['onset']]
    pct = lambda a, b: f"{100*a/max(1,b):.0f}%"
    print(f"== {os.path.basename(path)}: dropbacks {n}; QB sets (still 0.3 s) {pct(len(S), n)}, at p50 {q([r['tset'] for r in S]):.1f} s; of set QBs, start moving (>= 2.5 yd/s for 0.3 s) before the ball is out: {pct(len(O), len(S))} (n {len(O)})")
    c = collections.Counter(r['dirn'] for r in O); co = collections.Counter(r['out'] for r in O); cn = collections.Counter(r['out'] for r in N)
    print(f"   movers: onset at p25/50/75 {q([r['t'] for r in O],.25):.1f}/{q([r['t'] for r in O]):.1f}/{q([r['t'] for r in O],.75):.1f} s, after holding {q([r['hold'] for r in O]):.1f} s | direction up {pct(c['up'],len(O))} lateral {pct(c['lateral'],len(O))} back {pct(c['back'],len(O))}"
          f" | then throw {pct(co['throw'],len(O))} run {pct(co['run'],len(O))} sack {pct(co['sack'],len(O))} | onset to throw p50 {q([r['after'] for r in O]):.1f} s")
    print(f"   movers, 0.3 s before onset: nearest rusher p25/50/75 {q([r['d'] for r in O],.25):.1f}/{q([r['d'] for r in O]):.1f}/{q([r['d'] for r in O],.75):.1f} yd, closing p50 {q([r['c'] for r in O]):+.1f} yd/s; within 3 yd {pct(sum(r['d']<=3 for r in O),len(O))}, beyond 5 yd {pct(sum(r['d']>5 for r in O),len(O))}")
    print(f"   stayers (n {len(N)}): throw {pct(cn['throw'],len(N))} sack {pct(cn['sack'],len(N))} | 0.5 s before the end: nearest rusher p25/50/75 {q([r['d'] for r in N],.25):.1f}/{q([r['d'] for r in N]):.1f}/{q([r['d'] for r in N],.75):.1f} yd, closing {q([r['c'] for r in N]):+.1f}; within 3 yd {pct(sum(r['d']<=3 for r in N),len(N))}")
    for lo, hi in ((0, 2), (2, 3), (3, 4), (4, 5), (5, 99)):
        A = [r for r in S if lo <= r['d'] < hi]
        print(f"      nearest rusher {lo}-{hi} yd at the 'before' frame: n {len(A):5d}, moved {pct(sum(r['onset'] for r in A), len(A))}, sacked {pct(sum(r['out']=='sack' for r in A), len(A))}")
    for lo, hi in ((0, 1), (1, 1.5), (1.5, 2.5), (2.5, 99)):
        A = [r for r in S if lo <= r['hold'] < hi or (not r['onset'] and r['hold'] >= lo)]
        B = [r for r in S if r['hold'] >= lo]
        print(f"      still set after {lo} s of holding: n {len(B):5d}; start moving within this band ({lo}-{hi} s): {pct(sum(r['onset'] and lo <= r['hold'] < hi for r in B), len(B))}")
