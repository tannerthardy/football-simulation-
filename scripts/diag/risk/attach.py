"""Task 117: what each zone defender is moving toward in the half second before the ball leaves. One operator over
pre-release records (pre_release_nfl.py from BDB 2025 with cov=Zone; attach-export.ts from the sim, the same format:
positions snap..catch at 10 Hz, offence attacks +x from the line, QB facing qbf, release / catch frames, target,
pff_passCoverage or the sim's coverage id). Completed zone passes.
Coverage defenders: defensive players (not DL) at least 1.5 yd past the line at the release. Seat at the release:
deep (10+ yd past the line) or underneath. His velocity over the last 0.5 s before the release (positions R-5..R).
Toward each candidate, the component of that velocity along the unit vector from him (at R-5) to:
  target  the targeted receiver where he catches it (the eventual target; what Integration's D1 drift row measured)
  eyes    the point at his depth on the QB's facing ray (QB facing averaged over the window); none if the ray runs away
  route   for underneath: the nearest eligible (WR/TE/RB) at R-5; for deep: the deepest eligible within 12 yd of him
          laterally ("the deepest route in his zone"); and with it his velocity along that receiver's own velocity
          (carrying it), the gap between their downfield speeds, and how much deeper the route is than he is (negative:
          he is deeper)
facing: his body orientation against the bearing to the QB at R-5 and at the release (share within 30 / 90 deg at the
  release): is he looking at the passer during the drop.
best: among the three directions, the one his velocity is most aligned with (speed > 1 yd/s; 'none' when even that one is
  more than 60 deg off his velocity, e.g. a deep defender bailing away from all three), as shares.
Rows by family (Cover-2 / Cover-3 / Quarters / Cover-6, from pff_passCoverage or the sim id) and seat, plus D1
(nearest defender to the catch point at the catch) by seat. NFL first if given.
usage: python3 -I scripts/diag/risk/attach.py name=FILE.jsonl.gz [name=FILE.jsonl.gz ...]"""
import sys, json, gzip, math, statistics as st
def fam(c):
  c = (c or '').lower().replace('-', '').replace('_', '').replace(' ', '')
  for k, v in (('cover3', 'Cover-3'), ('tampa', 'Cover-2'), ('cover2man', None), ('2man', None), ('cover2', 'Cover-2'), ('quarters', 'Quarters'),
               ('cover4', 'Quarters'), ('cover6', 'Cover-6'), ('cover9', 'Cover-6'), ('cover1', 'Cover-1'), ('cover0', None)):
    if c.startswith(k): return v
  return None
W = 5
def rows_of(path):
  out = []
  for line in gzip.open(path, 'rt'):
    p = json.loads(line); F = fam(p.get('coverage'))
    if p.get('manzone') == 'Man' or F is None: continue
    R, C, xy, pl = p['release'], p['catch'], p['xy'], p['players']
    if R < W or C >= len(xy): continue
    at = lambda f, j: (xy[f][2 * j], xy[f][2 * j + 1]) if xy[f][2 * j] is not None and xy[f][2 * j + 1] is not None else None
    tc = at(C, p['target'])
    if tc is None: continue
    qf = [p['qbf'][f] for f in range(R - W, R + 1) if f < len(p['qbf']) and p['qbf'][f] is not None]
    qa = math.atan2(sum(math.sin(a) for a in qf), sum(math.cos(a) for a in qf)) if qf else None
    q = at(R - 3, p['qb'])
    elig = [j for j, x in enumerate(pl) if x['side'] == 'O' and x['group'] in ('WR', 'TE', 'RB')]
    dists = {j: math.hypot(at(C, j)[0] - tc[0], at(C, j)[1] - tc[1]) for j, x in enumerate(pl) if x['side'] == 'D' and at(C, j)}
    d1 = min(dists, key=dists.get) if dists else None
    for j, x in enumerate(pl):
      if x['side'] != 'D' or x['group'] == 'DL': continue
      a0, a1 = at(R - W, j), at(R, j)
      if a0 is None or a1 is None or a1[0] < 1.5: continue
      v = ((a1[0] - a0[0]) / (W * 0.1), (a1[1] - a0[1]) / (W * 0.1)); sp = math.hypot(*v)
      seat = 'deep' if a1[0] >= 10 else 'under'
      def comp(pt):
        if pt is None: return None
        dx, dy = pt[0] - a0[0], pt[1] - a0[1]; n = math.hypot(dx, dy)
        return None if n < 0.5 else (v[0] * dx + v[1] * dy) / n
      eye = None
      if qa is not None and q is not None and math.cos(qa) > 0.05:
        s = (a0[0] - q[0]) / math.cos(qa)
        if s > 0: eye = (a0[0], q[1] + s * math.sin(qa))
      rj = None
      if seat == 'under':
        c = [(math.hypot(at(R - W, k)[0] - a0[0], at(R - W, k)[1] - a0[1]), k) for k in elig if at(R - W, k)]
        rj = min(c)[1] if c else None
      else:
        c = [(at(R - W, k)[0], k) for k in elig if at(R - W, k) and abs(at(R - W, k)[1] - a0[1]) <= 12]
        rj = max(c)[1] if c else None
      rp = at(R - W, rj) if rj is not None else None
      rv = None
      if rj is not None and at(R, rj): rv = ((at(R, rj)[0] - rp[0]) / (W * 0.1), (at(R, rj)[1] - rp[1]) / (W * 0.1))
      cT, cE, cR = comp(tc), comp(eye), comp(rp)
      carry = None if rv is None or math.hypot(*rv) < 1 else (v[0] * rv[0] + v[1] * rv[1]) / math.hypot(*rv)
      best = None
      if sp > 1:
        cand = {k: c / sp for k, c in (('target', cT), ('eyes', cE), ('route', cR)) if c is not None}
        best = max(cand, key=cand.get) if cand else None
        if best is not None and cand[best] < 0.5: best = 'none'
      # Facing during the drop: his body orientation (BDB 'o'; the sim's body facing, its eyes when HEAD is off) against
      # the bearing to the QB, at R-5 and at the release; the head where a record carries one is not used (NFL has none).
      def off_qb(f):
        fo = p.get('fo'); qq = at(f, p['qb']); me = at(f, j)
        if not fo or f >= len(fo) or fo[f][j] is None or qq is None or me is None: return None
        b = math.atan2(qq[1] - me[1], qq[0] - me[0]); return abs(math.degrees((fo[f][j] - b + math.pi) % (2 * math.pi) - math.pi))
      fq0, fq1 = off_qb(R - W), off_qb(R)
      out.append(dict(F=F, seat=seat, fq0=fq0, fq1=fq1, d1=j == d1, sp=sp, bail=v[0], lat=abs(v[1]), T=cT, E=cE, Rt=cR, carry=carry,
                      dgap=None if rv is None else rv[0] - v[0], best=best, depth=a1[0], rdepth=None if rp is None else rp[0] - a0[0]))
  return out
def med(R, k):
  v = [r[k] for r in R if r[k] is not None]
  return f'{st.median(v):5.1f}' if v else '    -'
def fsh(R, lim):
  v = [r['fq1'] for r in R if r['fq1'] is not None]
  return f'{sum(1 for x in v if x <= lim) / len(v):.2f}' if v else '-'
def line(nm, R):
  B = [r for r in R if r['best']]
  sh = lambda k: f'{sum(1 for r in B if r["best"] == k) / len(B):.2f}' if B else '-'
  return (f'  {nm:<22} n {len(R):5d} | speed {med(R, "sp")} bail {med(R, "bail")} lateral {med(R, "lat")} | toward target {med(R, "T")} eyes {med(R, "E")} route {med(R, "Rt")}'
          f' | facing off the QB at -0.5 s {med(R, "fq0")} at release {med(R, "fq1")} deg (within 30 {fsh(R, 30)}, 90 {fsh(R, 90)})'
          f' | carry route {med(R, "carry")} route-minus-him downfield {med(R, "dgap")} (route {med(R, "rdepth")} yd deeper) | best: target {sh("target")} eyes {sh("eyes")} route {sh("route")} none {sh("none")}')
for arg in sys.argv[1:]:
  name, path = arg.split('=', 1); R = rows_of(path)
  print(f'{name}: coverage defenders {len(R)}')
  for F in ('Cover-2', 'Cover-3', 'Quarters', 'Cover-6'):
    for seat in ('under', 'deep'):
      T = [r for r in R if r['F'] == F and r['seat'] == seat]
      if T: print(line(f'{F} {seat}', T))
  for seat in ('under', 'deep'):
    T = [r for r in R if r['d1'] and r['seat'] == seat]
    if T: print(line(f'D1 {seat}', T))
