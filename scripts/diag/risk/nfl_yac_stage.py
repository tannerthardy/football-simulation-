# After-catch staging on short completions, one measurement code for the NFL (BDB 2025 drop-back passes,
# population.py, screens out, passLength under 10, pass_forward to the end of the play) and the sim (yac-dump.ts JSON
# lines). D1, D2, D3 are the defenders nearest the catch point at the catch.
#  (1) before the catch: D1/D2 speed and closing rate toward the catch point at the release, mid-flight and the catch;
#  (2) catch to first contact (first frame any defender is within 1 yd of the catcher): time, distance each covered,
#      D1's heading error against the bearing to where the catcher is 0.5 s later, at +0.2 and +0.4 s;
#  (3) first contact: by D1 or another; catcher speed then; YAC at contact; yards after contact; no contact in 5 yd;
#  (4) the tail (YAC over 10): D2/D3 distance and closing at the catch, and their closest approach before 10 yd.
#   python3 -I scripts/diag/risk/nfl_yac_stage.py nfl DATA_DIR WEEKS     |  python3 -I ... sim FILE.jsonl
import csv, sys, os, math, json
H = 0.1
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
def closing(dv, p):
  dx, dy = p[0] - dv[0], p[1] - dv[1]; L = math.hypot(dx, dy) or 1e-6
  return (dv[2] * dx + dv[3] * dy) / L
def herr(dv, tgt, req=False):
  vx, vy = (dv[4], dv[5]) if req else (dv[2], dv[3])
  if not (vx == vx) or math.hypot(vx, vy) < 0.5: return float('nan')
  b = math.atan2(tgt[1] - dv[1], tgt[0] - dv[0]); h = math.atan2(vy, vx); a = abs(h - b) % (2 * math.pi)
  return math.degrees(min(a, 2 * math.pi - a))
R = []
for p in plays:
  F, c, d = p['frames'], p['catch'], p['dir']
  if c >= len(F) or len(F[c]['d']) < 3: continue
  cp = F[c]['c']
  order = sorted(range(len(F[c]['d'])), key=lambda j: dist(F[c]['d'][j], cp))
  j1, j2, j3 = order[:3]
  r = {}
  for tag, i in (('rel', 0), ('mid', c // 2), ('catch', c)):
    for nm, j in (('D1', j1), ('D2', j2)):
      if j < len(F[i]['d']): r[f'{nm}_{tag}_speed'] = spd(F[i]['d'][j]); r[f'{nm}_{tag}_close'] = closing(F[i]['d'][j], cp)
  r['D1_dist'] = dist(F[c]['d'][j1], cp); r['D2_dist'] = dist(F[c]['d'][j2], cp); r['D3_dist'] = dist(F[c]['d'][j3], cp)
  r['D2_close'] = closing(F[c]['d'][j2], cp); r['D3_close'] = closing(F[c]['d'][j3], cp)
  for t in (2, 4):
    i = c + t
    if i < len(F) and j1 < len(F[i]['d']):
      r[f'herr{t}'] = herr(F[i]['d'][j1], F[min(len(F) - 1, i + 5)]['c'])
      if len(F[i]['d'][j1]) > 4: r[f'rerr{t}'] = herr(F[i]['d'][j1], F[min(len(F) - 1, i + 5)]['c'], True)
  r['fast'] = spd(F[c]['d'][j1]) > 3
  dm = F[c // 2]['d'][j1]
  if len(dm) > 6:
    if len(dm) > 11 and dm[10] is not None and dm[11] is not None:
      r['land_err'] = math.hypot(dm[10] - cp[0], dm[11] - cp[1]); r['land_short'] = (cp[0] - dm[10]) * d
      r['goto'] = dm[9] == 1; r['req_speed'] = math.hypot(dm[4], dm[5])
    elif len(dm) > 5: r['req_speed'] = math.hypot(dm[4], dm[5])
    f = int(dm[6]); r['est'] = bool(f & 2); r['saw'] = bool(f & 1); r['mz'] = 'man' if f & 4 else 'zone' if f & 8 else 'other'; r['hands'] = bool(f & 16)
  else: r['mz'] = {'Man': 'man', 'Zone': 'zone'}.get(p.get('mz'), 'other')
  yac = (F[-1]['c'][0] - cp[0]) * d; r['yac'] = yac
  contact = None
  for i in range(c + 1, len(F)):
    ds = [dist(x, F[i]['c']) for x in F[i]['d']]
    if (F[i]['c'][0] - cp[0]) * d >= 5 and contact is None: r['no5'] = True; break
    if min(ds) <= 1.0: contact = i; who = ds.index(min(ds)); break
  r.setdefault('no5', False)
  if contact is not None:
    r['t_contact'] = (contact - c) * H
    r['by_D1'] = who == j1
    r['D1_run'] = sum(dist(F[i]['d'][j1], F[i + 1]['d'][j1]) for i in range(c, contact) if j1 < len(F[i + 1]['d']))
    r['C_run'] = sum(dist(F[i]['c'], F[i + 1]['c']) for i in range(c, contact))
    r['c_speed'] = spd(F[contact]['c']); r['yac_at'] = (F[contact]['c'][0] - cp[0]) * d; r['after'] = (F[-1]['c'][0] - F[contact]['c'][0]) * d
  if yac > 10:
    mins = []
    for j in (j2, j3):
      m = min((dist(F[i]['d'][j], F[i]['c']) for i in range(c, len(F)) if j < len(F[i]['d']) and (F[i]['c'][0] - cp[0]) * d < 10), default=float('nan')); mins.append(m)
    r['tail_D2_min'], r['tail_D3_min'] = mins
  R.append(r)
def q(k, S=None):
  v = sorted(x[k] for x in (S or R) if k in x and x[k] == x[k])
  return '-' if len(v) < 5 else '/'.join(f'{v[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75))
def mean(k, S=None):
  v = [x[k] for x in (S or R) if k in x and x[k] == x[k]]; return f'{sum(v) / len(v):.2f}' if v else '-'
share = lambda f, S=None: f'{sum(1 for x in (S or R) if f(x)) / max(1, len(S or R)):.2f}'
print(f'== {src}: short completions n {len(R)} | YAC {q("yac")} (mean {mean("yac")}) | YAC > 10 share {share(lambda x: x["yac"] > 10)}')
print('(1) before the catch: speed | closing toward the catch point (yd/s), p25/p50/p75')
for nm in ('D1', 'D2'):
  print(f'   {nm}: release {q(nm + "_rel_speed")} | {q(nm + "_rel_close")}  ->  mid {q(nm + "_mid_speed")} | {q(nm + "_mid_close")}  ->  catch {q(nm + "_catch_speed")} | {q(nm + "_catch_close")}   (dist at catch {q(nm + "_dist")})')
C = [x for x in R if 't_contact' in x]
print(f'(2) catch to first contact (n {len(C)}): time {q("t_contact", C)} s | D1 ran {q("D1_run", C)} yd, catcher ran {q("C_run", C)} yd | D1 heading error vs the catcher 0.5 s on: +0.2 s {q("herr2")} deg (>45: {share(lambda x: x.get("herr2", 0) > 45)}), +0.4 s {q("herr4")} deg (>45: {share(lambda x: x.get("herr4", 0) > 45)})')
print(f'(3) first contact: by D1 {share(lambda x: x.get("by_D1"), C)} | catcher speed then {q("c_speed", C)} | YAC at contact {q("yac_at", C)} | yards after contact {q("after", C)} (mean {mean("after", C)}; under 1 yd {share(lambda x: x["after"] < 1, C)}, over 3 yd {share(lambda x: x["after"] > 3, C)}) | no contact in 5 yd {share(lambda x: x["no5"])}')
Fa = [x for x in R if x['fast']]
print(f'(2b) D1 moving over 3 yd/s at the catch (n {len(Fa)}): heading error +0.2 s {q("herr2", Fa)} (>45: {share(lambda x: x.get("herr2", 0) > 45, Fa)}), +0.4 s {q("herr4", Fa)} (>45: {share(lambda x: x.get("herr4", 0) > 45, Fa)})' + (f' | requested direction, all: +0.2 s {q("rerr2")} (>45: {share(lambda x: x.get("rerr2", 0) > 45)}), +0.4 s {q("rerr4")} (>45: {share(lambda x: x.get("rerr4", 0) > 45)}); moving: +0.2 s {q("rerr2", Fa)}, +0.4 s {q("rerr4", Fa)}' if any('rerr2' in x for x in R) else ''))
print('(1b) D1 closing toward the catch point at mid-flight | at the catch, by split')
for nm, f in (('man', lambda x: x['mz'] == 'man'), ('zone', lambda x: x['mz'] == 'zone'), ('estimate yet (mid)', lambda x: x.get('est') is True), ('no estimate (mid)', lambda x: x.get('est') is False), ('saw the flight (mid)', lambda x: x.get('saw') is True), ('not seen (mid)', lambda x: x.get('saw') is False), ('man, saw hands (mid)', lambda x: x['mz'] == 'man' and x.get('hands') is True), ('man, no hands (mid)', lambda x: x['mz'] == 'man' and x.get('hands') is False)):
  S = [x for x in R if f(x)]
  if len(S) >= 5: print(f'   {nm}: n {len(S)} | mid {q("D1_mid_close", S)} | catch {q("D1_catch_close", S)} | YAC mean {mean("yac", S)}')
Z = [x for x in R if x['mz'] == 'zone' and 'land_err' in x]
if Z:
  print(f'(1c) zone D1 holding a flight picture at mid-flight (n {len(Z)}): arrival point off the true catch point {q("land_err", Z)} yd, short of it along the field {q("land_short", Z)} yd | goTo (spot reachable) branch {share(lambda x: x["goto"], Z)} | requested speed {q("req_speed", Z)} | mid closing {q("D1_mid_close", Z)}')
  for nm, f in (('goTo', lambda x: x['goto']), ('drive', lambda x: not x['goto'])):
    S = [x for x in Z if f(x)]
    if len(S) >= 5: print(f'   {nm}: n {len(S)} | requested speed {q("req_speed", S)} | mid closing {q("D1_mid_close", S)} | arrival point off {q("land_err", S)} | YAC mean {mean("yac", S)}')
T = [x for x in R if x['yac'] > 10]
print(f'(4) tail YAC > 10 (n {len(T)}): at the catch D2 {q("D2_dist", T)} yd closing {q("D2_close", T)}, D3 {q("D3_dist", T)} yd closing {q("D3_close", T)} | closest before 10 yd: D2 {q("tail_D2_min", T)}, D3 {q("tail_D3_min", T)} | no contact in 5 yd {share(lambda x: x["no5"], T)}')
