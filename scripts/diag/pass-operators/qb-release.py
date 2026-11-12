"""usage: python3 -I scripts/diag/pass-operators/qb-release.py [--plays BDB plays.csv] [--dump rows.jsonl] <plays.jsonl.gz> [...]
How long a throw takes, by what it asks (Integration for Tanner, 2026-11-11: the windup should depend on the throw). Same
code on NFL tracking and sim plays. Tracking has no arm, so the proxy is: release time = from his last SETTLED frame
(speed < 1 yd/s) before the pass to pass_forward. Per throw: air distance (from his release spot to the target where
the pass arrives), the angle between his shoulders (orientation 'o', where the record has it) and the target at the
settled frame, and whether he was moving at release (>= 2 yd/s). Pocket dropbacks with --plays (designed movement
dropped)."""
import sys, os, json, csv, math, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'defense-yards'))
_a = sys.argv; sys.argv = sys.argv[:1]
from yards import plays
sys.argv = _a
DESIGNED = set(); args = sys.argv[1:]; DUMP = None
while args and args[0].startswith('--'):
    if args[0] == '--plays':
        for row in csv.DictReader(open(args[1])):
            if row['dropbackType'].startswith('DESIGNED_ROLLOUT') or row['playAction'] == 'TRUE': DESIGNED.add(f"{row['gameId']}-{row['playId']}")
    elif args[0] == '--dump': DUMP = open(args[1], 'w')
    args = args[2:]
for path in args:
    R = []
    for kind, p, c, k0, last in plays(path):
        if kind != 'pass' or p.raw['id'] in DESIGNED: continue
        ev = p.raw.get('events', {}); fw, arr = ev.get('pass_forward'), ev.get('pass_arrived')
        tgt = p.raw.get('target')
        if fw is None or arr is None or tgt is None: continue
        qbs = [i for i, pl in enumerate(p.players) if pl.get('group') == 'QB']
        if not qbs: continue
        q = qbs[0]; kr = min(p.frames - 1, p.k(fw)); ka = min(p.frames - 1, p.k(arr))
        ks = next((k for k in range(kr, 0, -1) if p.pos(q, k)[0] is not None and p.speed(q, k) < 1.0), None)
        if ks is None: continue
        qr, ta = p.pos(q, kr), p.pos(tgt, ka)
        if None in (qr[0], ta[0]): continue
        air = math.hypot(ta[0] - qr[0], ta[1] - qr[1])
        O = p.raw.get('o'); ang = None
        if O and ks < len(O) and O[ks] and q < len(O[ks]) and O[ks][q] is not None:
            ts = p.pos(tgt, ks)
            if ts[0] is not None:
                b = math.degrees(math.atan2(ts[1] - p.pos(q, ks)[1], ts[0] - p.pos(q, ks)[0]))
                ang = abs((O[ks][q] - b + 180) % 360 - 180)
        # The turn into the throw: going back from release, the frames his shoulders were closing on the target
        # (the angle to it falling >= 5 deg a frame); its duration and the angle turned.
        turn = None; tang = None
        def a_at(k):
            if not O or k >= len(O) or not O[k] or q >= len(O[k]) or O[k][q] is None: return None
            tk, qk = p.pos(tgt, k), p.pos(q, k)
            if None in (tk[0], qk[0]): return None
            b = math.degrees(math.atan2(tk[1] - qk[1], tk[0] - qk[0])); return abs((O[k][q] - b + 180) % 360 - 180)
        ar = a_at(kr)
        if ar is not None:
            k = kr
            while k - 1 >= 0 and a_at(k - 1) is not None and a_at(k - 1) - a_at(k) >= 5: k -= 1
            turn = (kr - k) * p.dt; tang = a_at(k) - ar
        row = {'id': p.raw['id'], 'rel': (kr - ks) * p.dt, 'air': air, 'ang': ang, 'moving': p.speed(q, kr) >= 2.0, 'turn': turn, 'tang': tang, 'comp': 'catch' in ev, 'yards': p.raw['yards']}
        R.append(row)
        if DUMP: DUMP.write(json.dumps(row) + '\n')
    print(f"== {os.path.basename(path)}: throws {len(R)}")
    q3 = lambda v: f"{st.quantiles(v, n=4)[0]:.2f}/{st.median(v):.2f}/{st.quantiles(v, n=4)[2]:.2f}" if len(v) > 3 else 'n/a'
    for lab, s in (('set', [r for r in R if not r['moving']]), ('moving', [r for r in R if r['moving']])):
        print(f"  {lab} (n {len(s)}): release time p25/p50/p75 by air distance")
        for lo, hi in ((0, 10), (10, 20), (20, 30), (30, 80)):
            t = [r['rel'] for r in s if lo <= r['air'] < hi]
            if t: print(f"    {lo:2d}-{hi:<2d} yd  n {len(t):5d}  {q3(t)} s")
        T = [r for r in s if r['turn'] is not None]
        if T:
            print("    turn into the throw (shoulders closing on the target before release): duration p25/p50/p75 by air distance | by angle turned")
            for lo, hi in ((0, 10), (10, 20), (20, 30), (30, 80)):
                t = [r['turn'] for r in T if lo <= r['air'] < hi]
                if t: print(f"      {lo:2d}-{hi:<2d} yd  n {len(t):5d}  {q3(t)} s | angle turned p50 {st.median([r['tang'] for r in T if lo <= r['air'] < hi]):.0f} deg")
            for lo, hi in ((0, 15), (15, 45), (45, 90), (90, 180)):
                g = [r for r in T if lo <= r['tang'] < hi]
                if g: print(f"      turned {lo:3d}-{hi:<3d} deg n {len(g):5d}  {q3([r['turn'] for r in g])} s | complete {100*sum(r['comp'] for r in g)/len(g):.0f}% yd/att {st.mean(r['yards'] for r in g):.1f}")
        A = [r for r in s if r['ang'] is not None]
        if A:
            print("    by shoulder angle to the target at the settled frame:")
            for lo, hi in ((0, 30), (30, 60), (60, 90), (90, 180)):
                t = [r['rel'] for r in A if lo <= r['ang'] < hi]
                if t: print(f"      {lo:3d}-{hi:<3d} deg n {len(t):5d}  {q3(t)} s")
