"""Seats whose landmark is far from their snap alignment (seat-travel.mts output).  python3 scripts/diag/coverage/seat_travel_report.py"""
import json, glob, collections as C, statistics as st
R = [json.loads(l) for f in sorted(glob.glob('out/diag/coverage/st-*.jsonl')) for l in open(f)]
# Only underneath landmarks count as a crossed zone (a deep landmark 10+ yd behind his path is not in his way).
DEEPZ = ('deep', 'quarter', 'tampa_mid')
for r in R: r['crosses'] = [c for c in r['crosses'] if not c.split(':')[1].startswith(DEEPZ)]
plays = len({(r['seed'], r['label'], tuple(r['tags'])) for r in R})
bad = lambda r: (r['lat'] > 8 and not r['deep']) or (bool(r['crosses']) and not r['deep'])
print(f'zone/match seats at the snap: {len(R)}; underneath seats {sum(not r["deep"] for r in R)}; flagged (underneath, lateral > 8 yd or crossing a teammate\'s landmark): {sum(bad(r) for r in R)}')
print(f'  underneath lateral travel p50 {st.median([r["lat"] for r in R if not r["deep"]]):.1f}, p90 {sorted(r["lat"] for r in R if not r["deep"])[int(.9*sum(not r["deep"] for r in R))]:.1f}')
by = C.defaultdict(lambda: [0, 0, 0, []])
for r in R:
    if r['deep']: continue
    k = (r['cov'], r['check'] or '-')
    by[k][0] += 1
    if bad(r): by[k][1] += 1; by[k][3].append(r)
    if r['motion']: by[k][2] += 1
print('\n| call (check) | underneath seats | flagged | share | seats flagged (seat:zone, median lateral, crosses) |\n|---|---|---|---|---|')
for k, (n, b, m, rows) in sorted(by.items(), key=lambda x: -x[1][1]):
    if not b: continue
    lab = lambda r: f"{r['s']}:{r['zone']}"
    seats = C.Counter(lab(r) for r in rows)
    desc = '; '.join(f"{x} x{c} (lat {st.median([r['lat'] for r in rows if lab(r) == x]):.1f}{', crosses ' + rows[[lab(r) for r in rows].index(x)]['crosses'][0] if rows[[lab(r) for r in rows].index(x)]['crosses'] else ''})" for x, c in seats.most_common(3))
    print(f"| {k[0]} ({k[1]}) | {n} | {b} | {b/n:.2f} | {desc} |")
mot = [r for r in R if not r['deep'] and r['motion']]; nom = [r for r in R if not r['deep'] and not r['motion']]
print(f"\nmotion: flagged {sum(bad(r) for r in mot)}/{len(mot)} = {sum(bad(r) for r in mot)/max(1,len(mot)):.3f}; no motion {sum(bad(r) for r in nom)}/{len(nom)} = {sum(bad(r) for r in nom)/max(1,len(nom)):.3f}")
chk = [r for r in R if not r['deep'] and r['check']]; nck = [r for r in R if not r['deep'] and not r['check']]
print(f"checked calls: flagged {sum(bad(r) for r in chk)}/{len(chk)} = {sum(bad(r) for r in chk)/max(1,len(chk)):.3f}; unchecked {sum(bad(r) for r in nck)}/{len(nck)} = {sum(bad(r) for r in nck)/max(1,len(nck)):.3f}")
