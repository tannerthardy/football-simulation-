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
        print('==', r['key'], 'D1', r['d1'], '%.1f yd' % r['d1dist'], r['d1pos'], 'out' if r['d1out'] else 'in', 'cs %.1f max %.1f' % (r['cs'], r['cmax']), '|', r['outcome'], '|', r['cls'], '| contact', r['contact_t'], 'beat', r['beat_t'], 'yac', r['yac'], '| tags', [e for e in (r['ev'] or []) if e[1] == 'missed_tag'])
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
    T = [r for r in R if r['tackle_from']]
    if T:
        c1 = collections.Counter(r['tackle_from']['at_catch'] for r in T); c2 = collections.Counter(r['tackle_from']['at_contact'] for r in T)
        print(f'first man stops him (n {len(T)}): from ' + ', '.join(f'{k} {pct(v, len(T))}' for k, v in c1.most_common()) + ' at the catch; contact from ' + ', '.join(f'{k} {pct(v, len(T))}' for k, v in c2.most_common()))
    A = [r['after'] for r in R if r['after']]
    if A:
        ends = collections.Counter(a['end'] for a in A)
        print(f"after a beat (n {len(A)}): others within 3/5/8 yd {sum(a['n3'] for a in A) / len(A):.2f}/{sum(a['n5'] for a in A) / len(A):.2f}/{sum(a['n8'] for a in A) / len(A):.2f}, ahead within 8 {sum(a['ahead8'] for a in A) / len(A):.2f}; nobody within 5 {pct(sum(a['n5'] == 0 for a in A), len(A))}; yards after the beat p50 {q([a['yds_after'] for a in A], .5):.1f} p75 {q([a['yds_after'] for a in A], .75):.1f}; ends " + ', '.join(f'{k} {pct(v, len(A))}' for k, v in ends.most_common()))
sets = [('outside catches (within 12 yd of the sideline)', [r for r in D if r['outside']]), ('all completions', D)]
for name, R in sets:
    print(f'\n## {name}')
    block('all', R)
    for lab, f in (('slow catch (< 3 yd/s)', lambda r: r['cs'] < 3), ('catch 3-6 yd/s', lambda r: 3 <= r['cs'] < 6), ('catch 6+ yd/s', lambda r: r['cs'] >= 6),
                   ('zone', lambda r: not r['man']), ('man', lambda r: r['man']), ('within 6 yd of the sideline', lambda r: r['side'] < 6), ('6-12 yd from the sideline', lambda r: 6 <= r['side'] <= 12)):
        block(lab, [r for r in R if f(r)])
