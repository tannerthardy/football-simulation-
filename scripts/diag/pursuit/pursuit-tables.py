"""Tables from pursuit-an.py output (NFL or sim). Usage: python3 -I pursuit-tables.py ROWS-an.json [check]
'check' prints 12 plays frame by frame instead (the operator check)."""
import json, sys, collections
D = json.load(open(sys.argv[1]))
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def pct(n, d): return f'{100 * n / d:4.1f}%' if d else '  - '
if len(sys.argv) > 2 and sys.argv[2] == 'check':
    import random; random.seed(7)
    pick = random.sample([r for r in D if r['outcome'].startswith('beaten')], 4) + random.sample([r for r in D if r['outcome'].startswith('missed')], 4) + random.sample([r for r in D if r['outcome'].startswith('stopped')], 4)
    for r in pick:
        print('==', r['key'], 'D1', r['d1'], '%.1f yd' % r['d1dist'], r['d1pos'], 'out' if r['d1out'] else 'in', 'cs %.1f max %.1f' % (r['cs'], r['cmax']), '|', r['outcome'], '|', r['cls'], '| blk', r.get('blk'), '| contact', r['contact_t'], 'beat', r['beat_t'], 'yac', r['yac'], '| tags', [e for e in (r['ev'] or []) if e[1] == 'missed_tag'])
        print('   ', ' '.join('t%.1f b%s i%s m%s d%.1f c%.1f' % (g[0], '%+.0f' % g[1] if g[1] is not None else '-', '%+.0f' % g[2] if g[2] is not None else '-', '%+.0f' % g[3] if g[3] is not None else '-', g[4], g[5]) for g in r['geo'][::2][:8]))
    sys.exit()
def block(name, R):
    n = len(R)
    if not n: return
    print(f'\n### {name} (n {n})')
    print(f"YAC p50 {q([r['yac'] for r in R], .5):.1f} mean {sum(r['yac'] for r in R) / n:.2f} | catch speed p50 {q([r['cs'] for r in R], .5):.1f}, +0.5 s {q([r['cs05'] for r in R], .5):.1f}, +1.0 s {q([r['cs10'] for r in R], .5):.1f}, play max {q([r['cmax'] for r in R], .5):.1f} yd/s")
    print(f"defenders within 3 / 5 / 8 yd at the catch (mean): {sum(r['bands']['3'] if '3' in r['bands'] else r['bands'][3] for r in R) / n:.2f} / {sum(r['bands'].get('5', r['bands'].get(5, 0)) for r in R) / n:.2f} / {sum(r['bands'].get('8', r['bands'].get(8, 0)) for r in R) / n:.2f}; none within 5: {pct(sum(r['bands'].get('5', r['bands'].get(5, 0)) == 0 for r in R), n)}")
    pos = collections.Counter(r['d1pos'] for r in R)
    print(f"nearest defender: dist p50 {q([r['d1dist'] for r in R], .5):.1f}; ahead {pct(pos['ahead'], n)} level {pct(pos['level'], n)} behind {pct(pos['behind'], n)}; outside him {pct(sum(r['d1out'] for r in R), n)}; closing p50 {q([r['d1clos'] for r in R], .5):.1f} yd/s; CV closest approach p50 {q([r['cpa'] for r in R], .5):.1f} yd at {q([r['cpa_t'] for r in R], .5):.2f} s")
    oc = collections.Counter(r['outcome'] for r in R)
    print('first-defender outcome: ' + '; '.join(f'{k} {pct(v, n)}' for k, v in oc.most_common()))
    F = [r for r in R if r['cls']]
    if F:
        cl = collections.Counter(r['cls'] for r in F)
        print(f'failure class (of {len(F)} beaten or missed): ' + '; '.join(f'{k} {pct(v, len(F))}' for k, v in cl.most_common()))
        print(f"  carrier speed catch -> at the beat: p50 {q([r['cs'] for r in F], .5):.1f} -> play max {q([r['cmax'] for r in F], .5):.1f}; D1 start speed (first 0.5 s) p50 {q([r['start'] for r in F], .5):.1f}")
    Fr = [r['front'] for r in R if r.get('front')]
    if Fr:
        oc = collections.Counter(f['outcome'] for f in Fr); Ff = [f for f in Fr if f['cls']]
        print(f'first defender in front (nearest not behind at the catch, n {len(Fr)}, dist p50 {q([f["d1dist"] for f in Fr], .5):.1f}): ' + '; '.join(f'{k} {pct(v, len(Fr))}' for k, v in oc.most_common()))
        if Ff: print(f'  its failure class (of {len(Ff)}): ' + '; '.join(f'{k} {pct(v, len(Ff))}' for k, v in collections.Counter(f['cls'] for f in Ff).most_common()))
    Pr = [r['pair'] for r in R if r.get('pair')]
    if Pr:
        parts = []
        for when in ('catch', 'p05', 'p10', 'contact'):
            X = [p[when] for p in Pr if p.get(when)]
            if X: parts.append(f"{when} n {len(X)}: bracketed {pct(sum(x['bracket'] for x in X), len(X))}, angle between p50 {q([x['sep'] for x in X], .5):.0f} deg (p25 {q([x['sep'] for x in X], .25):.0f} p75 {q([x['sep'] for x in X], .75):.0f}), 2nd man p50 {q([x['d'][1] for x in X], .5):.1f} yd")
        print('two nearest defenders together: ' + ' | '.join(parts))
        Fi = [p['first'] for p in Pr if p.get('first') and p['first']['moving']]
        if Fi: print(f"first defender to contact range (carrier moving > 1 yd/s, n {len(Fi)}): from behind his hips (> 90 deg off his travel) {pct(sum(f['behind_hips'] for f in Fi), len(Fi))}; bearing off his travel p50 {q([f['off'] for f in Fi], .5):.0f} deg; contact at +{q([f['t'] for f in Fi], .5):.1f} s p50")
    T = [r for r in R if r['tackle_from']]
    if T:
        c1 = collections.Counter(r['tackle_from']['at_catch'] for r in T); c2 = collections.Counter(r['tackle_from']['at_contact'] for r in T)
        print(f'first man stops him (n {len(T)}): from ' + ', '.join(f'{k} {pct(v, len(T))}' for k, v in c1.most_common()) + ' at the catch; contact from ' + ', '.join(f'{k} {pct(v, len(T))}' for k, v in c2.most_common()))
    A = [r['after'] for r in R if r['after']]
    if A:
        ends = collections.Counter(a['end'] for a in A)
        N = [a for a in A if a.get('next_t') is not None]; S = [a['second'] for a in A if a.get('second')]
        if S:
            sp = collections.Counter(s['pos'] for s in S)
            print(f"  next defender into contact range after the beat: {pct(len(N), len(A))} of beats; time p50 {q([a['next_t'] for a in N], .5):.1f} s (p75 {q([a['next_t'] for a in N], .75):.1f}); carrier's gain until then p50 {q([a['next_yds'] for a in N], .5):.1f} yd (p75 {q([a['next_yds'] for a in N], .75):.1f})")
            print(f"  second defender at the beat: dist p50 {q([s['d'] for s in S], .5):.1f} yd; " + ', '.join(f'{k} {pct(v, len(S))}' for k, v in sp.most_common()) + f"; closing (> 1 yd/s) {pct(sum(1 for s in S if s['closing'] is not None and s['closing'] > 1), len(S))}, opening (< -1) {pct(sum(1 for s in S if s['closing'] is not None and s['closing'] < -1), len(S))}; his speed p50 {q([s['speed'] for s in S], .5):.1f}; slow (< 2 yd/s) {pct(sum(1 for s in S if s['speed'] < 2), len(S))}")
        print(f"after a beat (n {len(A)}): others within 3/5/8 yd {sum(a['n3'] for a in A) / len(A):.2f}/{sum(a['n5'] for a in A) / len(A):.2f}/{sum(a['n8'] for a in A) / len(A):.2f}, ahead within 8 {sum(a['ahead8'] for a in A) / len(A):.2f}; nobody within 5 {pct(sum(a['n5'] == 0 for a in A), len(A))}; yards after the beat p50 {q([a['yds_after'] for a in A], .5):.1f} p75 {q([a['yds_after'] for a in A], .75):.1f}; ends " + ', '.join(f'{k} {pct(v, len(A))}' for k, v in ends.most_common()))
sets = [('outside catches (within 12 yd of the sideline)', [r for r in D if r['outside']]), ('all completions', D)]
for name, R in sets:
    print(f'\n## {name}')
    block('all', R)
    for lab, f in (('slow catch (< 3 yd/s)', lambda r: r['cs'] < 3), ('catch 3-6 yd/s', lambda r: 3 <= r['cs'] < 6), ('catch 6+ yd/s', lambda r: r['cs'] >= 6),
                   ('zone', lambda r: not r['man']), ('man', lambda r: r['man']), ('within 6 yd of the sideline', lambda r: r['side'] < 6), ('6-12 yd from the sideline', lambda r: 6 <= r['side'] <= 12)):
        block(lab, [r for r in R if f(r)])
