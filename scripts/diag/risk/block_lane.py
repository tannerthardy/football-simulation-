# A defender with a blocker in his lane after a short catch, one measurement code for the NFL (BDB 2025, nfl_yac_stage.py's
# population: drop-back short completions, screens out, passLength under 10) and the sim (lane-dump.ts JSON lines).
# 10 Hz, from the catch to +2.0 s. An episode: a defender within 8 yd of the catcher with an offensive body (not the
# catcher) between them (within 1.5 yd of the line from him to the catcher, beyond the first 0.5 yd and short of the
# catcher) and within 4 yd of him; one episode per defender, from its first frame. Per episode:
#  - his speed and closing rate on the blocker when the blocker is 2.0-2.5 yd away (the approach into the block);
#  - contact: the first frame within 1.0 yd of that blocker (or none); his speed then;
#  - engaged: frames from contact while the two stay within 1.2 yd (the block held), and the largest gap over the next
#    0.5 s;
#  - after: whether he gets within 1 yd of the catcher within 1.0 s of contact (shed and made the play).
# Sim rows also give his requested speed at the approach.
#   python3 -I scripts/diag/risk/block_lane.py nfl DATA_DIR WEEKS  |  python3 -I ... sim FILE.jsonl
import csv, sys, os, math, json, statistics as st
def plays_nfl(D, weeks):
  sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
  from population import nfl_population
  pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
  P = {}
  for r in csv.DictReader(open(f'{D}/plays.csv')):
    k = (r['gameId'], r['playId'])
    if k in keep and r['passResult'] == 'C' and r['passLength'] not in ('', 'NA') and float(r['passLength']) < 10: P[k] = r['possessionTeam']
  tgt = {}
  for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in P and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
  for w in weeks:
    fr = {}; ev = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
      k = (r['gameId'], r['playId'])
      if k not in tgt or r['displayName'] == 'football': continue
      f = int(r['frameId'])
      if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
      s, h = float(r['s']), math.radians(float(r['dir']))
      row = [float(r['x']), float(r['y']), s * math.sin(h), s * math.cos(h)]
      F = fr.setdefault(k, {}).setdefault(f, {'c': None, 'd': {}, 'o': {}})
      if r['nflId'] == tgt[k]: F['c'] = row
      elif r['club'] != P[k]: F['d'][r['nflId']] = row
      else: F['o'][r['nflId']] = row
    for k, e in ev.items():
      fc = e.get('pass_outcome_caught')
      if fc is None: continue
      frames = [fr[k].get(f) for f in range(fc, fc + 21)]
      frames = [F for F in frames if F is not None and F['c'] is not None]
      if len(frames) < 6: continue
      di = sorted(frames[0]['d']); oi = sorted(frames[0]['o'])
      frames = [{'c': F['c'], 'd': [F['d'].get(i) for i in di], 'o': [F['o'].get(i) for i in oi]} for F in frames]
      yield {'catch': 0, 'frames': frames}
def plays_sim(path):
  for line in open(path):
    if line.strip():
      p = json.loads(line); p['frames'] = p['frames'][p['catch']:p['catch'] + 21]; p['catch'] = 0; yield p
src = sys.argv[1]
plays = list(plays_nfl(sys.argv[2], sys.argv[3].split(',')) if src == 'nfl' else plays_sim(sys.argv[2]))
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
spd = lambda a: math.hypot(a[2], a[3])
E = []
for p in plays:
  F = p['frames']
  if any('o' not in fr for fr in F): continue
  seen = set()
  for i, fr in enumerate(F):
    C = fr['c']
    for j, x in enumerate(fr['d']):
      if x is None or j in seen or dist(x, C) > 8: continue
      dx, dy = C[0] - x[0], C[1] - x[1]; L = math.hypot(dx, dy) or 1e-6
      for b, o in enumerate(fr['o']):
        if o is None: continue
        t = ((o[0] - x[0]) * dx + (o[1] - x[1]) * dy) / (L * L)
        if t * L < 0.5 or t >= 1 or dist(o, x) > 4: continue
        if abs((o[0] - x[0]) * dy - (o[1] - x[1]) * dx) / L > 1.5: continue
        seen.add(j)
        ep = {'b': b}
        for k in range(i, len(F)):
          xd, ob = F[k]['d'][j], F[k]['o'][b]
          if xd is None or ob is None: break
          g = dist(xd, ob)
          if 'a_s' not in ep and g <= 2.5:
            bx, by = ob[0] - xd[0], ob[1] - xd[1]; B = math.hypot(bx, by) or 1e-6
            ep['a_s'] = spd(xd); ep['a_close'] = (xd[2] * bx + xd[3] * by) / B - (ob[2] * bx + ob[3] * by) / B
            if len(xd) >= 6 and xd[4] == xd[4]: ep['a_req'] = math.hypot(xd[4], xd[5])
          if 'c_k' not in ep and g <= 1.0:
            ep['c_k'] = k; ep['c_s'] = spd(xd)
            held = 0
            for m in range(k, len(F)):
              if F[m]['d'][j] is None or F[m]['o'][b] is None or dist(F[m]['d'][j], F[m]['o'][b]) > 1.2: break
              held += 1
            ep['held'] = held * 0.1
            ep['gap5'] = max(dist(F[m]['d'][j], F[m]['o'][b]) for m in range(k, min(len(F), k + 6)) if F[m]['d'][j] is not None and F[m]['o'][b] is not None)
            ep['made'] = any(F[m]['d'][j] is not None and dist(F[m]['d'][j], F[m]['c']) < 1 for m in range(k, min(len(F), k + 11)))
            break
        E.append(ep)
        break
def med(R, k, n=1):
  v = [r[k] for r in R if r.get(k) is not None]
  return f'{st.median(v):.{n}f}' if v else '-'
C = [e for e in E if 'c_k' in e]
print(f'{src}: plays {len(plays)} episodes {len(E)} | contact with the lane blocker {len(C) / max(1, len(E)):.2f}')
print(f'  approach (blocker 2.0-2.5 yd away): speed {med(E, "a_s")} yd/s closing on him {med(E, "a_close")}' + (f' requested {med(E, "a_req")}' if any('a_req' in e for e in E) else ''))
print(f'  at contact: speed {med(C, "c_s")} | engaged (within 1.2 yd) {med(C, "held")} s, share held 0.5 s+ {sum(1 for e in C if e["held"] >= 0.5) / max(1, len(C)):.2f} | largest gap in 0.5 s {med(C, "gap5")} yd (inside 1.2 yd {sum(1 for e in C if e["gap5"] <= 1.2) / max(1, len(C)):.2f})')
print(f'  reaches the catcher within 1 s of contact: {sum(1 for e in C if e["made"]) / max(1, len(C)):.2f}')
