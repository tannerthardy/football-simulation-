"""Zone completions 10+ air (BDB 2025): every defender deeper than the catcher (dx > +1 yd) and 3-10 yd from him at the
catch. At +0.5 s: angle of his velocity to the carrier's spot now and to the carrier's spot at +1.5 s (ahead); his speed;
carrier speed; whether he comes within 1 yd before the end. Normalised to +x."""
import csv, sys, json, math
from collections import defaultdict
D = '/home/user/def-alignment/data/raw/bdb2025/big-data-bowl-data'
weeks = [int(w) for w in sys.argv[1:-1]]; OUT = sys.argv[-1]
ZONE = {'Cover-2', 'Cover-3', 'Cover-3 Seam', 'Quarters', 'Cover 6-Left', 'Cover-6 Right', 'Cover-3 Cloud Left', 'Cover-3 Cloud Right', 'Cover-3 Double Cloud', 'Cover-2 Sink'}
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['passResult'] == 'C' and r['pff_passCoverage'] in ZONE and r.get('passLength') not in (None, '', 'NA') and float(r['passLength']) >= 10 and r.get('playNullifiedByPenalty') != 'Y':
        plays[(r['gameId'], r['playId'])] = r['pff_passCoverage']
rec = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r['hadPassReception'] == '1': rec[k] = r['nflId']
END = ('tackle', 'out_of_bounds', 'touchdown', 'fumble', 'qb_slide', 'safety')
def ang(vx, vy, tx, ty):
    a = math.degrees(math.atan2(vy, vx) - math.atan2(ty, tx))
    while a > 180: a -= 360
    while a < -180: a += 360
    return abs(a)
out = []
for w in weeks:
    cur = None; F = defaultdict(dict); club = {}; evs = {}
    def flush():
        if cur is None or cur not in rec: return
        c = rec[cur]; kc = evs.get('pass_outcome_caught')
        ends = [evs[e] for e in END if e in evs and kc is not None and evs[e] > kc]
        if kc is None or not ends or c not in F: return
        ke = min(ends); left = F[c][kc]['dir'] == 'left'
        def P(n, f):
            q = F[n].get(f)
            if not q: return None
            x, y = float(q['x']), float(q['y']); return (120 - x, 53.3 - y) if left else (x, y)
        k5, k15 = kc + 5, kc + 15
        cp, c5, c15 = P(c, kc), P(c, k5), P(c, min(k15, ke))
        if not cp or not c5 or not c15 or k5 >= ke: return
        for n in F:
            if n in ('football', c) or club.get(n) == club[c]: continue
            p, p4, p6 = P(n, kc), P(n, k5 - 1), P(n, k5 + 1)
            if not p or not p4 or not p6: continue
            dx, d = p[0] - cp[0], math.hypot(p[0] - cp[0], p[1] - cp[1])
            if dx <= 1 or not (3 <= d <= 10): continue
            vx, vy = (p6[0] - p4[0]) / 0.2, (p6[1] - p4[1]) / 0.2; p5 = P(n, k5)
            touch = any(P(n, f) and P(c, f) and math.hypot(P(n, f)[0] - P(c, f)[0], P(n, f)[1] - P(c, f)[1]) < 1.0 for f in range(kc, ke + 1))
            out.append(dict(cov=plays[cur], d=round(d, 1), dx=round(dx, 1), sp=round(math.hypot(vx, vy), 2), vx=round(vx, 2),
                now=round(ang(vx, vy, c5[0] - p5[0], c5[1] - p5[1])), ahead=round(ang(vx, vy, c15[0] - p5[0], c15[1] - p5[1])),
                cs=round(float(F[c][kc]['s']), 1), touch=touch, yac=round(P(c, ke)[0] - cp[0], 1) if P(c, ke) else None))
    with open(f'{D}/tracking_week_{w}.csv') as fh:
        for r in csv.DictReader(fh):
            k = (r['gameId'], r['playId'])
            if k != cur: flush(); cur = k; F = defaultdict(dict); club = {}; evs = {}
            if k not in rec: continue
            n = r['nflId'] if r['nflId'] != 'NA' else 'football'
            f = int(r['frameId']); F[n][f] = dict(x=r['x'], y=r['y'], s=r['s'], dir=r['playDirection']); club[n] = r['club']
            e = r['event']
            if e and e != 'NA' and e not in evs: evs[e] = f
        flush()
json.dump(out, open(OUT, 'w')); print('rows', len(out))
