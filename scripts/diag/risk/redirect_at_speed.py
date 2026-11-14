# Redirect after the catch, one measurement code for the NFL (BDB 2025, the after-catch population of nfl_yac_stage.py:
# drop-back short completions, screens out, passLength under 10) and the sim (yac-dump.ts JSON lines).
# Part 1 (all defenders): every defender-frame from the catch to +0.6 s (10 Hz) at 4.5-5.5 yd/s, more than 2 yd from
# the catcher and not within 1 yd of him over the next 0.4 s, by the catcher's bearing off his heading: his turn toward
# it over 0.2 / 0.4 s and his speed dip. Diluted by defenders who are not pursuing.
# Part 2 (D1: the defender nearest the catcher at the catch, within 8 yd, moving over 3 yd/s):
#  - heading error against where the catcher is 0.5 s later, at the catch and at +0.2 / +0.4 s; his turn by +0.4 s;
#  - lead at the catch: his heading against the bearing to the catcher now, signed + toward where the catcher is
#    moving (ahead of him, his upfield/leverage side), - behind him;
#  - the catcher: speed at the catch, heading change over 0.4 s, and his escape side: his displacement over 0.5 s across
#    D1's heading, + to the side D1 leads toward, - back behind D1's line (across his face / against his momentum).
# Sim rows also give D1's requested direction (the command he issued) for the lead and heading error.
#   python3 -I scripts/diag/risk/redirect_at_speed.py nfl DATA_DIR WEEKS  |  python3 -I ... sim FILE.jsonl
import csv, sys, os, math, json, statistics as st
def plays_nfl(D, weeks):
  sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
  from population import nfl_population
  pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
  P = {}
  for r in csv.DictReader(open(f'{D}/plays.csv')):
    k = (r['gameId'], r['playId'])
    if k in keep and r['passResult'] == 'C' and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 10:
      P[k] = r['possessionTeam']
  tgt = {}
  for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
  for w in weeks:
    fr = {}; ev = {}; ids = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
      k = (r['gameId'], r['playId'])
      if k not in tgt or r['displayName'] == 'football': continue
      f = int(r['frameId'])
      if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
      s, h = float(r['s']), math.radians(float(r['dir']))
      row = [float(r['x']), float(r['y']), s * math.sin(h), s * math.cos(h)]
      F = fr.setdefault(k, {}).setdefault(f, {'c': None, 'd': {}})
      if r['nflId'] == tgt[k]: F['c'] = row
      elif r['club'] != P[k]: F['d'][r['nflId']] = row
    for k, e in ev.items():
      fc = e.get('pass_outcome_caught')
      if fc is None: continue
      frames = [fr[k].get(f) for f in range(fc, fc + 11)]
      if any(F is None or F['c'] is None for F in frames): continue
      ids0 = sorted(frames[0]['d'])
      if any(any(i not in F['d'] for i in ids0) for F in frames): continue
      yield dict(catch=0, frames=[{'c': F['c'], 'd': [F['d'][i] for i in ids0]} for F in frames])
def plays_sim(path):
  for line in open(path):
    if line.strip(): yield json.loads(line)
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
hd = lambda v: math.atan2(v[3], v[2])
spd = lambda v: math.hypot(v[2], v[3])
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
src = sys.argv[1]
plays = list(plays_nfl(sys.argv[2], sys.argv[3].split(',')) if src == 'nfl' else plays_sim(sys.argv[2]))
B = {}
for p in plays:
  F, c = p['frames'], p['catch']
  for i in range(c, c + 7):
    if i + 4 >= len(F): break
    for j, d in enumerate(F[i]['d']):
      s = spd(d)
      if not 4.5 <= s <= 5.5 or dist(d, F[i]['c']) <= 2: continue
      if any(j >= len(F[i + k]['d']) or dist(F[i + k]['d'][j], F[i + k]['c']) < 1 for k in range(1, 5)): continue
      b = wrap(math.atan2(F[i]['c'][1] - d[1], F[i]['c'][0] - d[0]) - hd(d)); off = abs(math.degrees(b))
      band = '15-30' if 15 <= off < 30 else '30-60' if 30 <= off <= 60 else '60-90' if 60 < off <= 90 else None
      if not band: continue
      sg = 1 if b > 0 else -1
      turn = lambda k: math.degrees(wrap(hd(F[i + k]['d'][j]) - hd(d))) * sg if spd(F[i + k]['d'][j]) > 0.5 else None
      dip = min(spd(F[i + k]['d'][j]) for k in range(1, 5)) - s
      req = None
      if len(d) >= 6 and d[4] == d[4] and math.hypot(d[4], d[5]) > 1:
        req = abs(math.degrees(wrap(math.atan2(d[5], d[4]) - hd(d))))
      B.setdefault(band, []).append((turn(2), turn(4), dip, req))
print(f'{src}: plays {len(plays)}')
print('part 1, all defenders')
for band in ('15-30', '30-60', '60-90'):
  R = B.get(band, [])
  if not R: continue
  med = lambda k: round(st.median(x[k] for x in R if x[k] is not None), 1)
  line = f'  bearing {band}: n {len(R)}  turn toward +0.2 s {med(0)} deg  +0.4 s {med(1)} deg  speed dip {med(2)} yd/s'
  if any(x[3] is not None for x in R): line += f'  request off heading {med(3)} deg'
  print(line)
# Part 2: D1.
def herr(v, frm, tgt):
  if not (v[0] == v[0]) or math.hypot(v[0], v[1]) < 0.5: return None
  return abs(math.degrees(wrap(math.atan2(v[1], v[0]) - math.atan2(tgt[1] - frm[1], tgt[0] - frm[0]))))
D = []
for p in plays:
  F, c = p['frames'], p['catch']
  if c + 9 >= len(F) or not F[c]['d']: continue
  C0 = F[c]['c']
  j = min(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], C0))
  d0 = F[c]['d'][j]
  if dist(d0, C0) > 8 or spd(d0) < 3 or any(j >= len(F[c + k]['d']) for k in range(10)): continue
  r = {}
  for k, tag in ((0, 'e0'), (2, 'e2'), (4, 'e4')):
    dk = F[c + k]['d'][j]; r[tag] = herr(dk[2:4], dk, F[c + k + 5]['c'] if c + k + 5 < len(F) else F[-1]['c'])
    if len(dk) >= 6: r['q' + tag] = herr(dk[4:6], dk, F[c + k + 5]['c'] if c + k + 5 < len(F) else F[-1]['c'])
  r['turn4'] = abs(math.degrees(wrap(hd(F[c + 4]['d'][j]) - hd(d0)))) if spd(F[c + 4]['d'][j]) > 0.5 else None
  # lead at the catch: + toward the catcher's direction of travel
  bear = math.atan2(C0[1] - d0[1], C0[0] - d0[0])
  cv = (C0[2], C0[3]); perp = (-math.sin(bear), math.cos(bear))
  side = 1 if cv[0] * perp[0] + cv[1] * perp[1] >= 0 else -1
  r['lead'] = math.degrees(wrap(hd(d0) - bear)) * side
  if len(d0) >= 6 and math.hypot(d0[4], d0[5]) > 1: r['qlead'] = math.degrees(wrap(math.atan2(d0[5], d0[4]) - bear)) * side
  r['cspd'] = spd(C0)
  r['cturn'] = abs(math.degrees(wrap(hd(F[c + 4]['c']) - hd(C0)))) if spd(F[c + 4]['c']) > 0.5 and spd(C0) > 0.5 else None
  # escape side: catcher displacement over 0.5 s across D1's heading, + to the side D1 leads toward
  h = hd(d0); n = (-math.sin(h), math.cos(h)); C5 = F[c + 5]['c']
  lat = (C5[0] - C0[0]) * n[0] + (C5[1] - C0[1]) * n[1]
  # the side D1 leads toward: the side of his heading the catcher is moving to, relative to the bearing
  lside = 1 if math.sin(wrap(hd(d0) - bear)) * side >= 0 else -1
  bside = 1 if (C0[0] - d0[0]) * n[0] + (C0[1] - d0[1]) * n[1] >= 0 else -1  # catcher's side of D1's line
  r['esc'] = lat * bside  # + moving further to the side he is already on (away from D1's line), - back across D1's line
  r['dist'] = dist(d0, C0)
  D.append(r)
def m(k, f=1):
  v = [x[k] for x in D if x.get(k) is not None]
  return f'{st.median(v):.{f}f}' if v else '-'
def share(k, fn):
  v = [x[k] for x in D if x.get(k) is not None]
  return f'{sum(1 for z in v if fn(z)) / len(v):.2f}' if v else '-'
print(f'part 2, D1 (nearest, within 8 yd, moving): n {len(D)}  distance {m("dist")} yd')
print(f'  heading error (achieved) catch {m("e0", 0)} (>45 {share("e0", lambda z: z > 45)})  +0.2 {m("e2", 0)} ({share("e2", lambda z: z > 45)})  +0.4 {m("e4", 0)} ({share("e4", lambda z: z > 45)});  turn by +0.4 {m("turn4", 0)} deg')
if any('qe0' in x for x in D):
  print(f'  heading error (request)  catch {m("qe0", 0)} ({share("qe0", lambda z: z > 45)})  +0.2 {m("qe2", 0)} ({share("qe2", lambda z: z > 45)})  +0.4 {m("qe4", 0)} ({share("qe4", lambda z: z > 45)})')
print(f'  lead at the catch (deg, + ahead of the catcher): achieved {m("lead", 0)} (share leading {share("lead", lambda z: z > 0)})' + (f'  request {m("qlead", 0)} ({share("qlead", lambda z: z > 0)})' if any('qlead' in x for x in D) else ''))
print(f'  catcher: speed {m("cspd")} yd/s, heading change by +0.4 {m("cturn", 0)} deg;  escape across D1 line over 0.5 s {m("esc", 2)} yd (share back across his line {share("esc", lambda z: z < 0)})')
