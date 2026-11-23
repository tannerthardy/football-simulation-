"""Why the Cover 2 / Cover 6 hard corner trails #1 (c2-corner.mts output). Plays where #1 climbs to 10+ yd before
the release. python3 scripts/diag/coverage/c2_corner_report.py"""
import json, statistics as st, collections as C
import sys
P = [json.loads(l) for l in open(sys.argv[1] if len(sys.argv) > 1 else 'out/diag/coverage/c2-corner-all.jsonl')]
def med(v): return f'{st.median(v):.2f}' if v else '-'
def first(rows, f):
    return next((r for r in rows if f(r)), None)
V = []
for p in P:
    R = p['rows']
    if not R or max(r['ox'] for r in R) < 10: continue
    t10 = first(R, lambda r: r['ox'] >= 10)
    if not t10 or max((r['ov'] for r in R if r['k'] <= t10['k']), default=0) < 4: continue
    V.append((p, R, t10))
print(f'pairs {len(P)}; #1 climbing to 10+ yd before the release: {len(V)}')
groups = C.defaultdict(list)
for p, R, t10 in V:
    g = 'cover6 half side' if p['fam'] == 'cover6' else ('plain Cover 2 flat seat (' + (p['style'] or '?') + ')' if not p['rule'] else p['rule'] + ' (' + p['cov'] + ')' if p['rule'] != 'sink_corner' else 'sink_corner')
    groups['ALL'].append((p, R, t10)); groups[g].append((p, R, t10))
for g, v in sorted(groups.items(), key=lambda x: -len(x[1])):
    s0 = [R[0] for _, R, _ in v]
    lev0 = [r['cin'] - r['oin'] for r in s0]                        # > 0: corner inside #1 (outside leverage would be < 0)
    rel1 = [first(R, lambda r: r['k'] >= 10) for _, R, _ in v]
    outside_rel = sum(1 for r in rel1 if r and r['oin'] < r['cin'] - 0.5)
    mv = [first(R, lambda r: r['cv'] > 2) for _, R, _ in v]
    passed = [first(R, lambda r: r['ox'] > r['cx']) for _, R, _ in v]
    at10 = [t10 for _, _, t10 in v]
    pedal = []
    for _, R, t10 in v:
        w = [r for r in R if 5 <= r['k'] <= t10['k']]
        if w: pedal.append(sum(r['cf'] < -0.5 for r in w) / len(w))
    sp = [(r['cs'], r['os']) for _, R, _ in v for r in R if 15 <= r['k'] <= 25]
    techs = C.Counter()
    for _, R, t10 in v:
        seq = []
        for r in R:
            if r['k'] > t10['k']: break
            lab = (r['job'].split(':')[0] + '/' + r['tech']) if r['job'] else r['tech']
            if not seq or seq[-1] != lab: seq.append(lab)
        techs[' > '.join(seq[:4])] += 1
    run = sum(any(r['run'] for r in R[:25]) for _, R, _ in v)
    print(f"\n{g}: n {len(v)}")
    print(f"  at the snap: depth {med([r['cx'] for r in s0])}, cushion over #1 {med([r['cx'] - r['ox'] for r in s0])}, corner inside #1 by {med(lev0)} (outside leverage in {sum(x < 0 for x in lev0)} of {len(v)})")
    print(f"  #1 released outside him (at 1.0 s): {outside_rel} of {len(v)}")
    print(f"  first downfield move > 2 yd/s at {med([m['k']/10 for m in mv if m])} s (never before #1 reached 10: {sum(1 for m, t in zip(mv, at10) if not m or m['k'] > t['k'])})")
    print(f"  #1 passes his depth at {med([q['k']/10 for q in passed if q])} s; #1 reaches 10 yd at {med([t['k']/10 for t in at10])} s; corner then {med([t['cx'] - t['ox'] for t in at10])} yd vs #1 (neg = under), lateral {med([abs(t['cin'] - t['oin']) for t in at10])}")
    print(f"  share of 0.5 s..#1-at-10 spent facing the QB (pedal, cos < -0.5): {med(pedal)}; corner / #1 speed 1.5-2.5 s: {med([a for a, _ in sp])} / {med([b for _, b in sp])}")
    print(f"  read run in the first 2.5 s: {run} of {len(v)}")
    print('  technique sequences:', techs.most_common(5))
