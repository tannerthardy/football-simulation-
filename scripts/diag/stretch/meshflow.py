"""The exchange and the back's first second with the ball, one operator for
NFL tracking and sim common plays. Runs with a labelled handoff and a
running-back carrier: his speed at the handoff and 0.5 / 1.0 s later, the
QB-to-carrier distance over the 0.8 s after the handoff (closest approach),
the share of runs where the QB is within 1.2 yd of the carrier during it,
the carrier's upfield progress 1.0 s after the handoff, and how smooth his
path is from the handoff to +1.5 s: total heading change of his motion
(0.2 s chords, while above 1.5 yd/s) and lateral reversals (his lateral
velocity changing sign above 0.5 yd/s).
usage: meshflow.py FILE [--ytg60] [--concept C (sim id prefix or NFL label; toss excluded)]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path, concept = sys.argv[1], opt('--concept')
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
LABEL = {'oz': 'OUTSIDE ZONE', 'iz': 'INSIDE ZONE', 'duo': 'MAN'}
q = lambda v: f"{sorted(v)[len(v)//4]:.2f}/{sorted(v)[len(v)//2]:.2f}/{sorted(v)[3*len(v)//4]:.2f}" if v else '-'
s0, s5, s10, near, close, up, n = [], [], [], 0, [], [], 0
turn, rev, qb5 = [], [], []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    nfl = (raw.get('cell') or {}).get('concept')
    if concept and not (str(raw['id']).startswith(concept + '/') or nfl == LABEL.get(concept, concept.upper())): continue
    p = Play(raw); c = raw['carrier']; h = (raw.get('events') or {}).get('handoff')
    if h is None or raw['players'][c]['group'] != 'RB' or not p.live(h + 1.0): continue
    qb = next((i for i, pl in enumerate(raw['players']) if pl['side'] == 'O' and pl['group'] == 'QB'), None)
    if qb is None: continue
    k = p.k(h)
    if p.dist(qb, c, k) > 2.5: continue  # pitches/tosses
    n += 1
    s0.append(p.speed(c, k)); s5.append(p.speed(c, p.k(h + .5))); s10.append(p.speed(c, p.k(h + 1.0)))
    ds = [p.dist(qb, c, kk) for kk in range(k + 1, p.k(h + .8) + 1)]
    close.append(min(ds)); near += any(d < 1.2 for d in ds)
    up.append(p.pos(c, p.k(h + 1.0))[0] - p.pos(c, k)[0])
    qb5.append(p.dist(qb, c, p.k(h + .5)))
    end = min(p.k(h + 1.5), p.frames - 3, int(p.end / p.dt + 1e-9) - 2)
    hd, tot, last, flips = None, 0.0, 0, 0
    for kk in range(k, end + 1, 2):
        (x0, y0), (x1, y1) = p.pos(c, kk), p.pos(c, kk + 2)
        if x0 is None or x1 is None: continue
        vx, vy = (x1 - x0) / (2 * p.dt), (y1 - y0) / (2 * p.dt)
        if math.hypot(vx, vy) > 1.5:
            a = math.atan2(vy, vx)
            if hd is not None: tot += abs(math.atan2(math.sin(a - hd), math.cos(a - hd)))
            hd = a
        sg = (vy > .5) - (vy < -.5)
        if sg and last and sg != last: flips += 1
        if sg: last = sg
    turn.append(math.degrees(tot)); rev.append(flips)
print(f"{path.split('/')[-1][:24]:24s} {concept or 'all'} runs {n} | back speed at handoff {q(s0)} -> +0.5s {q(s5)} -> +1.0s {q(s10)} yd/s | "
      f"upfield in 1 s {q(up)} yd | QB at +0.5 s {q(qb5)} yd | path turn to +1.5 s {q(turn)} deg, lateral reversals {q(rev)}")
