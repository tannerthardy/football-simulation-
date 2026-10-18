"""Runner path timing by concept, one operator for NFL and sim common plays:
handoff, time and lateral position at the line crossing (lateral signed by
his own direction), share not across the line by 2.5/3.0 s, depth and width
at 2.0 s. usage: runner.py FILE.jsonl.gz [--sim-trace] [--concept X]"""
import gzip, json, sys
trace = '--sim-trace' in sys.argv
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
q = lambda xs, f: round(sorted(xs)[int(f * (len(xs) - 1))], 2) if xs else None
cross, width, notyet25, notyet30, n, d2, w2, hand = [], [], 0, 0, 0, [], [], []
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace:
        con = r.get('concept'); r = r.get('common')
        if not r: continue
        r.setdefault('cell', {})['concept'] = con
    if r.get('kind') != 'run' or r.get('carrier') is None: continue
    con = (r.get('cell') or {}).get('concept')
    if want and con != want: continue
    xy, c, dt = r['xy'], r['carrier'], r.get('dt', .1)
    ev = r.get('events') or {}
    h = ev.get('handoff')
    if h is None: continue
    n += 1; hand.append(h)
    k0 = int(round(h / dt)); y0 = xy[0][2 * c + 1]
    k = next((k for k in range(k0, len(xy)) if xy[k][2 * c] is not None and xy[k][2 * c] >= 0), None)
    end = ev.get('end', (len(xy) - 1) * dt)
    if k is not None:
        cross.append(k * dt)
        yk = xy[k][2 * c + 1]; width.append(abs(yk - y0))
    for T, cnt in ((2.5, 'a'), (3.0, 'b')):
        kk = int(round(T / dt))
        if kk < len(xy) and T <= end and xy[kk][2 * c] is not None and xy[kk][2 * c] < 0:
            if cnt == 'a': notyet25 += 1
            else: notyet30 += 1
    kk = int(round(2.0 / dt))
    if kk < len(xy) and xy[kk][2 * c] is not None:
        d2.append(xy[kk][2 * c]); w2.append(abs(xy[kk][2 * c + 1] - y0))
print(f"{sys.argv[1]} {want or 'all'}: n {n} handoff p50 {q(hand,.5)} | cross line p25/p50/p75 {q(cross,.25)}/{q(cross,.5)}/{q(cross,.75)} (crossed {len(cross)}) width at crossing p50/p75 {q(width,.5)}/{q(width,.75)} | behind line at 2.5 s {100*notyet25/n:.0f}% at 3.0 s {100*notyet30/n:.0f}% | at 2.0 s depth p50 {q(d2,.5)} width p50/p75 {q(w2,.5)}/{q(w2,.75)}")
