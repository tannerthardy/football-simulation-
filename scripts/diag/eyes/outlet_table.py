"""Table for scripts/diag/eyes/outlet-probe.ts rows.
   python3 -I scripts/diag/eyes/outlet_table.py off=rows-off.jsonl on=rows-on.jsonl"""
import json, sys
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    name, path = arg.split('=', 1); R = [json.loads(l) for l in open(path) if l.startswith('{')]; n = len(R)
    T = [r for r in R if r['thrown'] and not r['thrown']['away'] and r['thrown']['slot']]
    C = [r for r in T if r['thrown']['check']]; pc = lambda a, b: f"{100 * a / max(1, b):.1f}%"
    M = [m for r in R for m in r['men']]; rel = [m for m in M if m['rel'] is not None]
    print(f"== {name}: dropbacks {n}; targeted throws {len(T)}; complete {pc(sum(r['cmp'] for r in T), len(T))}; int {pc(sum(r['int'] for r in R), n)}; sacked {pc(sum(r['sacked'] for r in R), n)}; scramble {pc(sum(r['scramble'] for r in R), n)}; thrown away {pc(sum(bool(r['thrown'] and r['thrown']['away']) for r in R), n)}; time to throw p25/50/75 {q([r['thrown']['t'] for r in T], .25):.2f}/{q([r['thrown']['t'] for r in T]):.2f}/{q([r['thrown']['t'] for r in T], .75):.2f}")
    print(f"   check-release men {len(M)}, released with the ball held {len(rel)}, of those seen on the route {sum(m['seen'] is not None for m in rel)}")
    print(f"   thrown to a check-release man: {len(C)} = {pc(len(C), len(T))} of targets; complete {pc(sum(r['cmp'] for r in C), len(C))}; yards p50 {q([r['yards'] for r in C if r['cmp']])}; released at p50 {q([r['thrown']['t'] for r in C]):.2f} s, {q([r['thrown']['t'] - r['thrown']['rel'] for r in C if r['thrown']['rel'] is not None]):.2f} s after he left")
    print(f"   of those: windup began before he had seen him out {sum(1 for r in C if r['thrown']['seen'] is None or (r['thrown']['windAt'] or 0) < r['thrown']['seen'])}; windup began with him not truly on a route {sum(1 for r in C if r['thrown']['onRoute'] is False)}")
    by = {}
    for r in T: by[r['thrown']['pos']] = by.get(r['thrown']['pos'], 0) + 1
    print('   target share: ' + ' '.join(f"{k} {pc(v, len(T))}" for k, v in sorted(by.items())))
