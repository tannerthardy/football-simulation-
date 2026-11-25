# The last defender (Defense's row): completions with exactly ONE defender ahead of the catch, within 10 yd downfield and 10 yd laterally (so a catcher who has one man to beat).
# One operator over the common play format (xy at 10 Hz, offence attacks +x) for the NFL (BDB 2025, nfl-plays + nfl-ball for the result) and the sim (sim-plays, ball events).
# For that defender, from the catch (frame pass_arrived) until the play ends (events.end): his speed at the catch, at +0.5 s and at his closest approach to the carrier; his heading off the
# line from him to the carrier at +0.5 s and at closest approach (0 = running straight at him; velocity over +-0.1 s); how close he gets (min distance, centre to centre, yd); the carrier's own speed at +0.5 s;
# and whether the carrier is brought down within 0.5 s.  python3 -I last_defender.py nfl=PLAYS.jsonl.gz,BALL.jsonl.gz sim=PLAYS.jsonl.gz
import sys, gzip, json, math, statistics as st
def jl(p):
    for l in gzip.open(p, 'rt'): yield json.loads(l)
def at(P, f, j):
    x, y = P['xy'][f][2 * j], P['xy'][f][2 * j + 1]
    return None if x is None or y is None else (x, y)
def vel(P, f, j):
    a, b = at(P, f - 1, j), at(P, f + 1, j)
    return None if a is None or b is None else ((b[0] - a[0]) / (2 * P['dt']), (b[1] - a[1]) / (2 * P['dt']))
def load(spec):
    kind, files = spec.split('=', 1); files = files.split(','); out = []
    if kind.startswith('nfl'):
        ball = {b['id']: b for b in jl(files[1])}
        for p in jl(files[0]):
            b = ball.get(p['id'])
            if p['kind'] == 'pass' and b and p.get('target') is not None and b.get('passResult') == 'C' and 'pass_arrived' in p['events']: out.append(p)
    else:
        for p in jl(files[0]):
            lab = p.get('labels', {}); ev = lab.get('ballEvents', [])
            if p['kind'] == 'pass' and p.get('target') is not None and 'pass_arrived' in p['events'] and ('catch' in ev or 'secure' in ev) and not lab.get('interception'): out.append(p)
    return kind, out
def row(P):
    C = int(round(P['events']['pass_arrived'] / P['dt'])); end = int(round(P['events'].get('end', 99) / P['dt'])); n = len(P['xy'])
    t = P['target']; c0 = at(P, C, t)
    if c0 is None or C + 8 >= n: return None
    ds = [j for j, x in enumerate(P['players']) if x['side'] == 'D']
    ahead = [j for j in ds if at(P, C, j) and 0 < at(P, C, j)[0] - c0[0] <= 10 and abs(at(P, C, j)[1] - c0[1]) <= 10]
    if len(ahead) != 1: return None
    d = ahead[0]; last = min(end, n - 2)
    if last < C + 6: return None
    best = (1e9, C)
    for f in range(C, last + 1):
        a, b = at(P, f, d), at(P, f, t)
        if a and b: best = min(best, (math.hypot(a[0] - b[0], a[1] - b[1]), f))
    dmin, fc = best
    def state(f):
        a, b, v, w = at(P, f, d), at(P, f, t), vel(P, f, d), vel(P, f, t)
        if None in (a, b, v, w): return None
        sp = math.hypot(*v); ang = None
        if sp > 0.5:
            los = (b[0] - a[0], b[1] - a[1]); ang = abs(math.degrees((math.atan2(v[1], v[0]) - math.atan2(los[1], los[0]) + math.pi) % (2 * math.pi) - math.pi))
        return dict(sp=sp, ang=ang, csp=math.hypot(*w), gap=math.hypot(a[0] - b[0], a[1] - b[1]))
    s0, s5, sc = state(C), state(min(C + 5, last)), state(fc)
    if None in (s0, s5, sc): return None
    return dict(dmin=dmin, sp0=s0['sp'], sp5=s5['sp'], spc=sc['sp'], ang5=s5['ang'], angc=sc['ang'], gap0=s0['gap'], csp5=s5['csp'], tackled5=end <= C + 5, tc=(fc - C) * P['dt'])
def q(v, p): v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
for spec in sys.argv[1:]:
    kind, plays = load(spec); R = [r for r in (row(p) for p in plays) if r]
    print(f'== {kind}: {len(plays)} completions, {len(R)} with exactly one defender ahead of the catch (within 10 yd downfield and laterally)')
    for nm, k in (('gap at the catch (yd)', 'gap0'), ('his speed at the catch', 'sp0'), ('his speed at +0.5 s', 'sp5'), ('his speed at closest approach', 'spc'), ('heading off the line to the carrier at +0.5 s (deg)', 'ang5'),
                  ('heading off the line to the carrier at closest approach (deg)', 'angc'), ('closest distance (yd)', 'dmin'), ('time of closest approach after the catch (s)', 'tc'), ('carrier speed at +0.5 s', 'csp5')):
        v = [r[k] for r in R]; print(f'  {nm:62s} p25 {q(v, .25):5.1f} median {q(v, .5):5.1f} p75 {q(v, .75):5.1f}')
    print(f'  closest approach under 1 yd: {sum(r["dmin"] < 1 for r in R) / len(R):.2f}  1-2 yd: {sum(1 <= r["dmin"] < 2 for r in R) / len(R):.2f}  2-5 yd: {sum(2 <= r["dmin"] < 5 for r in R) / len(R):.2f}  5+ yd: {sum(r["dmin"] >= 5 for r in R) / len(R):.2f}; carrier down within 0.5 s of the catch: {sum(r["tackled5"] for r in R) / len(R):.2f}')
