"""Pursuit operator, NFL side (BDB 2025): every completion, carrier and defender tracks at 10 Hz from pass_outcome_caught
to the play's end event, normalised to +x downfield, same row format as pursuit-dump.mts. Velocities from s/dir.
Tagged missed tackles (any player_play column naming a missed tackle) are kept for the proxy check only.
Usage: python3 -I pursuit-dump-nfl.py DATA_DIR WEEK... OUT"""
import csv, sys, json, math
from collections import defaultdict
D = sys.argv[1]; weeks = [int(w) for w in sys.argv[2:-1]]; OUT = sys.argv[-1]
END = ('tackle', 'out_of_bounds', 'touchdown', 'fumble', 'qb_slide', 'safety', 'fumble_defense_recovered', 'fumble_offense_recovered')
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['passResult'] == 'C' and r.get('playNullifiedByPenalty') != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(cov=r.get('pff_passCoverage'), man=r.get('pff_manZone') == 'Man', air=r.get('passLength'), poss=r['possessionTeam'])
rec, missed = {}, defaultdict(list)
# Player positions (seat for the hand-off split).
POS = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
pp = csv.DictReader(open(f'{D}/player_play.csv')); miss_cols = [c for c in pp.fieldnames if 'issed' in c and 'ackle' in c]
for r in pp:
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    if r.get('hadPassReception') in ('1', 'TRUE', 'True'): rec[k] = r['nflId']
    for c in miss_cols:
        if r.get(c) not in (None, '', '0', 'NA', 'FALSE', 'False'): missed[k].append(r['nflId'])
out = []
for w in weeks:
    cur = None; F = defaultdict(dict); club = {}; evs = {}; dirn = None
    def flush():
        if cur is None or cur not in rec: return
        c = rec[cur]; kc = evs.get('pass_outcome_caught')
        ends = [evs[e] for e in END if e in evs and kc is not None and evs[e] > kc]
        if kc is None or c not in F: return
        ke = min(ends) if ends else max(F[c])
        left = dirn == 'left'; ks = evs.get('ball_snap')
        if ks is None or ks not in F.get('football', {}): return
        def P(q):
            x, y = float(q['x']), float(q['y']); return (120 - x, 53.3 - y) if left else (x, y)
        def V(q):
            if q['s'] in ('NA', '') or q['dir'] in ('NA', ''): return (0.0, 0.0)
            s, a = float(q['s']), math.radians(float(q['dir'])); vx, vy = s * math.sin(a), s * math.cos(a)
            return (-vx, -vy) if left else (vx, vy)
        def O(q):
            if q['o'] in ('NA', ''): return None
            a = math.radians(float(q['o'])); fx, fy = math.sin(a), math.cos(a)
            if left: fx, fy = -fx, -fy
            return round(math.atan2(fy, fx), 2)
        los = P(F['football'][ks])[0]
        def row(q, f, n):
            p, v = P(q), V(q); return [round((f - kc) / 10, 1), round(p[0] - los, 2), round(p[1], 2), round(v[0], 2), round(v[1], 2)]
        car = [row(F[c][f], f, c) for f in range(kc, ke + 1) if f in F[c]]
        # Defender frames start at the throw (pass_forward) so the coverage-to-pursuit hand-off can be timed.
        kf = evs.get('pass_forward'); k0 = kf if kf is not None and kf < kc else kc
        defs, offs = {}, {}
        for n in F:
            if n == 'football': continue
            if club.get(n) == plays[cur]['poss']:
                if n != c: offs[n] = [row(F[n][f], f, n) for f in range(kc, ke + 1) if f in F[n]]
                continue
            defs[n] = [row(F[n][f], f, n) + [O(F[n][f])] for f in range(k0, ke + 1) if f in F[n]]
        endt = next((e for e in ('touchdown', 'out_of_bounds', 'tackle') if e in evs and evs[e] == ke), 'other')
        out.append(dict(src='nfl', key=list(cur), cov=plays[cur]['cov'], man=plays[cur]['man'], air=plays[cur]['air'],
                        end={'touchdown': 'td', 'out_of_bounds': 'oob'}.get(endt, endt), car=car, defs=defs, offs=offs, throwT=(kf - kc) / 10 if kf is not None and kf < kc else None, dpos={n: POS.get(n) for n in defs},
                        ev=[[None, 'missed_tag', m, c] for m in missed.get(cur, [])], first_contact=(evs['first_contact'] - kc) / 10 if 'first_contact' in evs and evs['first_contact'] >= kc else None))
    with open(f'{D}/tracking_week_{w}.csv') as fh:
        for r in csv.DictReader(fh):
            k = (r['gameId'], r['playId'])
            if k != cur: flush(); cur = k; F = defaultdict(dict); club = {}; evs = {}; dirn = None
            if k not in rec: continue
            n = r['nflId'] if r['nflId'] != 'NA' else 'football'
            f = int(r['frameId']); F[n][f] = r; club[n] = r['club']; dirn = r['playDirection']
            e = r['event']
            if e and e != 'NA' and e not in evs: evs[e] = f
        flush()
json.dump(out, open(OUT, 'w')); print('rows', len(out), 'missed-tackle columns', miss_cols)
