"""Urgency raised: BLITZ_SKILL arms max free urgency > 0.25 (0.7x it is his urgency, so > 0.175), else excess > 0.5.
Headline reads for blitz-trap.ts arms. Run: python3 -I blitz_trap_summary.py LABEL=a.jsonl,b.jsonl [LABEL=...]"""
import json, sys
pct = lambda a, b: f'{100*a/b:.1f}%' if b else '-'
print('| arm | plays | quick throws blitz / plain | sacks blitz / plain | false urgency (plain, believed man no rush) | urgency raised plain | INT blitz / plain | comp blitz / plain | blitz: thrown into a refilled seat | blitz yds/play |')
print('|---|---|---|---|---|---|---|---|---|---|')
for a in sys.argv[1:]:
    lab, files = a.split('=', 1)
    R = [json.loads(l) for f in files.split(',') for l in open(f) if l.strip()]
    B = [r for r in R if r['pressure']]; P = [r for r in R if not r['pressure']]
    quick = lambda rs: sum(bool(r['thr']) and not r['thr']['away'] and r['thr']['t'] < 1.8 for r in rs)
    skill = any(r.get('maxFreeU', 0) > 0 for r in R)
    raised = [r for r in P if (r.get('maxFreeU', 0) > 0.25 if skill else r['maxEx'] > 0.5)]
    false = [r for r in raised if r['hot'] and not r['hot']['topRushed05']]
    att = lambda rs: [r for r in rs if r['thr'] and not r['thr']['away']]
    print(f"| {lab} | {len(R)} | {pct(quick(B), len(B))} / {pct(quick(P), len(P))} | {pct(sum(r['sack'] for r in B), len(B))} / {pct(sum(r['sack'] for r in P), len(P))} | "
          f"{pct(len(false), len(P))} | {pct(len(raised), len(P))} | {pct(sum(r['int'] for r in att(B)), len(att(B)))} / {pct(sum(r['int'] for r in att(P)), len(att(P)))} | "
          f"{pct(sum(r['caught'] for r in att(B)), len(att(B)))} / {pct(sum(r['caught'] for r in att(P)), len(att(P)))} | "
          f"{pct(sum(bool(r['hot']) and r['hot']['toTarget'] and bool(r['hot']['topRefilled']) for r in B), len(B))} | "
          f"{sum((r['yards'] or 0) for r in B)/max(1,len(B)):.1f} |")
