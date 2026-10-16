"""Secondary depth over time on runs, one operator for NFL and sim (common
play format). Per frame time after the snap: the deepest defender's depth
past the line, the second-deepest, and how many defenders are 8+ yd deep;
plus when the runner reaches the line and 5 yd.
usage: timing.py FILE.jsonl.gz [--sim-trace]"""
import gzip, json, sys
med = lambda xs: sorted(xs)[len(xs) // 2] if xs else float('nan')
trace = '--sim-trace' in sys.argv
T = (1.0, 2.0, 2.5, 3.0, 3.5, 4.0)
deep = {t: [] for t in T}; deep2 = {t: [] for t in T}; n8 = {t: [] for t in T}
los_t, five_t = [], []
for line in gzip.open(sys.argv[1], 'rt'):
    if not line.strip(): continue
    r = json.loads(line)
    if trace: r = r.get('common')
    if not r or r.get('kind') != 'run' or r.get('carrier') is None: continue
    xy, c, dt = r['xy'], r['carrier'], r.get('dt', .1)
    D = [i for i, p in enumerate(r['players']) if p['side'] == 'D']
    tl = next((k * dt for k in range(len(xy)) if xy[k][2 * c] is not None and xy[k][2 * c] >= 0 and k * dt > .5), None)
    tf = next((k * dt for k in range(len(xy)) if xy[k][2 * c] is not None and xy[k][2 * c] >= 5), None)
    if tl is not None: los_t.append(tl)
    if tf is not None: five_t.append(tf)
    for t in T:
        k = int(round(t / dt))
        if k >= len(xy): continue
        # Only while the runner is still short of 5 yd, so a finished play does not count.
        if xy[k][2 * c] is None or xy[k][2 * c] >= 5: continue
        xs = sorted((xy[k][2 * d] for d in D if xy[k][2 * d] is not None), reverse=True)
        if len(xs) < 2: continue
        deep[t].append(xs[0]); deep2[t].append(xs[1]); n8[t].append(sum(x >= 8 for x in xs))
print(sys.argv[1])
print(f"  runner crosses line: median {med(los_t):.1f} s; reaches 5 yd: median {med(five_t):.1f} s (n {len(five_t)})")
for t in T:
    if deep[t]: print(f"  t={t:.1f}s (runner short of 5): deepest {med(deep[t]):5.1f}  2nd {med(deep2[t]):5.1f}  defenders 8+ deep {med(n8[t])}   n {len(deep[t])}")
