"""Attribute the first-contact defender on each play: was he engaged at
contact (blocked/through a block), did an assigned blocker ever load him and
lose him (shed), was he assigned but never touched, or unassigned?
python -I scripts/diag/zone-lab/attrib.py 'out/zone-lab/base-*.jsonl.gz' [concepts=oz,wz] [--detail]"""
import glob, gzip, json, sys
from collections import Counter, defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt')]
conc = sys.argv[2].split(',') if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else ['iz', 'oz', 'wz']
rows = [r for r in rows if 'error' not in r and r['concept'] in conc and r.get('firstContact') and r['firstContact']['by']]
cats = defaultdict(Counter); gains = defaultdict(list); who = defaultdict(Counter)
for r in rows:
    fc = r['firstContact']; d = fc['by']; di = r['slots'].index(d)
    owners = [b for b, p in r['plan0'].items() if p['target'] == d or p['climb'] == d or (p['combo'] or {}).get('backer') == d]
    fr = min(r['frames'], key=lambda f: abs(f['t'] - fc['t']))
    engaged_now = [r['slots'][e[0]] for e in fr['e'] if e[1] == di] + [r['slots'][h] for e in fr['e'] if e[1] == di for h in e[3]]
    ever = [k.split('>')[0] for k in r['loadFirst'] if k.split('>')[1] == d]
    if engaged_now: c = 'engaged at contact'
    elif ever and any(o in ever for o in owners): c = 'shed assigned blocker'
    elif ever: c = 'shed other blocker'
    elif owners: c = 'assigned, never loaded'
    else: c = 'unassigned'
    pos = d.split('_')[0]
    key = (r['concept'], r['dir'])
    cats[key][c] += 1; gains[(key, c)].append(r['gain']); who[(key, c)][pos + (':' + '/'.join(owners) if owners else '')] += 1
for key in sorted(cats):
    n = sum(cats[key].values()); print(f"== {'/'.join(key)} ({n} plays with contact)")
    for c, k in cats[key].most_common():
        g = sorted(gains[(key, c)])
        print(f"   {c:26s} {k:4d} {k/n:4.0%}  median gain {g[len(g)//2]:5.2f} | " + ', '.join(f'{a}:{b}' for a, b in who[(key, c)].most_common(6)))
