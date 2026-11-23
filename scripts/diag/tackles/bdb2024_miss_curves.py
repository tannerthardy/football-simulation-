"""NFL miss probability by approach (BDB 2024 PFF tackle labels joined to BDB 2025 tracking, 2022 weeks 1-9).

Labels: BDB 2024 tackles.csv, one row per defender per play (tackle / assist / pff_missedTackle). PFF charting; at most
one per defender per play; contact is not required for a miss. They say who, not when: the attempt moment is defined
geometrically, identically for made tackles, misses and the sim (agreed with Defense; see ATTEMPT below).

Frame and features follow Defense's pursuit operator (scripts/diag/pursuit/pursuit-an.py, #868):
- +x downfield, 10 Hz, velocities from s/dir;
- carrier frame u = his direction of travel (+x if under 1 yd/s);
- along / lateral; ahead / level / behind at +-1 yd; inside / outside toward his near sideline;
- contact proxy CONTACT yd; traffic = other defenders within 5 yd.

Carrier and window: catches from pass_outcome_caught; runs from handoff (QB runs from the snap); to the end event.
ATTEMPT (agreed with Defense 2026-11-23): the labelled defender's first local minimum of distance to the carrier below
REACH yd, or his first frame within CONTACT yd if that comes earlier; his first approach that qualifies, not the
closest overall, since PFF charts one per defender per play. A defender who never comes within DROP yd is "no attempt
observed": counted per label, not used. Features are read LOOKBACK s before the attempt frame (0.3 s; 0.5 s is
printed as a sensitivity check). The distance at the attempt is recorded per label. On the sim, where attempt times
are known, wraps happen at median 1.38 yd and misses at 1.95 yd, so 1.0 yd is a contact distance, not an attempt
moment (Defense).

Rate: missed / (missed + tackle + assist), one per defender per play.

Stage 1 (extract) streams the tracking once and writes one JSON row per labelled defender per play:
  python3 -I bdb2024_miss_curves.py extract TACKLES.csv BDB2025_DIR OUT.jsonl [weeks]
Stage 2 (tables) prints markdown tables from those rows:
  python3 -I bdb2024_miss_curves.py tables ROWS.jsonl
Raw inputs stay in git-ignored data/raw; only derived tables are committed."""
import csv, json, math, sys
from collections import defaultdict

CONTACT, REACH, DROP, LOOKBACKS, W = 1.0, 2.5, 2.5, (0.3, 0.5), 53.33
END = ('tackle', 'out_of_bounds', 'touchdown', 'fumble', 'qb_slide', 'safety', 'fumble_defense_recovered',
       'fumble_offense_recovered')


def unit(vx, vy, fb=(1.0, 0.0)):
    s = math.hypot(vx, vy)
    return (vx / s, vy / s) if s > 1.0 else fb


def extract(tackles_path, d, out_path, weeks):
    lab = defaultdict(dict)
    for r in csv.DictReader(open(tackles_path)):
        kind = 'missed' if r['pff_missedTackle'] == '1' else 'tackle' if r['tackle'] == '1' else 'assist' if r['assist'] == '1' else None
        if kind:
            lab[(r['gameId'], r['playId'])][r['nflId']] = kind
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{d}/players.csv'))}
    poss = {(r['gameId'], r['playId']): r['possessionTeam'] for r in csv.DictReader(open(f'{d}/plays.csv'))}
    carrier = {}
    for r in csv.DictReader(open(f'{d}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k not in lab:
            continue
        if r['hadPassReception'] in ('1', 'TRUE', 'True'):
            carrier[k] = (r['nflId'], 'catch')
        elif r['hadRushAttempt'] in ('1', 'TRUE', 'True') and k not in carrier:
            carrier[k] = (r['nflId'], 'run')
    n_out = 0
    out = open(out_path, 'w')
    for w in weeks:
        cur, F, club, evs, dirn = None, defaultdict(dict), {}, {}, None

        def flush():
            nonlocal n_out
            if cur is None or cur not in carrier or cur not in lab:
                return
            c, ptype = carrier[cur]
            if c not in F:
                return
            ks = evs.get('ball_snap')
            k0 = evs.get('pass_outcome_caught') if ptype == 'catch' else evs.get('handoff', ks)
            if k0 is None or ks is None or 'football' not in F or ks not in F['football']:
                return
            ends = [evs[e] for e in END if e in evs and evs[e] >= k0]
            ke = min(ends) if ends else max(F[c])
            left = dirn == 'left'

            def P(q):
                x, y = float(q['x']), float(q['y'])
                return (120 - x, 53.3 - y) if left else (x, y)

            def V(q):
                if q['s'] in ('NA', '') or q['dir'] in ('NA', ''):
                    return (0.0, 0.0)
                s, a = float(q['s']), math.radians(float(q['dir']))
                vx, vy = s * math.sin(a), s * math.cos(a)
                return (-vx, -vy) if left else (vx, vy)

            los = P(F['football'][ks])[0]
            frames = [f for f in range(k0, ke + 1) if f in F[c]]
            if len(frames) < 2:
                return
            car = {f: (P(F[c][f]), V(F[c][f])) for f in frames}
            team = poss.get(cur)
            defs = {n: tr for n, tr in F.items() if n != 'football' and club.get(n) != team}
            def feats(row, lb, fl, fa):
                    (cx, cy), (cvx, cvy) = car[fl]
                    (dx, dy) = P(defs[n][fl]); (dvx, dvy) = V(defs[n][fl])
                    u = unit(cvx, cvy)
                    rx, ry = dx - cx, dy - cy
                    along, lat = rx * u[0] + ry * u[1], -rx * u[1] + ry * u[0]
                    near_side = -1 if cy < W / 2 else 1
                    outside = (dy - cy) * near_side > 0
                    prev = fl - 3
                    closing = (dist[prev] - dist[fl]) / 0.3 if prev in dist else None
                    traffic = sum(1 for m, tr in defs.items() if m != n and fl in tr and math.dist(P(tr[fl]), (cx, cy)) <= 5)
                    sfx = '' if lb == LOOKBACKS[0] else '_' + str(lb)
                    row.update({k + sfx: v for k, v in dict(
                               bearing='ahead' if along > 1 else 'behind' if along < -1 else 'level', outside=outside,
                               along=round(along, 2), lat=round(lat, 2), dist=round(dist[fl], 2),
                               closing=round(closing, 2) if closing is not None else None,
                               cs=round(math.hypot(cvx, cvy), 2), ds=round(math.hypot(dvx, dvy), 2),
                               dlat=round((dvx * -u[1] + dvy * u[0]) - (cvx * -u[1] + cvy * u[0]), 2),
                               traffic=traffic, sideline=round(min(cy, W - cy), 2)).items()})

            for n, kind in lab[cur].items():
                if n not in defs:
                    continue
                dist = {f: math.dist(P(defs[n][f]), car[f][0]) for f in frames if f in defs[n]}
                if not dist:
                    continue
                fs = sorted(dist)
                closest = min(dist.values())
                row = dict(key=list(cur), id=n, kind=kind, ptype=ptype, pos=pos.get(n, '?'), closest=round(closest, 2))
                if closest > DROP:
                    row['dropped'] = True
                    out.write(json.dumps(row) + '\n'); n_out += 1
                    continue
                contact = next((f for f in fs if dist[f] <= CONTACT), None)
                localmin = next((f for i, f in enumerate(fs) if dist[f] < REACH and (i == 0 or dist[f] <= dist[fs[i - 1]])
                                 and (i == len(fs) - 1 or dist[f] < dist[fs[i + 1]])), None)
                cands = [f for f in (contact, localmin) if f is not None]
                fa = min(cands) if cands else min(dist, key=dist.get)
                row['attempt_dist'] = round(dist[fa], 2)
                for lb in LOOKBACKS:
                    fl = fa - round(lb * 10)
                    if fl not in car or fl not in dist:
                        fl = fs[0]
                    feats(row, lb, fl, fa)
                row.update(dropped=False, t=round((fa - k0) / 10, 1), yds_after=round(car[frames[-1]][0][0] - car[fa][0][0], 1))
                out.write(json.dumps(row) + '\n'); n_out += 1
                continue

        with open(f'{d}/tracking_week_{w}.csv') as fh:
            for r in csv.DictReader(fh):
                k = (r['gameId'], r['playId'])
                if k != cur:
                    flush(); cur, F, club, evs, dirn = k, defaultdict(dict), {}, {}, None
                if k not in carrier:
                    continue
                n = r['nflId'] if r['nflId'] != 'NA' else 'football'
                f = int(r['frameId']); F[n][f] = r; club[n] = r['club']; dirn = r['playDirection']
                e = r['event']
                if e and e != 'NA' and e not in evs:
                    evs[e] = f
            flush()
        print('week', w, 'rows so far', n_out, file=sys.stderr)
    out.close()
    print('rows', n_out)


def tables(path):
    rows = [json.loads(l) for l in open(path)]
    used = [r for r in rows if not r['dropped']]
    def rate(v):
        m = sum(r['kind'] == 'missed' for r in v)
        return f"{m / len(v):.3f} ({m}/{len(v)})" if v else '-'
    print(f"rows {len(rows)}; attempt observed {len(used)}; dropped (closest approach > {DROP} yd) by label: "
          + ', '.join(f"{k} {sum(r['kind'] == k for r in rows if r['dropped'])}/{sum(r['kind'] == k for r in rows)}"
                      for k in ('missed', 'tackle', 'assist')))
    print(f"\nOverall miss probability, attempt observed: {rate(used)}\n")
    q = lambda v, p: sorted(v)[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
    print('| label | n | distance at the attempt, yd: p10 / p50 / p90 / p95 | share beyond 1.0 / 1.5 / 2.0 yd |')
    print('|---|---|---|---|')
    for k in ('missed', 'tackle', 'assist'):
        v = [r['attempt_dist'] for r in used if r['kind'] == k]
        if v:
            print(f"| {k} | {len(v)} | {q(v, .1):.2f} / {q(v, .5):.2f} / {q(v, .9):.2f} / {q(v, .95):.2f} | "
                  + ' / '.join(f"{sum(x > b for x in v) / len(v):.2f}" for b in (1.0, 1.5, 2.0)) + ' |')
    print()
    def table(title, keyf, order=None):
        g = defaultdict(list)
        for r in used:
            k = keyf(r)
            if k is not None:
                g[k].append(r)
        print(f"| {title} | n | miss probability | median yards after a miss | median yards after a made tackle |")
        print('|---|---|---|---|---|')
        for k in (order or sorted(g)):
            v = g.get(k, [])
            if not v:
                continue
            ym = sorted(r['yds_after'] for r in v if r['kind'] == 'missed')
            yt = sorted(r['yds_after'] for r in v if r['kind'] != 'missed')
            med = lambda x: f"{x[len(x) // 2]:.1f}" if x else '-'
            print(f"| {k} | {len(v)} | {rate(v)} | {med(ym)} | {med(yt)} |")
        print()
    band = lambda x, edges: next((f"{a}-{b}" for a, b in zip(edges, edges[1:]) if a <= x < b), f">={edges[-1]}")
    table('bearing (carrier frame)', lambda r: r['bearing'], ['ahead', 'level', 'behind'])
    table('bearing, 0.5 s look-back (sensitivity)', lambda r: r.get('bearing_0.5'), ['ahead', 'level', 'behind'])
    table('bearing x side', lambda r: f"{r['bearing']} {'outside' if r['outside'] else 'inside'}")
    table('closing speed, yd/s', lambda r: band(r['closing'], [-99, 0, 2, 4, 6, 8]) if r['closing'] is not None else None)
    table('closing speed, 0.5 s look-back (sensitivity), yd/s', lambda r: band(r['closing_0.5'], [-99, 0, 2, 4, 6, 8]) if r.get('closing_0.5') is not None else None)
    table('carrier speed, yd/s', lambda r: band(r['cs'], [0, 2, 4, 6, 8]))
    table('defender speed, yd/s', lambda r: band(r['ds'], [0, 2, 4, 6, 8]))
    table('lateral speed difference, yd/s', lambda r: band(r['dlat'], [-99, -4, -2, 0, 2, 4]))
    table('distance at look-back, yd', lambda r: band(r['dist'], [0, 1, 2, 3, 5]))
    table('traffic: other defenders within 5 yd', lambda r: min(r['traffic'], 3))
    table('sideline distance, yd', lambda r: band(r['sideline'], [0, 3, 6, 10, 15]))
    table('position group', lambda r: {'CB': 'CB', 'SS': 'S', 'FS': 'S', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'LB': 'LB',
                                       'DE': 'DL', 'DT': 'DL', 'NT': 'DL'}.get(r['pos'], r['pos']))
    table('play type', lambda r: r['ptype'])
    table('time since the catch / handoff, s', lambda r: band(r['t'], [0, 0.5, 1, 2, 3]))


if __name__ == '__main__':
    if sys.argv[1] == 'extract':
        weeks = [int(w) for w in sys.argv[5].split(',')] if len(sys.argv) > 5 else list(range(1, 10))
        extract(sys.argv[2], sys.argv[3], sys.argv[4], weeks)
    else:
        tables(sys.argv[2])
