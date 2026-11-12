"""HOT_PLAN read: hot throws split by target (the read he was on, or the plan's answer, vs anyone else), with the
time from the first alarm to the throw, the angle from his facing and his gaze to the target, completion and INT.
   python3 -I scripts/diag/read-plan/hot_report.py out/read-plan/panel-<arm>.jsonl ...
"""
import json, sys
from statistics import median

def q(xs, p):
    xs = sorted(xs); return xs[min(len(xs) - 1, int(p * len(xs)))] if xs else float('nan')

for path in sys.argv[1:]:
    rows = [json.loads(l) for l in open(path)]
    att = [r for r in rows if r['att']]
    print(f"\n{path}: plays {len(rows)}, att {len(att)}, sacks {sum(r['sack'] for r in rows)}, INT {sum(r['int'] for r in rows)}, "
          f"cmp {sum(r['cmp'] for r in att) / max(1, len(att)):.3f}, yd/play {sum(r['yards'] for r in rows) / len(rows):.2f}, "
          f"alarmed {sum(r['alarmAt'] is not None for r in rows)}")
    # A hot throw: the hot path picked a target and the ball went to it (not pumped elsewhere).
    hot = [r for r in rows if r['hot'] and r['att'] and r['target'] == r['hot']['ref']]
    groups = {'on the read (src best)': [], 'plan answer (src plan)': [], 'elsewhere (src best)': []}
    for r in hot:
        h = r['hot']
        k = 'plan answer (src plan)' if h['src'] == 'plan' else 'on the read (src best)' if h['onRead'] else 'elsewhere (src best)'
        groups[k].append(r)
    print(f"  hot throws {len(hot)}")
    print("  | Target | n | alarm→throw p50/p75 (s) | facing off p50/p75 (°) | gaze off p50/p75 (°) | cmp | INT | yd/att |")
    print("  |---|---|---|---|---|---|---|---|")
    for k, g in groups.items():
        if not g: print(f"  | {k} | 0 | | | | | | |"); continue
        dt = [r['hot']['t'] - r['hot']['alarmAt'] for r in g]
        fo = [r['hot']['facingOff'] for r in g]; go = [r['hot']['gazeOff'] for r in g]
        print(f"  | {k} | {len(g)} | {median(dt):.2f}/{q(dt, .75):.2f} | {median(fo):.0f}/{q(fo, .75):.0f} | {median(go):.0f}/{q(go, .75):.0f} | "
              f"{sum(r['cmp'] for r in g) / len(g):.2f} | {sum(r['int'] for r in g)} | {sum(r['yards'] for r in g) / len(g):.1f} |")
    al = [r for r in rows if r['alarmAt'] is not None]
    if al:
        n = len(al)
        print(f"  alarmed plays {n}: hot throw {len(hot) / n:.2f}, other throw {sum(r['att'] for r in al if r not in hot) / n:.2f}, "
              f"sacked {sum(r['sack'] for r in al) / n:.2f}")
