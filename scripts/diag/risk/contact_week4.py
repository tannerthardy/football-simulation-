# NFL part 4 in per-week dumps (resumable across container resets): python3 -I contact_week4.py nfl DATA_DIR WEEK OUT.json per week, then python3 -I contact_report4.py DIR. Same operator as contact_cost.py part 4.
# First contact on short completions and what it costs the catcher, one measurement code for the NFL (BDB 2025, the
# population of nfl_yac_stage.py: drop-back short completions, screens out, passLength under 10, pass_forward to the
# end of the play) and the sim (yac-dump.ts JSON lines). 10 Hz.
# First contact: the first frame after the catch with any defender within 1 yd of the catcher; that defender is C1.
# C1's contact: frames C1 stays within 1 yd (1 = a glance); the outcome: tackled (catcher gains under 1 yd after the
# contact's start), slowed (1-3 yd), failed (over 3 yd). For each class: the catcher's speed just before contact (mean of
# the two frames before), at +0.3 s, the lowest over +0.1..+0.5 s (his dip), his heading change over 0.5 s, and how
# far the play goes after contact. Rows for all plays and for the YAC > 10 tail; never reached = no contact in 5 yd.
# Every class also gives D1 (nearest at the catch): his distance then, his closest approach over 1 s, and the catcher's
# speed at the catch and 0.5 s later.
#   python3 -I scripts/diag/risk/contact_cost.py nfl DATA_DIR WEEKS  |  python3 -I ... sim FILE.jsonl
import csv, sys, os, math, json, statistics as st
def plays_nfl(D, weeks):
  sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
  from population import nfl_population
  pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
  P = {}
  for r in csv.DictReader(open(f'{D}/plays.csv')):
    k = (r['gameId'], r['playId'])
    if k in keep and r['passResult'] == 'C' and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 10:
      P[k] = (r['possessionTeam'], float(r['absoluteYardlineNumber']), float(r['yardsGained']), r['pff_manZone'])
  tgt = {}
  for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
  ENDS = ('tackle', 'out_of_bounds', 'touchdown', 'fumble', 'pass_outcome_touchdown')
  for w in weeks:
    fr = {}; ev = {}; dirn = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
      k = (r['gameId'], r['playId'])
      if k not in tgt or r['displayName'] == 'football': continue
      f = int(r['frameId'])
      if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
      s, h = float(r['s']), math.radians(float(r['dir']))
      st = [float(r['x']), float(r['y']), s * math.sin(h), s * math.cos(h)]
      F = fr.setdefault(k, {}).setdefault(f, {'c': None, 'd': []})
      if r['nflId'] == tgt[k]: F['c'] = st; dirn[k] = 1 if r['playDirection'] == 'right' else -1
      elif r['club'] != P[k][0]: F['d'].append(st)
    for k, e in ev.items():
      th, fc = e.get('pass_forward'), e.get('pass_outcome_caught')
      if th is None or fc is None or fc < th: continue
      end = min([e[x] for x in ENDS if x in e and e[x] > fc] or [max(fr[k])])
      frames = [fr[k].get(f) for f in range(th, end + 1)]
      if any(F is None or F['c'] is None or not F['d'] for F in frames): continue
      off, los, yg, mz = P[k]
      yield dict(dir=dirn[k], los=los, catch=fc - th, yards=yg, frames=frames, mz=mz)
def plays_sim(path):
  for line in open(path):
    if line.strip(): yield json.loads(line)
src = sys.argv[1]
plays = list(plays_nfl(sys.argv[2], sys.argv[3].split(',')) if src == 'nfl' else plays_sim(sys.argv[2]))
OUT = sys.argv[4]
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
spd = lambda a: math.hypot(a[2], a[3])
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
rows = []
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F): continue
  up = lambda i: (F[i]['c'][0] - F[c]['c'][0]) * d
  yac = up(len(F) - 1)
  f = next((i for i in range(c + 1, len(F)) if any(dist(x, F[i]['c']) < 1 for x in F[i]['d'])), None)
  if not F[c]['d']: continue
  k1 = min(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], F[c]['c']))
  d1 = {'d1': dist(F[c]['d'][k1], F[c]['c']), 'd1min': min(dist(F[i]['d'][k1], F[i]['c']) for i in range(c, min(len(F), c + 11)) if k1 < len(F[i]['d'])),
        'cs': spd(F[c]['c']), 'cs5': spd(F[min(len(F) - 1, c + 5)]['c'])}
  if f is None or up(f) > 5:
    rows.append({'cls': 'never reached', 'yac': yac, **d1}); continue
  j = min(range(len(F[f]['d'])), key=lambda k: dist(F[f]['d'][k], F[f]['c']))
  held = 0
  for i in range(f, len(F)):
    if j < len(F[i]['d']) and dist(F[i]['d'][j], F[i]['c']) < 1: held += 1
    else: break
  after = yac - up(f)
  cls = 'tackled' if after < 1 else 'slowed' if after <= 3 else 'failed'
  pre = [spd(F[i]['c']) for i in (f - 2, f - 1) if i > c]
  if not pre or f + 5 >= len(F):
    rows.append({'cls': cls, 'yac': yac, 'after': after, 'held': held, **d1}); continue
  s0 = sum(pre) / len(pre)
  h0 = math.atan2(F[f - 1]['c'][3], F[f - 1]['c'][2]); h5 = math.atan2(F[f + 5]['c'][3], F[f + 5]['c'][2])
  rows.append({'cls': cls, 'yac': yac, 'after': after, 'held': held, 's0': s0, 's3': spd(F[f + 3]['c']),
    'dip': min(spd(F[i]['c']) for i in range(f + 1, f + 6)) - s0,
    'turn': abs(math.degrees(wrap(h5 - h0))) if spd(F[f + 5]['c']) > 0.5 and spd(F[f - 1]['c']) > 0.5 else None, **d1})
# Part 4 (operator of defense/DIAG-catch-redirect 48603f6a contact_cost.py, NFL side): raw rows per (defender, tick).
P4 = {}
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F) - 2 or len(F[c]['d']) < 2: continue
  up = lambda i: (F[i]['c'][0] - F[c]['c'][0]) * d
  yac = up(len(F) - 1)
  f = next((i for i in range(c + 1, len(F)) if any(dist(x, F[i]['c']) < 1 for x in F[i]['d'])), None)
  if not (f is None or up(f) > 5 or (yac - up(f)) > 3): continue
  order = sorted(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], F[c]['c']))
  for nm, j in (('D1', order[0]), ('D2', order[1])):
    for k in (0, 5, 10):
      i = c + k
      if i >= len(F) or j >= len(F[i]['d']): continue
      x, C = F[i]['d'][j], F[i]['c']
      cs = spd(C); ux, uy = (C[2] / cs, C[3] / cs) if cs > 0.5 else (d, 0.0)
      P4.setdefault(f'{nm}|{k}', []).append({'depth': (x[0] - C[0]) * d, 'lat': abs((x[0] - C[0]) * -uy + (x[1] - C[1]) * ux), 'back': x[2] * d, 'spd': spd(x)})
json.dump(P4, open(OUT, 'w'))
