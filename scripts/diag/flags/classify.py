#!/usr/bin/env python3
"""Classify every env flag read in src (read-only). Inputs are produced by inventory.py / offpath.py plus a few
snapshots (see docs/reviews/2026-11-25-flag-inventory.md for how). Run from the repo root:
  python3 scripts/diag/flags/classify.py --inv inv.json --off offpath.json --hist stackhist.json --tests testuse.json --prs openprs.json --out data/reviews/flags
Classes: A on by default, promoted <= 2026-11-09 (or never in the stack: pre-stack default); B on by default since
2026-11-10; C off, parked/failed (no live signal); D off, live (fresh open PR, current docs or a fresh src touch);
E numeric or mode; F registry mismatches."""
import json, re, argparse, pathlib, subprocess, csv, collections
ap = argparse.ArgumentParser()
for k in ('inv', 'off', 'hist', 'tests', 'prs', 'out'): ap.add_argument('--' + k, required=True)
ap.add_argument('--fresh', default='2026-11-18', help='PRs updated on/after this date, and src touches on/after it, count as live')
a = ap.parse_args()
inv = {k: v for k, v in json.load(open(a.inv)).items() if not k.startswith('_')}
off = json.load(open(a.off)); hist = json.load(open(a.hist)); tests = json.load(open(a.tests)); prs = json.load(open(a.prs))
pin = json.load(open('test/engine-pin.json'))
pinned = set(pin['pinned'])
md = pathlib.Path('docs/FLAGS.md').read_text().splitlines()
row = {}
for l in md:
    m = re.match(r"^\| `([A-Z][A-Z_0-9]*)` \|(.*)", l)
    if m:
        cells = [c.strip() for c in l.split('|')[1:-1]]
        row[m.group(1)] = dict(default=cells[1], status=cells[2], lane=cells[3])
docs = {}
for f in ['docs/GAPS.md', 'docs/PLAN.md'] + sorted(str(p) for p in pathlib.Path('docs/reviews').glob('2026-11-2[345]*.md') if 'flag-inventory' not in p.name):
    docs[f] = pathlib.Path(f).read_text()
allrx = re.compile(r'(?<![A-Z_0-9])(' + '|'.join(sorted(map(re.escape, inv), key=len, reverse=True)) + r')(?![A-Z_0-9])')
# a catalogue PR (names 9 or more flags in title, head and body) only counts for the flags in its title and head
catalog = {p['n'] for p in prs if len(set(allrx.findall(p['title'] + ' ' + p['head'] + ' ' + p['body']))) >= 9}
def prs_for(n):
    rx = re.compile(r'(?<![A-Z_0-9])' + re.escape(n) + r'(?![A-Z_0-9])')
    return [(p['n'], p['upd'][:10], p['head']) for p in prs
            if rx.search(p['title'] + ' ' + p['head'] + ('' if p['n'] in catalog else ' ' + p['body']))]
def docs_for(n):
    rx = re.compile(r'(?<![A-Z_0-9])' + re.escape(n) + r'(?![A-Z_0-9])')
    return [f for f, t in docs.items() if rx.search(t) and f in ('docs/GAPS.md', 'docs/PLAN.md') or (rx.search(t) and f.startswith('docs/reviews/'))]
def numeric(v): return v['forms'][0].startswith('??') or v['forms'][0] == 'raw'
out = []
for n, v in sorted(inv.items()):
    form = v['forms'][0]
    r = row.get(n, {})
    status = r.get('status', '')
    st = v['stack']
    if numeric(v): cls = 'E'
    elif form in ("!=='0'", "==='0'"): cls = None
    else: cls = None
    ond = hist['on'].get(n); offd = hist['off'].get(n)
    first = v['first']; last = v['last']
    pr = prs_for(n); dc = docs_for(n)
    z_test = [f for f in tests[n]['zero_test']]
    z_def = [f for f in z_test if f not in pinned and not f.startswith(('test/integration/', 'test/research/')) and f not in ('test/film-pairs.test.ts', 'test/film-pack-inputs.test.ts', 'test/saved-game-play.test.ts', 'test/play-lab.test.ts', 'test/hands-bunch.test.ts')]
    z_pin = [f for f in z_test if f not in z_def]
    base = dict(flag=n, form=form, stack=st or ('numeric' if v['numeric'] else ''), sites=len(v['sites']), file=v['sites'][0].rsplit(':', 1)[0],
                first=f"{first[1]}" if first else '', last_src=f"{last[0][:9]} {last[1]}" if last else '',
                lane=r.get('lane', ''), status=status[:110], md=bool(r), nuses=off.get(n, {}).get('uses', len(v['sites'])), offlines=off.get(n, {}).get('offLines', 0),
                prs=';'.join(f"#{p[0]}({p[1]})" for p in pr), docs=';'.join(d.replace('docs/reviews/', '').replace('docs/', '') for d in dc),
                zero_def_tests=';'.join(z_def), zero_pinned_tests=len(z_pin), zero_scripts=len(tests[n]['zero_scripts']), ref_tests=len(tests[n]['ref_test']))
    if cls == 'E':
        base['class'] = 'E'; base['date'] = ''
    elif form in ("!=='0'", "==='0'"):
        if st == 'on':
            d = ond[1]; base['date'] = d; base['engine'] = ond[2]
            base['class'] = 'A' if d <= '2026-11-09' else 'B'
        else:
            base['date'] = first[1] if first else ''; base['engine'] = 'pre-stack'; base['class'] = 'A'
    else:
        # off by default (or retired)
        live_pr = [p for p in pr if p[1] >= a.fresh]
        stale_pr = [p for p in pr if p[1] < a.fresh]
        recent = bool(last and last[1] >= a.fresh)
        why = []
        if live_pr: why.append('open PR ' + ','.join('#%d' % p[0] for p in live_pr))
        gp = [d for d in dc if d in ('docs/GAPS.md', 'docs/PLAN.md')]
        if gp: why.append('named in ' + '+'.join(g.split('/')[-1] for g in gp))
        rd = [d for d in dc if d.startswith('docs/reviews/')]
        if rd: why.append('in ' + str(len(rd)) + ' review doc(s) 11-23..25')
        if recent: why.append('src touched ' + last[1])
        base['class'] = 'D' if why else 'C'
        base['why'] = '; '.join(why)
        base['stale_pr'] = ','.join('#%d(%s)' % (p[0], p[1]) for p in stale_pr)
        base['date'] = offd[1] if offd else ''
        if st == 'retired': base['class'] = 'C'; base['why'] = 'retired in the stack'
    out.append(base)
pathlib.Path(a.out).mkdir(parents=True, exist_ok=True)
cols = ['flag', 'class', 'date', 'engine', 'stack', 'form', 'lane', 'first', 'last_src', 'sites', 'nuses', 'offlines', 'prs', 'stale_pr', 'why', 'docs', 'zero_def_tests', 'zero_pinned_tests', 'zero_scripts', 'ref_tests', 'file', 'status']
with open(pathlib.Path(a.out) / 'flag-inventory.tsv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, delimiter='\t', extrasaction='ignore'); w.writeheader()
    for b in out: w.writerow({k: b.get(k, '') for k in cols})
json.dump(out, open(pathlib.Path(a.out) / 'flag-inventory.json', 'w'), indent=1)
print(collections.Counter(b['class'] for b in out))
