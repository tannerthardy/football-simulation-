"""usage: python3 -I scripts/diag/pass-operators/qb-spread.py <rows.jsonl from qb-moves.py --dump> <BDB player_play.csv> <players.csv>
QBs differ (Tanner via Integration, 2026-11-11). Per NFL QB (the play's player listed at QB; hadDropback breaks ties) with enough
dropbacks: ends outside the tackle box under a rusher at 1 yd and in a clean pocket, scramble share and yards, and his
top speed seen on these plays (tracking). Between-QB spread (quartiles across QBs) and how much speed explains
(correlation across QBs)."""
import sys, json, csv, statistics as st, collections as C
rows = [json.loads(l) for l in open(sys.argv[1])]
players = list(csv.DictReader(open(sys.argv[3])))
name = {r['nflId']: r['displayName'] for r in players}; isqb = {r['nflId'] for r in players if r['position'] == 'QB'}
# The QB of the play: its player with position QB (hadDropback misses scrambles, which BDB counts as rushes).
qb, multi = {}, C.Counter()
for r in csv.DictReader(open(sys.argv[2])):
    if r['nflId'] in isqb:
        k = f"{r['gameId']}-{r['playId']}"; multi[k] += 1
        if r['hadDropback'] == '1' or k not in qb: qb[k] = r['nflId']
G = C.defaultdict(list)
for r in rows:
    q = qb.get(r['id'])
    if q: G[q].append(r)
def per(v):
    hit = [r for r in v if r['hit']]; clean = [r for r in v if not r['hit']]
    return {'n': len(v), 'nh': len(hit), 'outHit': sum(r['outside'] for r in hit) / len(hit) if hit else None,
            'outClean': sum(r['outside'] for r in clean) / len(clean) if clean else None,
            'scr': sum(r['out'] == 'scramble' for r in v) / len(v), 'scrHit': sum(r['out'] == 'scramble' for r in hit) / len(hit) if hit else None,
            'scrYds': st.mean([r['yards'] for r in v if r['out'] == 'scramble']) if any(r['out'] == 'scramble' for r in v) else None,
            'vmax': (lambda w: st.quantiles(w, n=10)[-1] if len(w) >= 10 else None)([r['vmax'] for r in v if r['out'] == 'throw'])}
Q = {q: per(v) for q, v in G.items() if len(v) >= 100}
print(f"QBs with >= 100 dropbacks: {len(Q)}")
q4 = lambda a: [round(x, 3) for x in st.quantiles(a, n=4)]
for k, lab in (('outHit', 'ends outside, rusher at 1 yd'), ('outClean', 'ends outside, clean'), ('scr', 'scramble share (all)'), ('scrHit', 'scramble share, rusher at 1 yd'), ('scrYds', 'yards a scramble'), ('vmax', 'top speed (p90 of his throw plays)')):
    v = [x[k] for x in Q.values() if x[k] is not None]
    print(f"  {lab:32s} across QBs p25/p50/p75 {q4(v)}  min {min(v):.3f} max {max(v):.3f}")
def corr(a, b):
    ma, mb = st.mean(a), st.mean(b); sa, sb = st.pstdev(a), st.pstdev(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / len(a) / (sa * sb) if sa and sb else float('nan')
for k in ('outHit', 'outClean', 'scr', 'scrHit'):
    pairs = [(x['vmax'], x[k]) for x in Q.values() if x[k] is not None and x['vmax'] is not None]
    r = corr([a for a, _ in pairs], [b for _, b in pairs])
    print(f"  speed vs {k:9s}: r {r:+.2f} (r^2 {r*r:.2f}, n {len(pairs)})")
print("  by speed tercile (QB top speed):")
srt = sorted(Q.values(), key=lambda x: x['vmax'] or 0); t = len(srt) // 3
for lab, grp in (('slow', srt[:t]), ('mid', srt[t:2*t]), ('fast', srt[2*t:])):
    f = lambda k: st.mean([x[k] for x in grp if x[k] is not None])
    print(f"    {lab:5s} n {len(grp):2d} | top speed {f('vmax'):.2f} | outside: rusher {f('outHit'):.2f} clean {f('outClean'):.2f} | scramble {f('scr'):.3f} (rusher {f('scrHit'):.2f})")
top = sorted(Q.items(), key=lambda kv: -(kv[1]['scr']))
print("  most / least scrambling:", ', '.join(f"{name.get(q, q)} {x['scr']:.2f}" for q, x in top[:4]), '|', ', '.join(f"{name.get(q, q)} {x['scr']:.2f}" for q, x in top[-3:]))
