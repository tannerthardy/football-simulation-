"""Plays where the carrier never crosses the LOS (by 4 s or play end), NFL vs sim, by concept; for those, the first
defender within 1.0 yd of the carrier after the handoff (group) and when, the carrier's depth (x) then, and whether
that defender was ever within 1.2 yd of an OL/TE before (blocked) or came free. usage: tfl.py rfr.py nfl.jsonl.gz traces..."""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 12 or con not in rfr.CONCEPTS: continue
    key = (con, p['src']); o[key + ('n',)].append(1)
    cross = next((f for f in range(n) if xy[f][c][0] > 0), None)
    o[key + ('nocross',)].append(cross is None)
    if cross is not None: continue
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    blk = [j for j, q in enumerate(pl) if q['side'] == 'O' and q['group'] in ('OL', 'TE')]
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit: o[key + ('who',)].append('none'); continue
    f, j = hit
    o[key + ('who',)].append(pl[j]['group']); o[key + ('t',)].append(f * .1); o[key + ('x',)].append(xy[f][c][0])
    o[key + ('blocked',)].append(any(math.dist(xy[g][j], xy[g][b]) < 1.2 for g in range(f) for b in blk))
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for con in sorted({k[0] for k in o}):
    for src in ('nfl', 'sim'):
        k = (con, src)
        if not o[k + ('n',)]: continue
        w = collections.Counter(o[k + ('who',)]); tot = sum(w.values()) or 1
        print(f"{con:13s} {src}: n {len(o[k+('n',)]):4d} | never crosses {mean(o[k+('nocross',)])} | first defender at the carrier: " + ' '.join(f"{g} {v/tot:.2f}" for g, v in w.most_common(4)) + f" | at {med(o[k+('t',)])} s, carrier x {med(o[k+('x',)])} | that defender had been blocked {mean(o[k+('blocked',)])}")
