# Redirect at speed after the catch, one measurement code for the NFL (BDB 2025, the after-catch population of
# nfl_yac_stage.py: drop-back short completions, screens out, passLength under 10) and the sim (yac-dump.ts JSON lines).
# Every defender-frame from the catch to +0.6 s (10 Hz) with his speed 4.5-5.5 yd/s, more than 2 yd from the catcher
# and not within 1 yd of him over the next 0.4 s (no contact), by the catcher's bearing off his heading (15-30, 30-60,
# 60-90 deg): his heading change toward that bearing over the next 0.2 and 0.4 s, and his speed dip (lowest speed over
# the next 0.4 s minus his speed now). Sim rows also give his requested direction off his heading (the command he issued).
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
for band in ('15-30', '30-60', '60-90'):
  R = B.get(band, [])
  if not R: continue
  med = lambda k: round(st.median(x[k] for x in R if x[k] is not None), 1)
  line = f'  bearing {band}: n {len(R)}  turn toward +0.2 s {med(0)} deg  +0.4 s {med(1)} deg  speed dip {med(2)} yd/s'
  if any(x[3] is not None for x in R): line += f'  request off heading {med(3)} deg'
  print(line)
