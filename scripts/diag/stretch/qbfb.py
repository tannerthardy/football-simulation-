"""I-formation runs: the QB and the off-carrier back aligned behind him (FB):
min distance in the first 1.2 s and when, and both players' lateral offsets
(toward the carrier's eventual side, +) and depth at 0.3/0.6/0.9 s."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
path = sys.argv[1]
F = json.load(open('out/mechanics/nfl-formation.json')); ytg = json.load(open('out/mechanics/nfl-ytg.json'))
q = lambda v: f"{sorted(v)[len(v)//4]:.2f}/{sorted(v)[len(v)//2]:.2f}/{sorted(v)[3*len(v)//4]:.2f}" if v else '-'
dmin, tmin, rows, n = [], [], {t: ([], [], [], []) for t in (.3, .6, .9)}, 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if raw.get('source') != 'sim' and (F.get(raw['id']) != 'I_FORM' or ytg.get(raw['id'], 0) < 60): continue
    if raw.get('source') == 'sim' and raw['id'].split('/')[2] != 'i_pro_21': continue
    p = Play(raw); c = raw['carrier']
    qb = next((i for i, pl in enumerate(raw['players']) if pl['side'] == 'O' and pl['group'] == 'QB'), None)
    if qb is None or p.pos(qb, 0)[0] is None: continue
    q0 = p.pos(qb, 0)
    fbs = [i for i, pl in enumerate(raw['players']) if pl['side'] == 'O' and pl['group'] in ('RB', 'FB') and i != c
           and p.pos(i, 0)[0] is not None and abs(p.pos(i, 0)[1] - q0[1]) < 1.2 and 1.5 < q0[0] - p.pos(i, 0)[0] < 4.5]
    if not fbs: continue
    fb = fbs[0]; n += 1
    side = math.copysign(1, p.pos(c, p.k(1.5))[1] - p.pos(c, 0)[1]) if p.pos(c, p.k(1.5))[0] is not None else 1
    ds = [(p.dist(qb, fb, k), k * p.dt) for k in range(0, p.k(1.2) + 1) if p.pos(qb, k)[0] is not None and p.pos(fb, k)[0] is not None]
    d, t = min(ds); dmin.append(d); tmin.append(t)
    for tt in rows:
        k = p.k(tt); a, b = p.pos(qb, k), p.pos(fb, k)
        if a[0] is None or b[0] is None: continue
        rows[tt][0].append((a[1] - q0[1]) * side); rows[tt][1].append(q0[0] - a[0]); rows[tt][2].append((b[1] - q0[1]) * side); rows[tt][3].append(q0[0] - b[0])
print(f"{path.split('/')[-1][:24]:24s} I-form runs with an FB behind the QB: {n} | min QB-FB {q(dmin)} yd at {q(tmin)} s")
for tt, r in rows.items(): print(f"  {tt:.1f}s QB lateral {q(r[0])} depth {q(r[1])} | FB lateral {q(r[2])} depth {q(r[3])} (from the QB's snap spot; lateral + toward the run)")
