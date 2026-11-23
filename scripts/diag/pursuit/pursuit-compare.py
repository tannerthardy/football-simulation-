"""Side-by-side key rows from several pursuit-an.py outputs. Usage: python3 -I pursuit-compare.py LABEL=ROWS-an.json ..."""
import json, sys, collections
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
CL = [('reached contact range', 'contact then beaten'), ('engaged by a blocker', 'blocker'), ('old angle', 'old angle'), ('overrun', 'overrun'), ('other / outrun', 'outrun fair'), ('flat-footed', 'flat-footed')]
sets = [(a.split('=')[0], json.load(open(a.split('=')[1]))) for a in sys.argv[1:]]
for scope, keep in (('outside catches', lambda r: r['outside']), ('all completions', lambda r: True)):
    print(f'\n{scope}')
    rows = collections.OrderedDict()
    for lab, D in sets:
        R = [r for r in D if keep(r)]; n = len(R); F = [r for r in R if r['cls']]; Fr = [r['front'] for r in R if r.get('front') and r['front']['cls']]
        A = [r['after'] for r in R if r['after']]
        c = collections.Counter(r['cls'] for r in F); cf = collections.Counter(f['cls'] for f in Fr)
        get = lambda cnt, key, m: 100 * sum(v for k, v in cnt.items() if k.startswith(key)) / max(1, m)
        rows.setdefault('n', []).append(n)
        rows.setdefault('catch speed p50 / +0.5 / +1.0', []).append(f"{q([r['cs'] for r in R], .5):.1f}/{q([r['cs05'] for r in R], .5):.1f}/{q([r['cs10'] for r in R], .5):.1f}")
        rows.setdefault('YAC p50 / mean', []).append(f"{q([r['yac'] for r in R], .5):.1f}/{sum(r['yac'] for r in R) / max(1, n):.2f}")
        rows.setdefault('first defender stops him %', []).append(f"{100 * sum(r['outcome'].startswith('stopped') for r in R) / max(1, n):.1f}")
        rows.setdefault('beaten or missed (n)', []).append(len(F))
        for key, name in CL: rows.setdefault(f'  {name} %', []).append(f'{get(c, key, len(F)):.0f}')
        rows.setdefault('in front: beaten or missed (n)', []).append(len(Fr))
        for key, name in CL: rows.setdefault(f'  in front {name} %', []).append(f'{get(cf, key, len(Fr)):.0f}')
        rows.setdefault('after the beat: yards p50 / TD %', []).append(f"{q([a['yds_after'] for a in A], .5):.1f}/{100 * sum(a['end'] == 'td' for a in A) / max(1, len(A)):.0f}")
        P = [r['pair'] for r in R if r.get('pair')]
        rows.setdefault('bracketed at +1.0 / contact %', []).append(f"{100 * sum(p['p10']['bracket'] for p in P if p.get('p10')) / max(1, sum(1 for p in P if p.get('p10'))):.0f}/{100 * sum(p['contact']['bracket'] for p in P if p.get('contact')) / max(1, sum(1 for p in P if p.get('contact'))):.0f}")
        Fi = [p['first'] for p in P if p.get('first') and p['first']['moving']]
        rows.setdefault('first into contact from behind hips %', []).append(f"{100 * sum(f['behind_hips'] for f in Fi) / max(1, len(Fi)):.0f}")
    w = max(len(k) for k in rows)
    print(' ' * w + ' | ' + ' | '.join(f'{lab:>12}' for lab, _ in sets))
    for k, v in rows.items(): print(f'{k:<{w}} | ' + ' | '.join(f'{str(x):>12}' for x in v))
