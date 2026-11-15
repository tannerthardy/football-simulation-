"""Table for scripts/diag/eyes/late-options.ts rows: what was downfield when he threw, by when the windup began.
   python3 -I late_options_table.py name=rows1.jsonl,rows2.jsonl ..."""
import json, sys
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
pc = lambda a, b: f"{100 * a / max(1, b):.0f}%"
for arg in sys.argv[1:]:
    name, paths = arg.split('=', 1); R = [json.loads(l) for p in paths.split(',') for l in open(p) if l.startswith('{')]
    R = [r for r in R if not r.get('away') and any(m['thrown'] for m in r['men'])]
    print(f"== {name}: targeted throws {len(R)}")
    for lo, hi in ((0, 2.0), (2.0, 2.6), (2.6, 3.2), (3.2, 9)):
        S = [r for r in R if lo <= r['t'] < hi]
        if not S: continue
        th = [next(m for m in r['men'] if m['thrown']) for r in S]
        deep = [[m for m in r['men'] if m['depth'] >= 10 and not m['thrown']] for r in S]
        has = [d for d in deep if d]
        best = [max(d, key=lambda m: (m['P'] if m['P'] is not None else -1)) for d in has]
        thr = [r['thr'] for r in S if r['thr'] is not None]
        print(f"   windup at {lo:.1f}-{hi:.1f} s: n {len(S)} | thrown to: depth p25/50/75 {q([m['depth'] for m in th], .25):.0f}/{q([m['depth'] for m in th]):.0f}/{q([m['depth'] for m in th], .75):.0f} yd, 10+ yd {pc(sum(m['depth'] >= 10 for m in th), len(th))}, settled {pc(sum(m['settled'] for m in th), len(th))}, his place in the reads p50 {q([m['i'] for m in th]):.0f}, priced {q([m['P'] for m in th]):.2f} | QB moving 2+ yd/s {pc(sum(r['qbSpeed'] >= 2 for r in S), len(S))}")
        if len(th) and any(m['depth'] < 10 for m in th):
            T = [(r, next(m for m in r['men'] if m['thrown'])) for r in S]; T = [(r, m) for r, m in T if m['depth'] < 10]
            D = [[x for x in r['men'] if x['depth'] >= 10] for r, m in T]
            some = [d for d in D if d]; bb = [max(d, key=lambda x: (x['P'] if x['P'] is not None else -1)) for d in some]
            pr = [b['P'] for b in bb if b['P'] is not None]
            print(f"      when he threw short (n {len(T)}): a man 10+ yd downfield existed {pc(len(some), len(T))} (men downfield p50 {q([len(d) for d in D]):.0f}) | the best of them: priced {q(pr, .25):.2f}/{q(pr):.2f}/{q(pr, .75):.2f}, not priced at all {pc(sum(b['P'] is None for b in bb), len(bb))}, counted ready {pc(sum(b['ready'] for b in bb), len(bb))}, route finished {pc(sum(b['settled'] for b in bb), len(bb))}, still running 3+ yd/s {pc(sum(b['speed'] >= 3 for b in bb), len(bb))}, ahead of the read he was on {pc(sum(b['i'] < r['readIdx'] for (r, m), d, b in zip([t for t, d in zip(T, D) if d], some, bb)), len(bb))} | his bar then {q(thr):.2f}")
            print(f"      of those downfield men, priced at or above his bar: {pc(sum(1 for (r, m), b in zip([t for t, d in zip(T, D) if d], bb) if b['P'] is not None and r['thr'] is not None and b['P'] >= r['thr']), len(bb))}; priced above the man he threw to: {pc(sum(1 for (r, m), b in zip([t for t, d in zip(T, D) if d], bb) if b['P'] is not None and m['P'] is not None and b['P'] > m['P']), len(bb))}")
