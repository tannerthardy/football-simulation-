"""Summarise wide-census.mts output (out/diag/coverage/wide-census-r{0,1,2}.jsonl) per rung: wide-open receivers
beyond the line (and all), attributed per path; 'owned' split by the owner's distance at the throw (<= 6 yd: owned but
beaten / cushion; > 6 yd: a nominal owner relating from too far to matter) and by how he relates.
  python3 scripts/diag/coverage/wide_census_report.py [rungs...]"""
import json, sys, collections as C
PATHS = ['owned<=6', 'owned>6', 'P1', 'P1n', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11']
for rung in (sys.argv[1:] or ['0', '1', '2']):
    plays = [json.loads(l) for l in open(f'out/diag/coverage/wide-census-r{rung}.jsonl')]
    sets = [p for p in plays if p['qbSpeed'] < 2]
    rows = []
    for p in plays:
        for r in p['rows']:
            if not r['open']: continue
            r = dict(r, call=p['call'], fam=p['fam'], yards=(p['yards'] if r['thrown'] else 0) or 0)
            if r['path'] == 'owned': r['path'] = 'owned<=6' if r['ownerDist'] <= 6 else 'owned>6'
            rows.append(r)
    allY = sum(p['yards'] or 0 for p in plays)
    for label, v in (('beyond the line', [r for r in rows if r['depth'] >= 0]), ('all, incl. behind the line', rows)):
        th = [r for r in v if r['thrown']]; Y = sum(r['yards'] for r in th) or 1
        print(f"\nRUNG {rung} ({label}): {len(plays)} dropback throws, {len(sets)} with the QB set; wide-open {len(v)} = {len(v)/len(sets):.2f} per set throw;"
              f" thrown to {len(th)} ({100*len(th)/len(plays):.0f}% of throws), {sum(r['yards'] for r in th):.0f} of {allY:.0f} pass yards")
        print('| path | wide-open | share | thrown | yards | share of wide-open yards | how (owned) |\n|---|---|---|---|---|---|---|')
        for k in PATHS:
            w = [r for r in v if r['path'] == k]
            if not w: continue
            t = [r for r in w if r['thrown']]; y = sum(r['yards'] for r in t)
            how = ', '.join(f'{h} {n}' for h, n in C.Counter(r.get('sub') for r in w).most_common()) if k.startswith('owned') else ''
            print(f"| {k} | {len(w)} | {100*len(w)/len(v):.0f}% | {len(t)} | {y:.0f} | {100*y/Y:.0f}% | {how} |")
    fam = C.defaultdict(lambda: [0, 0])
    for p in sets: fam[p['fam']][0] += 1
    for r in rows:
        if r['depth'] >= 0: fam[r['fam']][1] += 1
    print('per family (beyond the line): ' + '; '.join(f"{f} {o}/{n} = {o/max(1,n):.2f}" for f, (n, o) in sorted(fam.items(), key=lambda x: -x[1][0])))
