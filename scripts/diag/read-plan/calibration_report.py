"""The window's calibration by factor: P = pOpen * pClear * pAcc * hands, each set against the failure it predicts,
on throws to the receiver the throw was started to (hot-games.ts rows with throwRec.parts).
- defended: predicted 1 - pOpen * pClear, observed a pass breakup, deflection or interception;
- off target: predicted 1 - pAcc, observed a ball that reached the ground untouched (given not defended);
- dropped: predicted 1 - hands, observed a drop (given reached and not defended).
By urgency band and by aimed depth.
   python3 -I scripts/diag/read-plan/calibration_report.py <rows.jsonl> ...
"""
import json, sys

rows = [json.loads(l) for p in sys.argv[1:] for l in open(p)]
T = [r for r in rows if r['att'] and not r['throwaway'] and r.get('throwRec') and r['throwRec'].get('parts')
     and r['target'] == r['throwRec']['ref'] and r['throwRec'].get('u') is not None]
print(f"throws {len(T)}; outcomes " + ', '.join(f"{k} {sum(r['outcome'] == k for r in T)}" for k in ('catch', 'defended', 'int', 'drop', 'ground')))

def table(title, groups):
    print(f"\n{title}")
    print("| group | n | P | completion | defended pred / obs | off target pred / obs | drop pred / obs |")
    print("|---|---|---|---|---|---|---|")
    for name, g in groups:
        if not g: continue
        n = len(g); pp = lambda f: sum(f(r['throwRec']['parts']) for r in g) / n
        dfd = [r for r in g if r['outcome'] in ('defended', 'int')]; nd = [r for r in g if r['outcome'] not in ('defended', 'int')]
        gr = [r for r in nd if r['outcome'] == 'ground']; reach = [r for r in nd if r['outcome'] != 'ground']
        pacc = sum(r['throwRec']['parts']['pAcc'] for r in nd) / max(1, len(nd))
        hands = sum(r['throwRec']['parts']['hands'] for r in reach) / max(1, len(reach))
        print(f"| {name} | {n} | {sum(r['throwRec']['P'] for r in g) / n:.2f} | {sum(r['cmp'] for r in g) / n:.2f} | "
              f"{1 - pp(lambda p: p['pOpen'] * p['pClear']):.2f} / {len(dfd) / n:.2f} | {1 - pacc:.2f} / {len(gr) / max(1, len(nd)):.2f} | "
              f"{1 - hands:.2f} / {sum(r['outcome'] == 'drop' for r in reach) / max(1, len(reach)):.2f} |")

table('By urgency', [(f'u {lo}-{hi}', [r for r in T if lo <= r['throwRec']['u'] < hi or (hi == 1.01 and r['throwRec']['u'] >= lo)])
                     for lo, hi in ((0, 0.001), (0.001, 0.5), (0.5, 1.01))])
table('By aimed depth (yd past the line)', [(f'{lo}-{hi}', [r for r in T if lo <= r['throwRec']['depth'] < hi]) for lo, hi in ((-10, 5), (5, 10), (10, 20), (20, 30), (30, 80))])
table('All', [('all', T)])
