"""QB lane, 2026-11-14: how long the play-action fake is ridden. NFL common-format plays joined to plays.csv.
Play-action dropbacks; the back is the RB/FB nearest the QB at the mesh. Rows, under center and gun:
  mesh: when the QB and the back are closest, and how close;
  ride: how long they stay within 1.5 yd of each other (contiguous frames around the mesh);
  turned: how long the QB's body orientation is more than 90 deg off downfield in the first 2 s, and when it is
          last that far off (when his front comes back to the defense). Orientation is 0 = downfield in this format.
  blitz split: 5+ initial rushers against 4 or fewer (does he ride it less when they come).
Run: python3 -I nfl_pa_ride.py <nfl-plays.jsonl.gz> <datadir>"""
import sys, os, json, gzip, csv, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
plays, D = sys.argv[1], sys.argv[2]
P = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] == 'TRUE' and r['playAction'] == 'TRUE'}
rush = collections.Counter()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['wasInitialPassRusher'] in ('1', 'TRUE'): rush[f"{r['gameId']}-{r['playId']}"] += 1
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
R = collections.defaultdict(list)
for line in gzip.open(plays, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw['id'] not in P or not raw.get('xy'): continue
    p = Play(raw); qbs = p.who('O', 'QB')
    if not qbs or p.pos(qbs[0], 0)[0] is None: continue
    qb = qbs[0]; backs = [o for o in p.who('O') if p.players[o].get('pos') in ('RB', 'FB', 'HB') or p.players[o].get('group') == 'RB']
    backs = [b for b in backs if p.pos(b, 0)[0] is not None]
    if not backs: continue
    fw = raw['events'].get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end), int(round(2.5 / p.dt)))
    best = (99, 0, None)
    for b in backs:
        for k in range(kend + 1):
            a, c = p.pos(qb, k), p.pos(b, k)
            if a[0] is None or c[0] is None: continue
            d = math.hypot(a[0] - c[0], a[1] - c[1])
            if d < best[0]: best = (d, k, b)
    d, km, b = best
    if b is None or d > 2.0: continue
    def close(k):
        a, c = p.pos(qb, k), p.pos(b, k); return a[0] is not None and c[0] is not None and math.hypot(a[0] - c[0], a[1] - c[1]) <= 1.5
    k0 = km
    while k0 > 0 and close(k0 - 1): k0 -= 1
    k1 = km
    while k1 < kend and close(k1 + 1): k1 += 1
    ori = raw.get('o'); turned = last = None
    if ori:
        off = [k for k in range(min(kend, int(round(2.0 / p.dt))) + 1) if ori[k][qb] is not None and abs(math.atan2(math.sin(math.radians(ori[k][qb])), math.cos(math.radians(ori[k][qb])))) > math.pi / 2]
        turned = len(off) * p.dt; last = (off[-1] * p.dt) if off else 0.0
    aln = 'gun' if p.pos(qb, 0)[0] < -3 else 'under'; bl = '5+' if rush[raw['id']] >= 5 else '<=4'
    for key in (aln, f'{aln} {bl}'):
        R[key].append((km * p.dt, d, (k1 - k0 + 1) * p.dt if close(km) else 0.0, turned, last, -p.pos(qb, km)[0]))
for key in sorted(R):
    v = R[key]; col = lambda i: [x[i] for x in v]
    print(f"{key:10s} n {len(v):4d} | mesh at p25/50/75 {q(col(0), .25):.1f}/{q(col(0)):.1f}/{q(col(0), .75):.1f} s, {q(col(1)):.1f} yd apart, QB {q(col(5)):.1f} yd deep | within 1.5 yd for p25/50/75 {q(col(2), .25):.1f}/{q(col(2)):.1f}/{q(col(2), .75):.1f} s | body turned away from downfield {q(col(3), .25):.1f}/{q(col(3)):.1f}/{q(col(3), .75):.1f} s of the first 2 s, last at {q(col(4)):.1f} s")
