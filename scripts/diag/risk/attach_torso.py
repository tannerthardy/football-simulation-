"""Deep-seat torso column (Integration for Defense, 2026-11-15): where a deep-seat zone defender's torso points at the release, split by whether the route he is
carrying is real, per coverage family, on attach.py's pre-release records (same files, same coverage-defender and seat rules; imported, not copied).
Deep seat = 10+ yd past the line at the release (halves, thirds, quarters; Cover-6 is listed apart). Carrying a vertical: an eligible receiver (WR/TE/RB)
within 12 yd of him laterally at the release is past 10 yd downfield and still climbing (downfield speed over the last 0.5 s >= CLIMB yd/s).
Rows: torso off the QB at the release (median, share within 30 and within 90 deg), his speed, and his motion against his torso over the last 0.5 s:
  pedal = velocity points back along his torso (angle between his velocity and his torso heading > 110 deg), run = along it (< 70), side = between;
  among defenders moving faster than 1 yd/s. Torso heading: BDB `o` (sim: body facing).
usage: python3 -I scripts/diag/risk/attach_torso.py name=FILE.jsonl.gz [...]   [CHECK=12 prints that many carrying plays for a hand check]"""
import sys, os, gzip, json, math, random, statistics as st
args = sys.argv[1:]; sys.argv = [sys.argv[0]]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import attach
W, CLIMB = attach.W, 2.0
STRICT = float(os.environ.get('STRICT_DEPTH', 0))   # >0: the receiver must also be no more than this many yd shallower than the defender (a vertical that reaches his zone) and climb >= 3 yd/s
def q(v, p):
  v = sorted(v); return v[min(len(v) - 1, int(p * (len(v) - 1) + 0.5))] if v else float('nan')
def rows(path):
  out = []
  for line in gzip.open(path, 'rt'):
    p = json.loads(line); F = attach.fam(p.get('coverage'))
    if p.get('manzone') == 'Man' or F is None: continue
    R, C, xy, pl, fo = p['release'], p['catch'], p['xy'], p['players'], p.get('fo')
    if R < W or C >= len(xy) or not fo: continue
    at = lambda f, j: (xy[f][2 * j], xy[f][2 * j + 1]) if xy[f][2 * j] is not None and xy[f][2 * j + 1] is not None else None
    qq = at(R, p['qb'])
    if qq is None: continue
    elig = [j for j, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB')]
    for j, x in enumerate(pl):
      if x['side'] != 'D' or x['group'] == 'DL': continue
      a0, a1 = at(R - W, j), at(R, j)
      if a0 is None or a1 is None or a1[0] < 10 or fo[R][j] is None: continue
      v = ((a1[0] - a0[0]) / (W * 0.1), (a1[1] - a0[1]) / (W * 0.1)); sp = math.hypot(*v)
      b = math.atan2(qq[1] - a1[1], qq[0] - a1[0]); off = abs(math.degrees((fo[R][j] - b + math.pi) % (2 * math.pi) - math.pi))
      mot = None
      if sp > 1:
        ang = abs(math.degrees((math.atan2(v[1], v[0]) - fo[R][j] + math.pi) % (2 * math.pi) - math.pi))
        mot = 'pedal' if ang > 110 else 'run' if ang < 70 else 'side'
      carry = []
      for k in elig:
        r0, r1 = at(R - W, k), at(R, k)
        if r0 is None or r1 is None or abs(r1[1] - a1[1]) > 12 or r1[0] < 10: continue
        vd = (r1[0] - r0[0]) / (W * 0.1)
        if STRICT and (r1[0] < a1[0] - STRICT or vd < 3): continue
        if vd >= CLIMB: carry.append((k, r1[0], vd, r1[1]))
      out.append(dict(F=F, id=p['id'], j=j, off=off, sp=sp, mot=mot, carry=bool(carry), cinfo=carry, pos=a1))
  return out
def line(nm, R):
  o = [r['off'] for r in R]; m = [r['mot'] for r in R if r['mot']]
  sh = lambda k: f'{sum(1 for x in m if x == k) / max(1, len(m)):.2f}'
  return (f'  {nm:<26} n {len(R):5d} | torso off QB at release p50 {q(o, .5):5.1f} (p25 {q(o, .25):5.1f} p75 {q(o, .75):5.1f}) deg, within 30 {sum(1 for x in o if x <= 30) / len(o):.2f} within 90 {sum(1 for x in o if x <= 90) / len(o):.2f}'
          f' | speed p50 {q([r["sp"] for r in R], .5):4.1f} | moving >1 (n {len(m)}): pedal {sh("pedal")} side {sh("side")} run {sh("run")}')
for a in args:
  name, path = a.split('=', 1); R = rows(path); print(f'{name}: deep-seat coverage defenders {len(R)} (carrying a vertical: {sum(r["carry"] for r in R)})')
  for F in ('Cover-2', 'Cover-3', 'Quarters', 'Cover-6'):
    T = [r for r in R if r['F'] == F]
    if not T: continue
    for nm, S in ((f'{F} carrying', [r for r in T if r['carry']]), (f'{F} not carrying', [r for r in T if not r['carry']])):
      if S: print(line(nm, S))
  T = [r for r in R if r['F'] != 'Cover-6']
  for nm, S in (('halves/thirds/quarters carrying', [r for r in T if r['carry']]), ('  ... not carrying', [r for r in T if not r['carry']])):
    if S: print(line(nm, S))
  n = int(os.environ.get('CHECK', 0))
  if n:
    random.seed(5); pick = random.sample([r for r in R if r['carry']], n)
    print(f'hand check: {n} random carrying defenders (play id, family, defender x/y at release, receiver x, downfield speed, y; off-QB deg)')
    for r in pick: print(f'    {r["id"]} {r["F"]:8s} d ({r["pos"][0]:.1f},{r["pos"][1]:.1f}) off {r["off"]:.0f} | receivers ' + '; '.join(f'x {c[1]:.1f} vx {c[2]:.1f} y {c[3]:.1f}' for c in r['cinfo']))
