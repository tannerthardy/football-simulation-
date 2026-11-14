# Man trail on crossing routes, NFL side (BDB 2025 drop-backs, population.py, pff_manZone Man, routeRan CROSS by a WR or
# TE). His man = PFF's primary coverage matchup on him. The break: his heading turns 45+ deg off his stem (stem: his
# heading once over 3 yd/s, 0.4 s after the snap). At the break and +0.3 / +0.6 s: separation from his man, how far
# the man is behind him along his running line (+ behind) and across it; his speed 0.3 s before and 0.3 s after the
# break (v_in / v_out); by the defender's position and the receiver's.
#   python3 -I nfl_cross_trail.py data/raw/bdb2025/big-data-bowl-data 1,2,...
import csv, sys, os, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
MAN = {(r['gameId'], r['playId']) for r in csv.DictReader(open(f'{D}/plays.csv')) if r['pff_manZone'] == 'Man'}
cross, mm = {}, {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep or k not in MAN: continue
  if r['routeRan'] == 'CROSS' and POS.get(r['nflId']) in ('WR', 'TE'): cross.setdefault(k, []).append(r['nflId'])
  if r['pff_primaryDefensiveCoverageMatchupNflId'] not in ('', 'NA'): mm[(k, r['pff_primaryDefensiveCoverageMatchupNflId'].split('.')[0])] = r['nflId']
def ang(a, b): d = abs(a - b) % 360; return min(d, 360 - d)
rows = []
for w in weeks:
  fr = {}; ev = {}
  for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in cross or r['displayName'] == 'football': continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
    fr.setdefault((k, f), {})[r['nflId']] = r
  for k, e in ev.items():
    sn, th = e.get('ball_snap'), e.get('pass_forward')
    if sn is None: continue
    end = th if th is not None else sn + 40
    for tid in cross[k]:
      mid = mm.get((k, tid))
      if not mid: continue
      stem, brk = None, None
      for f in range(sn + 4, end + 1):
        R = fr.get((k, f))
        if not R or tid not in R: continue
        s, h = float(R[tid]['s']), float(R[tid]['dir'])
        if stem is None and s > 3: stem = h
        elif stem is not None and s > 2 and ang(h, stem) > 45: brk = f; break
      if brk is None: continue
      def geo(f):
        R = fr.get((k, f))
        if not R or tid not in R or mid not in R: return None
        a, b = R[tid], R[mid]; dx, dy = float(b['x']) - float(a['x']), float(b['y']) - float(a['y'])
        h = math.radians(float(a['dir'])); ux, uy = math.sin(h), math.cos(h)
        return math.hypot(dx, dy), -(dx * ux + dy * uy), abs(-dx * uy + dy * ux)
      sp = lambda f: float(fr[(k, f)][tid]['s']) if (k, f) in fr and tid in fr[(k, f)] else None
      g = [geo(brk), geo(brk + 3), geo(brk + 6)]
      if not g[0]: continue
      rows.append(dict(rpos=POS.get(tid), dpos=POS.get(mid), g=g, vin=sp(brk - 3), vout=sp(brk + 3)))
def q(v):
  v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else f"{v[len(v)//2]:.2f}"
def line(R, tag):
  out = [f"{tag}: n {len(R)}"]
  for i, t in enumerate(('break', '+0.3', '+0.6')):
    G = [r['g'][i] for r in R if r['g'][i]]
    out.append(f"{t} sep {q([x[0] for x in G])} behind {q([x[1] for x in G])} across {q([x[2] for x in G])}")
  out.append(f"v_in {q([r['vin'] for r in R])} v_out {q([r['vout'] for r in R])}")
  print(' | '.join(out))
line(rows, 'NFL man, CROSS (WR+TE)')
for rp in ('WR', 'TE'): line([r for r in rows if r['rpos'] == rp], f'  receiver {rp}')
for dp in ('CB', 'SS', 'FS', 'ILB', 'OLB'):
  R = [r for r in rows if r['dpos'] == dp]
  if len(R) >= 8: line(R, f'  defender {dp}')
