"""QB lane: table for corner-price.ts rows. By the over-the-top man's `need` (speed he needs to reach the aim, yd/s):
receivers 8+ yd downfield at a throw, his price P (median, and share at or over 0.5), its parts (medians), pick risk,
share targeted, and completion on the targeted ones.  usage: python3 -I corner_price_table.py name=rows.jsonl,... """
import sys, json
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = [json.loads(l) for p in paths.split(',') for l in open(p) if l.startswith('{') and l.rstrip().endswith('}')]
    print(f"== {name}: {len(R)} receivers 8+ yd downfield at a throw, {sum(r['tg'] for r in R)} targeted")
    for lo, hi in ((0, 4), (4, 6), (6, 8), (8, 10), (10, 999)):
        B = [r for r in R if lo <= r['need'] < hi]; T = [r for r in B if r['tg']]
        if not B: continue
        m = lambda k: q([r[k] for r in B if r[k] is not None])
        print(f"   need {lo}-{hi if hi < 999 else '+'}: n {len(B):4d} | P p50 {m('P'):.2f}, >=0.5 on {100 * sum(r['P'] >= .5 for r in B) / len(B):3.0f}% | pOpen {m('pOpen'):.2f} pClear {m('pClear'):.2f} pAcc {m('pAcc'):.2f} | pick {m('int'):.2f} | flight {m('T'):.2f} s depth {m('depth'):.0f} | targeted {100 * len(T) / len(B):4.1f}% | complete {sum(bool(r['cmp']) for r in T)}/{len(T)}, their P p50 {q([r['P'] for r in T]):.2f}")
