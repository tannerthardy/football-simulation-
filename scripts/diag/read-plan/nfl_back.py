# The back on NFL drop-back passes (population.py), BDB 2025 weeks 1-9 player_play + plays, tracking weeks given for
# release timing: how often the back runs a route at all, which route, his share of targets and when he is thrown
# to, and when he leaves the backfield (first frame he is past the line of scrimmage, or 3 yd lateral of where he
# started).   python3 -I scripts/diag/read-plan/nfl_back.py data/raw/bdb2025/big-data-bowl-data 1,2
import csv, sys, collections as C, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pass-matrix'))
from population import nfl_population
D = sys.argv[1]; weeks = sys.argv[2].split(',') if len(sys.argv) > 2 else []
pop, _ = nfl_population(D)
keep = {k for k, w in pop.items() if w == 'keep'}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
ttt = {(r['gameId'], r['playId']): r['timeToThrow'] for r in csv.DictReader(open(f'{D}/plays.csv'))}
backs = C.defaultdict(list); tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
  k = (r['gameId'], r['playId'])
  if k not in keep: continue
  if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
  if pos.get(r['nflId']) in ('RB', 'FB'): backs[k].append((r['nflId'], r['wasRunningRoute'] in ('1', 'TRUE', 'True'), r['routeRan']))
plays = [k for k in keep if backs.get(k)]
n = len(plays); ran = sum(1 for k in plays if any(b[1] for b in backs[k]))
targeted = [k for k in keep if k in tgt]
toBack = [k for k in targeted if pos.get(tgt[k]) in ('RB', 'FB')]
print(f"NFL drop-back passes {len(keep)}; with a back on the field {n}; the back runs a route on {ran/n:.3f} of those")
print(f"targets to backs {len(toBack)/len(targeted):.3f} of targets ({len(toBack)}/{len(targeted)})")
def q(v, p): v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
tt = [float(ttt[k]) for k in toBack if ttt[k] not in ('', 'NA')]
print(f"time to throw to a back p25/p50/p75 {q(tt,.25):.2f}/{q(tt,.5):.2f}/{q(tt,.75):.2f}")
rt = C.Counter(b[2] for k in plays for b in backs[k] if b[1]); tr = C.Counter()
for k in toBack:
  for b in backs[k]:
    if b[0] == tgt[k]: tr[b[2]] += 1
print("back's route when he runs one (share of routes run / share of back targets):")
for r, c in rt.most_common(): print(f"  {r:10s} {c/sum(rt.values()):.3f} / {tr[r]/max(1,sum(tr.values())):.3f}")
if weeks:
  rel = []
  want = {(k, b[0]) for k in plays for b in backs[k] if b[1]}
  for w in weeks:
    snap = {}; ball = {}; tr = C.defaultdict(dict); dirn = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
      k = (r['gameId'], r['playId'])
      if k not in keep: continue
      f = int(r['frameId'])
      if r['event'] == 'ball_snap': snap.setdefault(k, f)
      if r['displayName'] == 'football': ball[(k, f)] = float(r['x']); continue
      key = (k, r['nflId'])
      if key in want: tr[key][f] = (float(r['x']), float(r['y'])); dirn[k] = 1 if r['playDirection'] == 'right' else -1
    for key, T in tr.items():
      k = key[0]
      if k not in snap or (k, snap[k]) not in ball or snap[k] not in T: continue
      los, s0, sg = ball[(k, snap[k])], snap[k], dirn[k]
      x0, y0 = T[s0]
      for f in sorted(T):
        if f <= s0: continue
        x, y = T[f]
        if (x - los) * sg >= 0 or abs(y - y0) >= 3: rel.append((f - s0) / 10); break
  print(f"back's release (past the line or 3 yd lateral), weeks {','.join(weeks)}: p25/p50/p75 {q(rel,.25):.2f}/{q(rel,.5):.2f}/{q(rel,.75):.2f} s (n {len(rel)})")
