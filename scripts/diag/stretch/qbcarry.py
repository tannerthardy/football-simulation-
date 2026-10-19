"""QB motion through the exchange, one operator for NFL tracking and sim
common plays (under center by default): his velocity just before the handoff
and 0.25 / 0.5 s after it, x upfield, y toward the side the back is on at the
handoff (+ = toward the back), and how far his motion turns.
usage: qbcarry.py FILE FAMILY [NFL_FORMS=SINGLEBACK,I_FORM]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
path, fam = sys.argv[1], sys.argv[2]
ytg = json.load(open('out/mechanics/nfl-ytg.json'))
F = json.load(open('out/mechanics/nfl-formation.json'))
q = lambda v: f"{sorted(v)[len(v)//4]:.2f}/{sorted(v)[len(v)//2]:.2f}/{sorted(v)[3*len(v)//4]:.2f}" if v else '-'
rows = {k: [] for k in ('pre_x', 'pre_y', 'p25_x', 'p25_y', 'p5_x', 'p5_y', 'turn')}
n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    if raw.get('source') != 'sim' and (ytg.get(raw['id'], 0) < 60 or F.get(raw['id']) not in tuple((sys.argv[3] if len(sys.argv) > 3 else 'SINGLEBACK,I_FORM').split(','))): continue
    p = Play(raw); c = raw['carrier']; h = (raw.get('events') or {}).get('handoff')
    if h is None or raw['players'][c]['group'] != 'RB' or not p.live(h + .6): continue
    qb = next((i for i, pl in enumerate(raw['players']) if pl['side'] == 'O' and pl['group'] == 'QB'), None)
    if qb is None: continue
    k = p.k(h)
    if p.dist(qb, c, k) > 2.5: continue
    side = math.copysign(1, p.pos(c, k)[1] - p.pos(qb, k)[1])
    def v(t):
        (x0, y0), (x1, y1) = p.pos(qb, p.k(t - .05)), p.pos(qb, p.k(t + .05))
        if x0 is None or x1 is None: return None
        dt = (p.k(t + .05) - p.k(t - .05)) * p.dt
        if dt <= 0: return None
        return ((x1 - x0) / dt, (y1 - y0) / dt * side)
    a, b, e = v(h - .1), v(h + .25), v(h + .5)
    if None in (a, b, e): continue
    n += 1
    rows['pre_x'].append(a[0]); rows['pre_y'].append(a[1]); rows['p25_x'].append(b[0]); rows['p25_y'].append(b[1]); rows['p5_x'].append(e[0]); rows['p5_y'].append(e[1])
    if math.hypot(*a) > .5 and math.hypot(*b) > .5:
        rows['turn'].append(abs(math.degrees(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]))))
sp = lambda X, Y: [math.hypot(x, y) for x, y in zip(rows[X], rows[Y])]
print(f"{path.split('/')[-1][:22]:22s} {fam} n {n} | QB v pre x {q(rows['pre_x'])} y {q(rows['pre_y'])} speed {q(sp('pre_x','pre_y'))} | +0.25 x {q(rows['p25_x'])} y {q(rows['p25_y'])} speed {q(sp('p25_x','p25_y'))} | +0.5 x {q(rows['p5_x'])} y {q(rows['p5_y'])} speed {q(sp('p5_x','p5_y'))} | turn {q(rows['turn'])} deg")
