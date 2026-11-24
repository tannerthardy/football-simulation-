"""QB lane 2026-11-24: dropback-outcome.ts rows, THROWAWAY_FELT off against on on the same seeds. Per dropback: sacks,
scrambles, passes and their results (completion over passes thrown, throwaways counted as attempts), throwaways by the
qb.ts line that called them, time to throw; the clean-pocket holds (the timer out, felt pressure under 0.4, inside the
pocket) and how they ended, with the sack times.
usage: python3 -I dropback_outcome_table.py name=a.jsonl,... ..."""
import sys, json
from collections import Counter


def q(v, p=.5): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')


for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = []
    for p in paths.split(','): R += [json.loads(l) for l in open(p) if l.startswith('{')]
    n = len(R); P = [r for r in R if r['ttt'] is not None]; c = Counter(r['out'] for r in R)
    print(f"== {name}: dropbacks {n}, passes {len(P)}")
    print(f"   sacks {c['sack']} ({c['sack'] / n:.2%}) | scrambles {sum(r['scramble'] for r in R)} ({sum(r['scramble'] for r in R) / n:.2%}) | other {c['other']}")
    print(f"   of passes: complete {c['complete'] / len(P):.1%}, INT {c['int']} ({c['int'] / len(P):.2%}), thrown away {c['throwaway']} ({c['throwaway'] / len(P):.1%}), contested {c['contested'] / len(P):.1%}, off target {c['offTarget'] / len(P):.1%}")
    print(f"   time to throw p25/50/75 {q([r['ttt'] for r in P], .25):.2f}/{q([r['ttt'] for r in P]):.2f}/{q([r['ttt'] for r in P], .75):.2f} s")
    A = [r['away'] for r in R if r['away']]
    print(f"   throwaways by calling line: {Counter(a['line'] for a in A).most_common(8)}; felt < 0.4 at the throwaway: {sum(a['felt'] < 0.4 for a in A)}")
    by = Counter(); [by.update(r['awayBy'] or {}) for r in R]; print(f"   decided throwaways by what he perceived: {dict(by)}")
    C = [r for r in R if r['clean'] is not None]; cc = Counter(r['out'] for r in C)
    print(f"   clean-pocket holds (timer out, felt < 0.4, in the pocket): {len(C)} ({len(C) / n:.1%}) -> {dict(cc)}")
    S = [r for r in C if r['out'] == 'sack']
    if S: print(f"      sacked: {len(S)} ({len(S) / n:.2%} of dropbacks), at p25/50/75 {q([r['tSack'] for r in S], .25):.2f}/{q([r['tSack'] for r in S]):.2f}/{q([r['tSack'] for r in S], .75):.2f} s, {q([r['tSack'] - r['clean'] for r in S]):.2f} s after the timer ran out (p50)")
    T = [r for r in C if r['ttt'] is not None and r['out'] != 'throwaway']
    if T: print(f"      thrown, not away: {len(T)}, complete {sum(r['out'] == 'complete' for r in T) / len(T):.0%}, time to throw p50 {q([r['ttt'] for r in T]):.2f}")
