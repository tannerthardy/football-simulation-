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
def med(R, k, n=1):
  v = [r[k] for r in R if r.get(k) is not None]
  return f'{st.median(v):.{n}f}' if v else '-'
def mean(R, k, n=2):
  v = [r[k] for r in R if r.get(k) is not None]
  return f'{sum(v) / len(v):.{n}f}' if v else '-'
print(f'{src}: short completions {len(rows)}')
for label, R0 in (('all', rows), ('tail YAC > 10', [r for r in rows if r['yac'] > 10])):
  print(f'  {label}: n {len(R0)}')
  for cls in ('never reached', 'tackled', 'slowed', 'failed'):
    R = [r for r in R0 if r['cls'] == cls]
    if not R: continue
    line = f'    {cls:13s} share {len(R) / len(R0):.2f}'
    line += f' | D1 at the catch {med(R, "d1")} yd, closest in 1 s {med(R, "d1min")} | catcher speed at the catch {med(R, "cs")}, +0.5 s {med(R, "cs5")}'
    if cls != 'never reached':
      g = [r for r in R if r.get('held') == 1]
      line += (f' | held frames {med(R, "held", 0)} (glance share {len(g) / len(R):.2f}) | catcher speed before {med(R, "s0")} '
               f'+0.3 s {med(R, "s3")} dip {med(R, "dip")} yd/s | turn {med(R, "turn", 0)} deg | after contact mean {mean(R, "after")}')
    print(line)
  F_ = [r for r in R0 if r['cls'] == 'failed' and r.get('dip') is not None]
  for nm, sel in (('glance (1 frame)', lambda r: r['held'] == 1), ('held 2+ frames', lambda r: r['held'] >= 2)):
    S_ = [r for r in F_ if sel(r)]
    if S_: print(f'      failed, {nm}: n {len(S_)} speed before {med(S_, "s0")} dip {med(S_, "dip")} +0.3 s {med(S_, "s3")} after contact mean {mean(S_, "after")}')
# Part 2, free plays (never reached or failed): who gets the free runner down, and when. The stopper is the defender
# nearest the catcher on the last frame if within 1.5 yd (by his rank at the catch: D1, D2, D3+); otherwise the play
# ended at the sideline (catcher within 1.5 yd of it) or otherwise (score, other). His closing speed and lead (heading
# ahead of the bearing to the catcher, signed toward the catcher's motion) are medians over the catch to the stop.
W = 53.3
free = []
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F) - 2 or not F[c]['d']: continue
  up = lambda i: (F[i]['c'][0] - F[c]['c'][0]) * d
  yac = up(len(F) - 1)
  f = next((i for i in range(c + 1, len(F)) if any(dist(x, F[i]['c']) < 1 for x in F[i]['d'])), None)
  if not (f is None or up(f) > 5 or (yac - up(f)) > 3): continue
  order = sorted(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], F[c]['c']))
  L = F[-1]; near = min(range(len(L['d'])), key=lambda k: dist(L['d'][k], L['c']))
  if dist(L['d'][near], L['c']) <= 1.5:
    rank = order.index(near) if near in order else 9
    who = 'D1' if rank == 0 else 'D2' if rank == 1 else 'D3+'
  else: who = 'sideline' if min(L['c'][1], W - L['c'][1]) < 1.5 else 'other'
  r = {'yac': yac, 'who': who, 't': (len(F) - 1 - c) * 0.1}
  for k, tag in ((5, 'v05'), (10, 'v10'), (15, 'v15')):
    if c + k < len(F): r[tag] = spd(F[c + k]['c'])
  r['v00'] = spd(F[c]['c'])
  if who in ('D1', 'D2', 'D3+'):
    r['sdist'] = dist(F[c]['d'][near], F[c]['c'])
    cl, ld = [], []
    for i in range(c, len(F) - 1):
      if near >= len(F[i]['d']): break
      x, C = F[i]['d'][near], F[i]['c']
      bx, by = C[0] - x[0], C[1] - x[1]; B = math.hypot(bx, by) or 1e-6
      cl.append((x[2] * bx + x[3] * by) / B - (C[2] * bx + C[3] * by) / B)
      if spd(x) > 1:
        b = math.atan2(by, bx); side = 1 if (C[2] * -by + C[3] * bx) >= 0 else -1
        ld.append(math.degrees(wrap(math.atan2(x[3], x[2]) - b)) * side)
    if cl: r['close'] = st.median(cl)
    if ld: r['lead'] = st.median(ld)
  free.append(r)
q = lambda v, x: sorted(v)[min(len(v) - 1, int(x * len(v)))]
Y = [r['yac'] for r in free]
print(f'part 2, free plays (never reached or failed): n {len(free)} ({len(free) / max(1, len(rows)):.2f} of completions)')
if Y:
  print(f'  YAC p25/50/75/90 {q(Y, .25):.1f}/{q(Y, .5):.1f}/{q(Y, .75):.1f}/{q(Y, .9):.1f}  mean {sum(Y) / len(Y):.2f}  over 10 {sum(1 for y in Y if y > 10) / len(Y):.2f}')
  print(f'  catcher speed at the catch {med(free, "v00")}  +0.5 s {med(free, "v05")}  +1.0 s {med(free, "v10")}  +1.5 s {med(free, "v15")} yd/s')
  for who in ('D1', 'D2', 'D3+', 'sideline', 'other'):
    R = [r for r in free if r['who'] == who]
    if not R: continue
    line = f'  stop by {who:8s} share {len(R) / len(free):.2f} | YAC median {med(R, "yac")} | time to stop {med(R, "t")} s'
    if who.startswith('D'): line += f' | his distance at the catch {med(R, "sdist")} yd | closing {med(R, "close")} yd/s | lead {med(R, "lead", 0)} deg'
    print(line)
# Part 3, the near defenders on free plays: D1 and D2 (nearest and next at the catch), at the catch and +0.5 / +1.0 /
# +1.5 s: his speed, his closing rate on the catcher, and whether the catcher is past him (the catcher upfield of him
# along the attack direction). Sim rows add his requested speed and his behaviour (man / zone flags in the dump; neither
# = pursuit or another behaviour) and when he first leaves man/zone after the catch.
T3 = (0, 5, 10, 15)
acc = {('D1', k): [] for k in T3} | {('D2', k): [] for k in T3}
leave = {'D1': [], 'D2': []}; kinds = {('D1', k): {} for k in T3} | {('D2', k): {} for k in T3}
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F) - 2 or len(F[c]['d']) < 2: continue
  up = lambda i: (F[i]['c'][0] - F[c]['c'][0]) * d
  yac = up(len(F) - 1)
  f = next((i for i in range(c + 1, len(F)) if any(dist(x, F[i]['c']) < 1 for x in F[i]['d'])), None)
  if not (f is None or up(f) > 5 or (yac - up(f)) > 3): continue
  order = sorted(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], F[c]['c']))
  for nm, j in (('D1', order[0]), ('D2', order[1])):
    for k in T3:
      i = c + k
      if i >= len(F) or j >= len(F[i]['d']): continue
      x, C = F[i]['d'][j], F[i]['c']
      bx, by = C[0] - x[0], C[1] - x[1]; B = math.hypot(bx, by) or 1e-6
      row = {'s': spd(x), 'close': (x[2] * bx + x[3] * by) / B - (C[2] * bx + C[3] * by) / B, 'past': (C[0] - x[0]) * d > 0, 'dist': B}
      if len(x) >= 7 and x[4] == x[4]:
        row['req'] = math.hypot(x[4], x[5]); kd = 'man' if x[6] & 4 else 'zone' if x[6] & 8 else 'other'
        kinds[(nm, k)][kd] = kinds[(nm, k)].get(kd, 0) + 1
      acc[(nm, k)].append(row)
    if len(F[c]['d'][j]) >= 7:
      t = next(((i - c) * 0.1 for i in range(c, len(F)) if j < len(F[i]['d']) and not (F[i]['d'][j][6] & 12)), None)
      leave[nm].append(t if t is not None else 99)
print('part 3, near defenders on free plays')
for nm in ('D1', 'D2'):
  for k in T3:
    R = acc[(nm, k)]
    if not R: continue
    line = f'  {nm} +{k / 10:.1f} s: n {len(R)} speed {med(R, "s")} closing {med(R, "close")} yd/s distance {med(R, "dist")} yd catcher past him {sum(r["past"] for r in R) / len(R):.2f}'
    if any('req' in r for r in R):
      K = kinds[(nm, k)]; tot = sum(K.values()) or 1
      line += f' | requested {med(R, "req")} yd/s | ' + ' '.join(f'{kk} {v / tot:.2f}' for kk, v in sorted(K.items()))
    print(line)
  if leave[nm]:
    L = leave[nm]; print(f'  {nm} leaves man/zone after the catch: median {st.median(L):.1f} s (never within the play {sum(1 for x in L if x == 99) / len(L):.2f})')
# Part 4, D1/D2 on free plays in the catcher's frame, at the catch and +0.5 / +1.0 s: depth (yd upfield of the catcher
# along the attack direction, + = between him and the goal line), lateral offset across the catcher's direction of
# travel (absolute), the defender's velocity toward the goal line he defends (+ = giving ground / retreating, - =
# driving downhill toward the line of scrimmage), and the share of defenders upfield of the catcher. Sim rows also give
# the same components of his requested velocity.
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
      row = {'depth': (x[0] - C[0]) * d, 'lat': abs((x[0] - C[0]) * -uy + (x[1] - C[1]) * ux), 'back': x[2] * d, 'spd': spd(x)}
      if len(x) >= 6 and x[4] == x[4]: row['rback'] = x[4] * d; row['rspd'] = math.hypot(x[4], x[5])
      P4.setdefault((nm, k), []).append(row)
print('part 4, near defenders on free plays in the catcher frame')
for nm in ('D1', 'D2'):
  for k in (0, 5, 10):
    R = P4.get((nm, k), [])
    if not R: continue
    line = (f'  {nm} +{k / 10:.1f} s: n {len(R)} depth {med(R, "depth")} yd (upfield of him {sum(1 for r in R if r["depth"] > 0) / len(R):.2f}, 2+ yd upfield '
            f'{sum(1 for r in R if r["depth"] >= 2) / len(R):.2f}) lateral {med(R, "lat")} yd | toward his own goal {med(R, "back")} yd/s (retreating {sum(1 for r in R if r["back"] > 0.5) / len(R):.2f}) speed {med(R, "spd")}')
    if any('rback' in r for r in R): line += f' | requested toward own goal {med(R, "rback")} speed {med(R, "rspd")}'
    print(line)
# Part 5, where defenders are when the ball arrives (free plays). Frames start at the release (pass_forward / the
# sim's release). For D1/D2 (ranked at the catch) at the release, mid-flight and the catch: depth upfield of the
# catcher's catch point (+ = between it and the goal line) and velocity toward their own goal. For the deep pair (the two
# defenders deepest upfield of the catch point at the release): depth at the catch, velocity toward own goal at the
# release / mid / catch / +0.5 s, and the first frame from the release with velocity toward own goal under -1 yd/s
# (breaking downhill), against the catch. For plays that end with nobody within 1.5 yd ('other'): defenders upfield of
# the catcher at the catch, and the closest any defender got to the catcher after the catch.
P5 = {}; OT = []
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F) - 2 or len(F[c]['d']) < 3: continue
  up = lambda i: (F[i]['c'][0] - F[c]['c'][0]) * d
  yac = up(len(F) - 1)
  f = next((i for i in range(c + 1, len(F)) if any(dist(x, F[i]['c']) < 1 for x in F[i]['d'])), None)
  if not (f is None or up(f) > 5 or (yac - up(f)) > 3): continue
  CP = F[c]['c']
  order = sorted(range(len(F[c]['d'])), key=lambda k: dist(F[c]['d'][k], CP))
  mid = c // 2
  for nm, j in (('D1', order[0]), ('D2', order[1])):
    for tag, i in (('rel', 0), ('mid', mid), ('catch', c)):
      if j >= len(F[i]['d']): continue
      x = F[i]['d'][j]
      P5.setdefault((nm, tag), []).append({'depth': (x[0] - CP[0]) * d, 'back': x[2] * d})
  deep = sorted(range(len(F[0]['d'])), key=lambda k: -(F[0]['d'][k][0] - CP[0]) * d)[:2]
  for j in deep:
    if j >= len(F[c]['d']): continue
    row = {'depth': (F[c]['d'][j][0] - CP[0]) * d, 'dist': dist(F[c]['d'][j], CP)}
    for tag, i in (('rel', 0), ('mid', mid), ('catch', c), ('p5', c + 5)):
      if i < len(F) and j < len(F[i]['d']): row['b_' + tag] = F[i]['d'][j][2] * d
    br = next((i for i in range(0, min(len(F), c + 15)) if j < len(F[i]['d']) and F[i]['d'][j][2] * d < -1), None)
    row['brk'] = None if br is None else (br - c) * 0.1
    P5.setdefault(('deep', 'x'), []).append(row)
  L = F[-1]
  if min(dist(x, L['c']) for x in L['d']) > 1.5 and not (min(L['c'][1], 53.3 - L['c'][1]) < 1.5):
    OT.append({'upfield': sum(1 for x in F[c]['d'] if (x[0] - CP[0]) * d > 0), 'closest': min(min(dist(x, F[i]['c']) for x in F[i]['d']) for i in range(c + 1, len(F))), 'yac': yac})
print('part 5, where defenders are when the ball arrives (free plays)')
for nm in ('D1', 'D2'):
  print('  ' + nm + ': ' + ' | '.join(f'{tag} depth {med(P5.get((nm, tag), []), "depth")} toward own goal {med(P5.get((nm, tag), []), "back")}' for tag in ('rel', 'mid', 'catch')))
R = P5.get(('deep', 'x'), [])
if R:
  B = [r['brk'] for r in R if r['brk'] is not None]
  print(f'  deep pair: n {len(R)} depth at the catch {med(R, "depth")} yd (distance {med(R, "dist")}) | toward own goal rel {med(R, "b_rel")} mid {med(R, "b_mid")} catch {med(R, "b_catch")} +0.5 {med(R, "b_p5")} | '
        f'breaks downhill: before the catch {sum(1 for b in B if b < 0) / len(R):.2f}, within 0.5 s after {sum(1 for b in B if 0 <= b <= 0.5) / len(R):.2f}, later or never {1 - sum(1 for b in B if b <= 0.5) / len(R):.2f}; median break {f"{st.median(B):.1f}" if B else "-"} s from the catch')
if OT:
  print(f'  never caught (other): n {len(OT)} defenders upfield of the catcher at the catch {med(OT, "upfield", 0)} | closest any defender got after the catch {med(OT, "closest")} yd (within 1 yd {sum(1 for o in OT if o["closest"] < 1) / len(OT):.2f}) | YAC {med(OT, "yac")}')
