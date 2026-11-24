"""QB lane 2026-11-24: sack-cause.ts rows, clock on against off on the same seeds. Sack rate; sacks by time from the
snap; by the state he was in (a confidence hold on at the sack, holds earlier, reads exhausted, keyed pair expired,
the quick family, left the pocket behaviour); felt pressure (first u >= 0.5) to the sack.
usage: python3 -I sack_cause_table.py name=a.jsonl,... ..."""
import sys, json


def q(v, p=.5): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')


for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = []
    for p in paths.split(','): R += [json.loads(l) for l in open(p) if l.startswith('{')]
    S = [r for r in R if r['sack']]; n = len(R)
    print(f"== {name}: dropbacks {n}, sacks {len(S)} ({len(S) / n:.2%})")
    for lab, lo, hi in (('< 2.5 s', 0, 2.5), ('2.5-3.5', 2.5, 3.5), ('3.5-4.5', 3.5, 4.5), ('>= 4.5', 4.5, 99)):
        print(f"   sacked {lab:8s}: {sum(lo <= r['tSack'] < hi for r in S) / n:.2%} of dropbacks")
    def share(F): k = [r for r in S if F(r)]; return f"{len(k):3d} ({len(k) / n:.2%} of dropbacks)"
    print(f"   in a confidence hold at the sack: {share(lambda r: r.get('holdNow', 0) > 0)}; holds earlier only: {share(lambda r: r.get('holdNow', 0) <= 0 and r['holdsLeft'] > 0)}")
    print(f"   reads exhausted (readIdx >= reads): {share(lambda r: r.get('readIdx', 0) >= r.get('nReads', 99))}; keyed pair expired: {share(lambda r: r['keyExp'] is not None)}; quick: {share(lambda r: r['quick'])}")
    print(f"   left the pocket behaviour first: {share(lambda r: r['left'] is not None)}; felt pressure (u>=.5) before the sack: {share(lambda r: r['u5'] is not None)}")
    W = [r['tSack'] - r['u5'] for r in S if r['u5'] is not None]
    print(f"   felt to sack p25/50/75: {q(W, .25):.2f}/{q(W):.2f}/{q(W, .75):.2f} s; in the pocket behaviour at the sack, felt > 1 s before: {share(lambda r: r['left'] is None and r['u5'] is not None and r['tSack'] - r['u5'] > 1)}")
    H = [r for r in R if r['holdsLeft'] > 0 or r.get('holdNow', 0) > 0]
    print(f"   dropbacks with any hold: {len(H) / n:.1%}, sacked {sum(r['sack'] for r in H) / max(1, len(H)):.1%} (no hold: {sum(r['sack'] for r in R if r not in H) / max(1, n - len(H)):.1%}); hold time p50 {q([r['holdTime'] + r.get('holdNow', 0) for r in H]):.2f} s")
