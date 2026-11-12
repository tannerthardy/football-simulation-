"""HOT_LOOK read on league games (hot-games.ts rows): per arm, every called pass (sacks, INT, completion, yd/play),
then alarmed plays: alarm → release, throws by target class (the read he was on / elsewhere without a look /
elsewhere after a look / other paths), sacks, throwaways, scrambles, the share left with no hot throw in time, and
picture ages at the alarm; and the free-rusher-at-2-yd population (Flex's operator).
   python3 -I scripts/diag/read-plan/hot_games_report.py out/read-plan/hotg-<arm>.jsonl ...
"""
import json, sys
from statistics import median

def q(xs, p):
    xs = sorted(xs); return round(xs[min(len(xs) - 1, int(p * len(xs)))], 2) if xs else None

def cls(r):
    h = r['hot']
    if not (h and r['att'] and r['target'] == h['ref'] and r['throwAt'] is not None and abs(r['throwAt'] - h['t']) < 1.6): return 'other path'
    return 'on the read' if h['onRead'] else 'elsewhere, after a look' if h.get('looked') else 'elsewhere, no look'

for path in sys.argv[1:]:
    rows = [json.loads(l) for l in open(path)]
    n = len(rows); att = [r for r in rows if r['att']]
    print(f"\n{path}: passes {n}, sacks {sum(r['sack'] for r in rows)} ({sum(r['sack'] for r in rows) / n:.3f}), INT {sum(r['int'] for r in rows)}, "
          f"cmp {sum(r['cmp'] for r in att) / max(1, len(att)):.3f}, yd/play {sum(r['yards'] for r in rows) / n:.2f}")
    al = [r for r in rows if r['alarmAt'] is not None]
    thr = [r for r in al if r['att'] and r['throwAt'] is not None and r['throwAt'] >= r['alarmAt']]
    rel = [r['throwAt'] - r['alarmAt'] for r in thr]
    print(f"  alarmed {len(al)} ({len(al) / n:.2f}): thrown after the alarm {len(thr)}, alarm→release p25/50/75/90 {[q(rel, p) for p in (.25, .5, .75, .9)]}; "
          f"sacked {sum(r['sack'] for r in al)}, throwaway {sum(r['throwaway'] for r in al)}, scramble {sum(r['scramble'] for r in al)}; "
          f"no hot throw in time at some tick {sum(1 for r in al if r['hotNone'])}; looks {sum(1 for r in al if r['hotLooks'])}")
    ages = [x for r in al for x in (r['alarmAges'] or []) if x is not None]
    if ages: print(f"  picture age at the alarm (every read): p25/50/75/90 {[q(ages, p) for p in (.25, .5, .75, .9)]} s")
    print("  | Throw after the alarm | n | alarm→release p50/p75 | cmp | INT | yd/att |")
    print("  |---|---|---|---|---|---|")
    for k in ('on the read', 'elsewhere, no look', 'elsewhere, after a look', 'other path'):
        g = [r for r in thr if cls(r) == k]
        if not g: print(f"  | {k} | 0 | | | | |"); continue
        d = [r['throwAt'] - r['alarmAt'] for r in g]
        print(f"  | {k} | {len(g)} | {q(d, .5)}/{q(d, .75)} | {sum(r['cmp'] for r in g) / len(g):.2f} | {sum(r['int'] for r in g)} | {sum(r['yards'] for r in g) / len(g):.1f} |")
    fr = [r for r in rows if r['press'] and r['press']['free']]
    if fr:
        m = len(fr)
        rel2 = [r['throwAt'] - r['press']['t'] for r in fr if r['att'] and r['throwAt'] is not None and r['throwAt'] >= r['press']['t']]
        print(f"  free rusher at 2 yd {m}: throws {sum(r['att'] and not r['throwaway'] for r in fr) / m:.2f}, sacked {sum(r['sack'] for r in fr) / m:.2f}, "
              f"scrambles {sum(r['scramble'] for r in fr) / m:.2f}, throwaways {sum(r['throwaway'] for r in fr) / m:.2f}; "
              f"release after p50/p75 {q(rel2, .5)}/{q(rel2, .75)} s; cmp {sum(r['cmp'] for r in fr) / max(1, sum(r['att'] for r in fr)):.2f}")
