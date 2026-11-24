"""QB lane 2026-11-24: throw-outcome.ts rows, clock on against off on the same seeds. Outcome shares of passes thrown
(throwaways included as attempts); completion and the outcome mix by his read index at the throw and by release minus
break (targeted, route with a found break); throws after a hold released; throws after the keyed pair expired.
usage: python3 -I throw_outcome_table.py name=a.jsonl,... ..."""
import sys, json
OUT = ('complete', 'contested', 'offTarget', 'miss', 'drop', 'throwaway', 'int')


def mix(X):
    n = len(X) or 1
    return ' '.join(f"{o} {sum(r['out'] == o for r in X) / n:5.1%}" for o in OUT)


for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = []
    for p in paths.split(','): R += [json.loads(l) for l in open(p) if l.startswith('{')]
    print(f"== {name}: passes {len(R)}")
    print(f"   all            n {len(R):4d} | {mix(R)}")
    for lab, F in (('read 1', lambda r: r['readIdx'] == 0), ('read 2', lambda r: r['readIdx'] == 1), ('read 3', lambda r: r['readIdx'] == 2),
                   ('read 4+', lambda r: (r['readIdx'] or 0) >= 3 and r['readIdx'] < (r['nReads'] or 99)), ('off his reads', lambda r: r['readIdx'] is None or r['readIdx'] >= (r['nReads'] or 0))):
        X = [r for r in R if F(r)]; print(f"   {lab:14s} n {len(X):4d} ({len(X) / len(R):4.0%}) | {mix(X)}")
    B = [r for r in R if r['relBrk'] is not None and r['out'] != 'throwaway']
    for lab, lo, hi in (('rel-brk < 0', -9, 0), ('0 to 0.3', 0, 0.3), ('0.3 to 0.6', 0.3, 0.6), ('0.6 to 1.0', 0.6, 1.0), ('>= 1.0', 1.0, 99)):
        X = [r for r in B if lo <= r['relBrk'] < hi]; print(f"   {lab:14s} n {len(X):4d} ({len(X) / max(1, len(B)):4.0%} of {len(B)}) | {mix(X)}")
    for lab, F in (('after a hold', lambda r: r['afterHold']), ('keyed pair expired', lambda r: r['keyExp'])):
        X = [r for r in R if F(r)]; print(f"   {lab:18s} n {len(X):4d} | {mix(X)}")
