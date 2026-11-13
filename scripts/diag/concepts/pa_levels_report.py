"""One table for both sides (rushers excluded from the levels: anyone within 1 yd of the line before the throw) of pa-levels: NFL (pa_levels_nfl.py's saved json) and the sim (pa-levels.ts jsonl).
By play action and alignment: yards a play, completion, air yards p50 and its <5 / 5-15 / 15+ split on attempts,
YAC on completions, time to throw; then LBs and safeties: share who came 0.3+ yd downhill, their bite p50, when
they turned back p50, and depth change from the snap at 1.0 / 2.0 s and at the throw (p50; negative = closer to
the line).   python3 -I scripts/diag/concepts/pa_levels_report.py nfl <json> | sim <jsonl...>
"""
import json, sys, statistics as st
side = sys.argv[1]
if side == 'nfl':
    R = json.load(open(sys.argv[2]))
    fx = lambda L: [{**x, 'at': {float(k): v for k, v in x['at'].items()}} for x in L]
    rows = [{'pa': r['pa'], 'gun': r['gun'], 'yds': r['yds'], 'att': r['res'] in ('C', 'I', 'IN'), 'cmp': r['res'] == 'C', 'air': r['air'], 'ttt': r['ttt'], 'lbs': fx(r['lbs']), 'saf': fx(r['saf'])} for r in R]
else:
    rows = []
    for p in sys.argv[2:]:
        for l in open(p):
            r = json.loads(l)
            rows.append({'pa': r['pa'], 'gun': r['qb'] == 'gun', 'yds': r['yards'], 'att': r['att'], 'cmp': r['cmp'], 'air': r['air'], 'ttt': r['throwT'],
                         'lbs': [{**x, 'at': {float(k): v for k, v in x['at'].items()}} for x in r['lbs']], 'saf': [{**x, 'at': {float(k): v for k, v in x['at'].items()}} for x in r['saf']]})
med = lambda xs: round(st.median(xs), 2) if xs else None
print('| group | n | yd/play | cmp | air p50 | air <5 / 5-15 / 15+ | YAC (cmp) | TTT p50 |')
print('|---|---|---|---|---|---|---|---|')
for gun in (True, False):
    for pa in (False, True):
        G = [r for r in rows if r['gun'] == gun and r['pa'] == pa]
        if not G: continue
        A = [r for r in G if r['att'] and r['air'] is not None]; C = [r for r in A if r['cmp']]
        air = [r['air'] for r in A]
        print(f"| {'gun' if gun else 'under'} {'PA' if pa else 'no PA'} | {len(G)} | {sum(r['yds'] for r in G)/len(G):.2f} | {len(C)/max(len(A),1):.2f} | {med(air)} |"
              f" {100*sum(a<5 for a in air)/max(len(air),1):.0f} / {100*sum(5<=a<15 for a in air)/max(len(air),1):.0f} / {100*sum(a>=15 for a in air)/max(len(air),1):.0f}% |"
              f" {sum(r['yds']-r['air'] for r in C)/max(len(C),1):.1f} | {med([r['ttt'] for r in G if r['ttt']])} |")
for grp in ('lbs', 'saf'):
    print(f"\n{grp}: | group | defenders | came downhill 0.3+ | bite p50 (of those) | turned back p50 | depth chg 1.0 / 2.0 s / at throw p50 |")
    for gun in (True, False):
        for pa in (False, True):
            # Rushers (a defender who came within 1 yd of the line before the throw) are pressure, not a bite.
            D = [x for r in rows if r['gun'] == gun and r['pa'] == pa for x in r[grp] if x['snap'] - x['bite'] >= 1.0]
            if not D: continue
            B = [x for x in D if x['bite'] >= 0.3]
            chg = lambda t: med([x['at'][t] - x['snap'] for x in D if t in x['at']])
            print(f"| {'gun' if gun else 'under'} {'PA' if pa else 'no PA'} | {len(D)} | {100*len(B)/len(D):.0f}% | {med([x['bite'] for x in B])} | {med([x['turn'] for x in B if x['turn'] is not None])} s |"
                  f" {chg(1.0)} / {chg(2.0)} / {med([x['throwD'] - x['snap'] for x in D if x['throwD'] is not None])} |")
