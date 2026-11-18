"""NFL zone completions of 10+ air yards (PFF zone coverages, BDB 2025 weeks given): at the catch the nearest defender
in front (> 1 yd downfield of the catcher) / level (within 1 yd) / behind; YAC (catch to end, downfield); untouched
distance and time to first_contact (path); after-contact distance (first_contact to the end of the play); whether the
play ends out of bounds. Normalised so offense attacks +x."""
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
out = []
for w in weeks:
    cur = None; F = defaultdict(dict); club = {}; evs = {}
    def flush():
        if cur is None or cur not in rec: return
        c = rec[cur]
        kc = evs.get('pass_outcome_caught'); ends = [evs[e] for e in END if e in evs and kc is not None and evs[e] > kc]
        if kc is None or not ends or c not in F: return
        ke = min(ends); left = F[c][kc]['dir'] == 'left'
        def P(n, f):
            q = F[n].get(f)
            if not q: return None
            x, y = float(q['x']), float(q['y'])
            return (120 - x, 53.3 - y) if left else (x, y)
        cp = P(c, kc)
        if not cp: return
        defs = [n for n in F if n != 'football' and club.get(n) != club[c] and P(n, kc)]
        if not defs: return
        nd = min(defs, key=lambda n: math.hypot(P(n, kc)[0] - cp[0], P(n, kc)[1] - cp[1]))
        dx = P(nd, kc)[0] - cp[0]
        pos = 'front' if dx > 1 else 'behind' if dx < -1 else 'level'
        kfa = evs.get('first_contact'); kf = next((f for f in range(kc, ke + 1) if P(c, f) and any(P(n, f) and math.hypot(P(n, f)[0] - P(c, f)[0], P(n, f)[1] - P(c, f)[1]) < 1.0 for n in defs)), None)
        path = lambda a, b: sum(math.hypot(P(c, f)[0] - P(c, f - 1)[0], P(c, f)[1] - P(c, f - 1)[1]) for f in range(a + 1, b + 1) if P(c, f) and P(c, f - 1))
        endp = P(c, ke) or cp
        out.append(dict(gid=cur[0], pid=cur[1], cov=plays[cur], pos=pos, ndist=math.hypot(P(nd, kc)[0] - cp[0], P(nd, kc)[1] - cp[1]), yac=endp[0] - cp[0],
            untouched=path(kc, kf) if kf else path(kc, ke), tfc=(kf - kc) / 10 if kf else None, after=path(kf, ke) if kf else None,
            contact=kf is not None, annot=kfa is not None and kc <= kfa <= ke, oob='out_of_bounds' in evs and evs['out_of_bounds'] == ke, td='touchdown' in evs and evs['touchdown'] == ke, s=float(F[c][kc]['s']), sl0=min(cp[1], 53.3 - cp[1]), slE=min(endp[1], 53.3 - endp[1]),
            lastTouch=next(((ke - f) / 10 for f in range(ke, kc - 1, -1) if P(c, f) and any(P(n, f) and math.hypot(P(n, f)[0] - P(c, f)[0], P(n, f)[1] - P(c, f)[1]) < 1.0 for n in defs)), None),
            outward=(lambda a, b: (b[1] - a[1]) * (1 if a[1] > 26.65 else -1))(P(c, max(kc, ke - 10)) or cp, endp)))
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
