"""Report for finish-trace.mts. usage: python3 -I scripts/diag/yac/finish-report.py out/diag/yac/ft*.json"""
import json, math, sys
from collections import Counter
R = [r for p in sys.argv[1:] for r in json.load(open(p))]
q = lambda v, f=.5: (sorted(v)[int(f * (len(v) - 1))] if v else float('nan'))
fin = lambda v: [x for x in v if x == x and x is not None]
mean = lambda v: sum(v) / len(v) if v else float('nan')
for grp in ('never', 'fast'):
    G = [r for r in R if r['group'] == grp]
    print(f"== {grp}: {len(G)} defender-plays")
    # approach rows before first contact (dist > 1.0), by distance band
    for lo, hi in ((4, 6), (2.5, 4), (1.0, 2.5)):
        rows = []
        for r in G:
            for x in r['rows']:
                if x['g'] and x['g']['dd'] <= 1.0: break
                if lo <= x['dist'] < hi and not x['g'].get('down'): rows.append(x)
        if not rows: continue
        st = Counter(k for x in rows for k, v in x['stages'].items() if v < x['rawSp'] - 0.3)
        print(f"  {lo}-{hi} yd: n {len(rows)} | aim: planner steer vs true intercept p50 {q(fin([x['steerTrue'] for x in rows])):.0f} deg, final request vs true intercept p50 {q(fin([x['aimTrue'] for x in rows])):.0f} p75 {q(fin([x['aimTrue'] for x in rows]), .75):.0f}, vs carrier now p50 {q(fin([x['aimNow'] for x in rows])):.0f}; picture error p50 {q(fin([x['seenErr'] for x in rows])):.2f} yd")
        print(f"        speed: vmax {mean([x['vmax'] for x in rows]):.2f} decision {mean([x['rawSp'] for x in rows]):.2f} final {mean([x['finSp'] for x in rows]):.2f} achieved {mean([x['sp'] for x in rows]):.2f} carrier {mean([x['csp'] for x in rows]):.2f} | turn (vel vs request) p50 {q(fin([x['turn'] for x in rows])):.0f} deg | "
              f"planner {Counter(x['planner'] for x in rows).most_common(3)} | post-decision cuts >0.3: {dict(st)} | gather mean {mean(fin([x['gather'] for x in rows])):.2f}")
        cs = Counter()
        for x in rows:
            c = x['chs']
            if 'intercept-sprint' in c and 'approach-and-gather' in c and c['approach-and-gather'] < c['intercept-sprint'] - 0.3: cs['approach-and-gather cut'] += 1
            if 'close-gather' in c: cs['close-gather'] += 1
        print(f"        chase sub-stage: {dict(cs)} of {len(rows)}; effort<1 {mean([x['finEff'] < 0.99 for x in rows]):.0%}")
    # closest approach / tackle gates
    gates = Counter(); clo = []
    for r in G:
        rows = [x for x in r['rows'] if x['g']]
        if not rows: continue
        k = min(range(len(rows)), key=lambda i: rows[i]['g']['dd']); g = rows[k]['g']
        evs = [e['type'] for e in r['ev']]
        clo.append((g, evs, rows[k]))
        if g['down']: gates['down at closest'] += 1
        elif g['dd'] <= g['arms']: gates['inside arms'] += 1
        elif g['dd'] <= g['range']: gates['arms..range (lunge needs last-reach)'] += 1
        elif g['dd'] <= g['dive']: gates['range..dive' + (' (dive gates met)' if g['sep'] > 1.6 and g['behind'] else ' (dive gate fails: ' + ('not separating>1.6' if g['sep'] <= 1.6 else '') + (' not behind' if not g['behind'] else '') + ')')] += 1
        else: gates['beyond dive range'] += 1
    print(f"  closest approach: dd p50 {q([g['dd'] for g, _, _ in clo]):.2f} (arms {mean([g['arms'] for g, _, _ in clo]):.2f}, range {mean([g['range'] for g, _, _ in clo]):.2f}, dive {mean([g['dive'] for g, _, _ in clo]):.2f}); closing there {mean([g['closing'] for g, _, _ in clo]):.2f}; behind {mean([g['behind'] for g, _, _ in clo]):.0%}")
    print(f"     gates: {dict(gates)}")
    print(f"     his events in the play: {Counter(e for _, evs, _ in clo for e in set(evs)).most_common()}  plays with none {mean([not evs for _, evs, _ in clo]):.0%}")
