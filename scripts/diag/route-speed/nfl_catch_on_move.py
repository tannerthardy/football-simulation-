# NFL completion rate on passes to a receiver who is running at the ball's arrival, by his speed and by how much the ball is coming from behind him
# (BDB 2025 drop-backs, screens excluded, passLength 5-9 yd by default). At `pass_arrived`: the target's speed s, his velocity direction `dir` and shoulder
# orientation `o`, and the football's direction of travel `dir`. fromBehind(run) = cos of the angle between his velocity and the ball's travel (the sim's
# CATCH_SPEED term's argument: > 0.3 = the ball comes from behind his line of run); fromBehind(shoulders) = the same with `o` for his velocity.
#   python3 -I scripts/diag/route-speed/nfl_catch_on_move.py [LO HI] WEEK [WEEK ...]       (from the repo root; air-yards band LO..HI, default 5 10)
import csv, sys, math, collections as C
D = 'data/raw/bdb2025/big-data-bowl-data'
args = sys.argv[1:]
lo, hi = 5.0, 10.0
if len(args) >= 3 and '.' in args[0]: lo, hi = float(args[0]), float(args[1]); args = args[2:]
sys.path.insert(0, 'scripts/diag/pass-matrix')
from population import nfl_population
pop, _ = nfl_population(D); keep = {k for k, w in pop.items() if w == 'keep'}
res = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    k = (r['gameId'], r['playId'])
    if k in keep and r['passResult'] in ('C', 'I', 'IN') and r['passLength'] not in ('', 'NA') and lo <= float(r['passLength']) < hi: res[k] = r['passResult'] == 'C'
tgt = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in res and r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): tgt[k] = r['nflId']
rows = []
for w in args:
    fr = C.defaultdict(dict); arr = {}; ball = C.defaultdict(dict)
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in tgt: continue
        f = int(r['frameId'])
        if r['event'] == 'pass_arrived': arr.setdefault(k, f)
        if r['displayName'] == 'football':
            ball[k][f] = (float(r['x']), float(r['y']))   # the football has no `dir` in the tracking: its direction is taken from its positions
        elif r['nflId'] == tgt[k] and r['o'] not in ('', 'NA') and r['dir'] not in ('', 'NA'): fr[k].setdefault(f, {})['r'] = (float(r['s']), float(r['dir']), float(r['o']))
    for k, f in arr.items():
        F = fr[k].get(f); B = ball[k]
        if not F or 'r' not in F or (f - 1) not in B or (f + 1) not in B: continue
        s, rd, o = F['r']; bd = math.degrees(math.atan2(B[f + 1][0] - B[f - 1][0], B[f + 1][1] - B[f - 1][1])) % 360
        c = lambda a, b: math.cos(math.radians(a - b))
        rows.append((res[k], s, c(rd, bd), c(o, bd)))
print(f'passes {len(rows)} (air {lo:g}-{hi:g} yd), completion {100 * sum(r[0] for r in rows) / max(1, len(rows)):.1f}%')
def table(title, key, edges):
    print(f'\n{title}')
    for a, b in zip(edges[:-1], edges[1:]):
        S = [r for r in rows if a <= key(r) < b]
        if len(S) >= 30: print(f'  {a:5.1f} to {b:5.1f}: n {len(S):5d} completion {100 * sum(r[0] for r in S) / len(S):5.1f}%')
table('by his speed at arrival (yd/s)', lambda r: r[1], [0, 2, 4, 6, 8, 12])
for lo_s, hi_s, name in ((0, 4, 'standing / slow (s < 4)'), (4, 6, 's 4-6'), (6, 12, 's >= 6')):
    sub = [r for r in rows if lo_s <= r[1] < hi_s]
    rows_save, rows = rows, sub
    table(f'{name}: by cos(velocity, ball travel) (> 0.3 = ball coming from behind his line of run)', lambda r: r[2], [-1.01, -0.3, 0.3, 0.7, 1.01])
    table(f'{name}: by cos(shoulders, ball travel)', lambda r: r[3], [-1.01, -0.3, 0.3, 0.7, 1.01])
    rows = rows_save
