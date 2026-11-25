"""Open flats with two defenders on one flat and a free #2 inside (Flex's suggested class), for the sim arm. Needs the rows file of flat_open_report.py (--rows) and the sim file it was built from.
  python3 -I scripts/diag/census/open_flat_two.py SIM.jsonl.gz ROWS.json [--fam cover2,cover6] [--out report.md]
For each open-flat catch (nearest defender over 8 yd at the catch) at the release (the throw), from the engine's seats at the release (`def.rel`: man seat with a target, zone seat with a landmark) and the positions at the release:
  on the flat = defenders (excluding linemen) who are man on the catcher, or zone seats whose landmark is within 9 yd of the catch point (the owner test of flat_open_report.py), or who stand within 6 yd of the catch point at the release;
  two on one flat = at least two such defenders;
  #2 free inside = another offensive route runner (not the passer, not the catcher) on the same side of the center, nearer the center than the catcher, within 12 yd of him at the release, whose nearest defender is over 5 yd away at the release.
Printed per family: open flats, with two on the flat, with a free inside receiver, both; and the list (id, seats on the flat, the free receiver)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--fam')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
FAMS = sys.argv[sys.argv.index('--fam') + 1].split(',') if '--fam' in sys.argv else ['cover2', 'cover6', 'cover3', 'cover4', 'cover1']
OL = {'T', 'G', 'C', 'OT', 'OG'}
rows = {r['id']: r for r in json.load(open(args[1]))}
plays = {}
for l in gzip.open(args[0], 'rt'):
    p = json.loads(l)
    if p['id'] in rows: plays[p['id']] = p
out = []; L = []; P = L.append
by = {}
for id_, r in rows.items():
    p = plays.get(id_)
    if p is None or p.get('fam') not in FAMS: continue
    X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; rel = p.get('rel')
    if rel is None or 'rel' not in (p.get('def') or {}): continue
    seats = p['def']['rel']; ds = [i for i, q in enumerate(pl) if q['side'] == 'D']
    if len(seats) != len(ds): continue
    cx, cy = r['catch'][0], r['catch'][1]
    recv = next((i for i, q in enumerate(pl) if q['slot'] == r['receiver'] and q['side'] == 'O'), None)
    if recv is None: continue
    ols = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
    c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
    on = []
    for j, s in zip(ds, seats):
        if pl[j]['pos'] in ('DE', 'DT', 'NT', 'DL', 'EDGE'): continue
        near = math.hypot(X[j, rel] - cx, Y[j, rel] - cy) <= 6
        man = s.get('kind') == 'man' and s.get('target') == r['receiver']
        zlm = s.get('kind') == 'zone' and s.get('lm') and math.hypot(s['lm'][0] - cx, s['lm'][1] - cy) <= 9
        if near or man or zlm: on.append(s.get('slot'))
    free = []
    for i, q in enumerate(pl):
        if q['side'] != 'O' or i == p['qb'] or i == recv or not q['route']: continue
        same = (Y[i, rel] - c) * (Y[recv, rel] - c) > 0 and abs(Y[i, rel] - c) < abs(Y[recv, rel] - c)
        if not same or math.hypot(X[i, rel] - X[recv, rel], Y[i, rel] - Y[recv, rel]) > 12: continue
        d1 = min(math.hypot(X[j, rel] - X[i, rel], Y[j, rel] - Y[i, rel]) for j in ds)
        if d1 > 5: free.append((q['slot'], round(d1, 1)))
    b = by.setdefault(p['fam'], dict(n=0, two=0, free=0, both=0)); b['n'] += 1; b['two'] += len(on) >= 2; b['free'] += bool(free); b['both'] += len(on) >= 2 and bool(free)
    out.append((id_, p['fam'], r['receiver'], on, free))
P('| family | open flats | two or more on the flat | a free #2 inside | both |'); P('|---|---|---|---|---|')
for f, b in sorted(by.items()): P(f"| {f} | {b['n']} | {b['two']} | {b['free']} | {b['both']} |")
P(''); P('| id | family | catcher | defenders on the flat | free inside receivers (slot, nearest defender yd) |'); P('|---|---|---|---|---|')
for id_, f, rc, on, free in out: P(f"| {id_} | {f} | {rc} | {', '.join(on) or '-'} | {', '.join(f'{a} {b}' for a, b in free) or '-'} |")
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
