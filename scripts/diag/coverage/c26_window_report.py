"""Cover 2 / Cover 6 wide-open receivers at 10-15 yd (c26-window.mts output): route and alignment, the window, the seat that
nominally owns it, where he is against his landmark, and his technique.  python3 scripts/diag/coverage/c26_window_report.py"""
import json, collections as C, statistics as st
HASH = 70.75 / 3
rows = [json.loads(l) for l in open('out/diag/coverage/c26-all.jsonl')]
fam = lambda r: 'Cover-6' if r['fam'] == 'cover6' else 'Cover-2'
def p50(v): return f'{st.median(v):.1f}' if v else '-'
def role(s):
    z = s.get('zone') or ''
    if z.startswith('deep_half') or z.startswith('quarter'): return 'half/quarter'
    if z == 'tampa_mid': return 'tampa'
    if z.startswith('flat') or z.startswith('curl_flat'): return 'corner/flat'
    if z.startswith('hook') or z.startswith('curl') or z in ('hole', 'robber'): return 'hook'
    if z.startswith('deep'): return 'deep'
    return None
print('rates (wide-open share of 10-15 yd receiver-moments):')
for g in ('Cover-2', 'Cover-6'):
    for k in ('fix', 'rel'):
        v = [r for r in rows if fam(r) == g and r['kind'] == k]
        print(f'  {g} {k}: {sum(r["wide"] for r in v)}/{len(v)} = {sum(r["wide"] for r in v)/max(1,len(v)):.3f}')
for g in ('Cover-2', 'Cover-6'):
    W = [r for r in rows if fam(r) == g and r['wide']]
    N = [r for r in rows if fam(r) == g and not r['wide']]
    print(f'\n## {g}: wide {len(W)} (not wide {len(N)})')
    print('calls', C.Counter(r['cov'] for r in W).most_common())
    print('ref', C.Counter(r['ref'] for r in W).most_common(), '| routes', C.Counter(r['route'] for r in W).most_common(8))
    al = lambda r: 'outside numbers' if r['w'] < 9 else 'numbers-hash' if r['w'] < HASH else 'between hashes'
    print('alignment', C.Counter(al(r) for r in W).most_common(), '| not-wide', C.Counter(al(r) for r in N).most_common())
    def window(r):
        S = [s for s in r['seats'] if s['same'] and role(s)]
        cf = [s for s in S if role(s) == 'corner/flat']
        if cf and r['w'] < min(s['w'] for s in cf) - 1: return 'outside the corner'
        return 'inside the corner (hook-half window)'
    print('window', C.Counter(window(r) for r in W).most_common())
    for rl in ('corner/flat', 'hook', 'tampa', 'half/quarter'):
        for lab, V in (('WIDE', W), ('not wide', N)):
            S = []
            for r in V:
                cand = [s for s in r['seats'] if role(s) == rl and (s['same'] or rl == 'tampa')]
                if rl == 'half/quarter': cand = [s for s in r['seats'] if role(s) == rl and s['same']]
                if cand: S.append((r, min(cand, key=lambda s: s['dy'])))
            if not S: continue
            print(f'  {rl:12} {lab:8} n {len(S):3} | depth p50 {p50([s["x"] for _, s in S])} (landmark {p50([s.get("lmDepth", 0) for _, s in S])}) | width from sideline {p50([s["w"] for _, s in S])} (landmark {p50([s.get("lmW", 0) for _, s in S])})'
                  f' | depth vs receiver {p50([s["dx"] for _, s in S])} | lateral from receiver {p50([s["dy"] for _, s in S])}'
                  f' | tech {C.Counter((s.get("job","").split(":")[0] + "/" + (s.get("tech") or "")) for _, s in S).most_common(4)}')
    # nearest defender role
    print('  nearest defender role (wide):', C.Counter(role(next(s for s in r['seats'] if s['s'] == r['near'])) or next(s for s in r['seats'] if s['s'] == r['near'])['kind'] for r in W).most_common())
