"""Tackle geometry, NFL and sim through one operator (extends bdb2024_miss_curves.py; same attempt moment and frame).

Stages, all with python3 -I:
  dump-nfl TACKLES.csv BDB2025_DIR OUT.plays.jsonl [weeks]   BDB 2024 PFF labels joined to BDB 2025 tracking
  rows PLAYS.jsonl OUT.rows.jsonl                             one row per labelled defender per play (either source)
  tables ROWS.jsonl                                           markdown tables (one source)
  compare NFL.rows.jsonl SIM.rows.jsonl                        side by side: share of attempts and miss rate per bin
The sim writes PLAYS.jsonl in the same shared format (tackle-geometry-dump.mts); `rows` and `tables` do not know the source.

Shared play format (one JSON object per line):
  src 'nfl' | 'sim'; key; ptype 'catch' | 'run'; carrier id; k0 (catch / handoff frame) and ke (end frame), 10 Hz ints;
  los (yd, +x downfield); events {name: frame}; labels {defender id: 'missed' | 'tackle' | 'assist'};
  side {id: 'def' | 'off'}; wt {id: lb}; ht {id: in}; pos {id: position};
  tracks {id: [[frame, x, y, vx, vy, o], ...]}, +x downfield, o = body facing in radians (atan2 convention, field frame).
NFL labels are PFF charting (missed = pff_missedTackle; contact not required). Sim labels are engine events: missed =
a defender with a missed_tackle event and no wrap on the play; tackle = the defender whose initial wrap ended it;
assist = any other wrap. They say who, not when; the attempt moment is geometric, identical on both sides.

ATTEMPT (agreed with Defense, as in bdb2024_miss_curves.py): the labelled defender's first local minimum of distance to
the carrier below REACH yd, or his first frame within CONTACT yd if earlier. Never within DROP yd: dropped. Features
before the attempt are read LB frames (0.3 s) earlier; geometry after the attempt is read at +0.5 s and +1.0 s.

Raw inputs stay in git-ignored data/raw; plays and rows go to out/; only tables are committed."""
import csv, json, math, sys
from collections import defaultdict

CONTACT, REACH, DROP, LB, W = 1.0, 2.5, 2.5, 3, 53.33
MOVING = 2.0          # carrier speed (yd/s) at the look-back below which he is 'stopped / bottled'
END = ('tackle', 'out_of_bounds', 'touchdown', 'fumble', 'qb_slide', 'safety', 'fumble_defense_recovered',
       'fumble_offense_recovered')


# ---------------------------------------------------------------- NFL dump
def dump_nfl(tackles_path, d, out_path, weeks):
    lab = defaultdict(dict)
    for r in csv.DictReader(open(tackles_path)):
        kind = 'missed' if r['pff_missedTackle'] == '1' else 'tackle' if r['tackle'] == '1' else 'assist' if r['assist'] == '1' else None
        if kind:
            lab[(r['gameId'], r['playId'])][r['nflId']] = kind
    P = {r['nflId']: r for r in csv.DictReader(open(f'{d}/players.csv'))}
    def inches(h):
        try:
            a, b = h.split('-'); return int(a) * 12 + int(b)
        except Exception:
            return None
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
    out, n_out = open(out_path, 'w'), 0
    for w in weeks:
        cur, F, club, evs, dirn = None, defaultdict(dict), {}, {}, None

        def flush():
            nonlocal n_out
            if cur is None or cur not in carrier or cur not in lab:
                return
            c, ptype = carrier[cur]
            ks = evs.get('ball_snap')
            k0 = evs.get('pass_outcome_caught') if ptype == 'catch' else evs.get('handoff', ks)
            if c not in F or k0 is None or ks is None or 'football' not in F or ks not in F['football']:
                return
            ends = [evs[e] for e in END if e in evs and evs[e] >= k0]
            ke = min(ends) if ends else max(F[c])
            left = dirn == 'left'

            def row(f, q):
                x, y = float(q['x']), float(q['y'])
                s = 0.0 if q['s'] in ('NA', '') else float(q['s'])
                a = math.radians(float(q['dir'])) if q['dir'] not in ('NA', '') else 0.0
                o = math.radians(float(q['o'])) if q['o'] not in ('NA', '') else None
                vx, vy = s * math.sin(a), s * math.cos(a)
                ox, oy = (math.sin(o), math.cos(o)) if o is not None else (None, None)
                if left:
                    x, y, vx, vy = 120 - x, 53.3 - y, -vx, -vy
                    ox, oy = (-ox, -oy) if ox is not None else (None, None)
                return [f, round(x, 2), round(y, 2), round(vx, 2), round(vy, 2),
                        round(math.atan2(oy, ox), 3) if ox is not None else None]

            team = poss.get(cur)
            lo, hi = k0 - 12, ke + 12
            tracks, side = {}, {}
            for n, tr in F.items():
                if n == 'football':
                    continue
                tracks[n] = [row(f, tr[f]) for f in sorted(tr) if lo <= f <= hi]
                side[n] = 'off' if club.get(n) == team else 'def'
            los = float(F['football'][ks]['x']); los = 120 - los if left else los
            ids = list(tracks)
            out.write(json.dumps(dict(src='nfl', key=list(cur), ptype=ptype, carrier=c, k0=k0, ke=ke, los=round(los, 2),
                                      events={e: f for e, f in evs.items() if lo <= f <= hi}, labels=lab[cur], side=side,
                                      wt={n: int(P[n]['weight']) for n in ids if n in P and P[n]['weight'].isdigit()},
                                      ht={n: inches(P[n]['height']) for n in ids if n in P},
                                      pos={n: P[n]['position'] for n in ids if n in P}, tracks=tracks)) + '\n')
            n_out += 1

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
        print('week', w, 'plays so far', n_out, file=sys.stderr)
    out.close()


# ---------------------------------------------------------------- operator
def unit(vx, vy, fb=(1.0, 0.0)):
    s = math.hypot(vx, vy)
    return (vx / s, vy / s) if s > 1.0 else fb


def sang(a, b):
    """Signed angle from vector a to vector b, degrees (-180, 180]."""
    d = math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])
    return math.degrees(d)


def intercept(r, dv_speed, cv):
    """Constant-velocity intercept: vector from defender to the meeting spot, or None. r = carrier - defender."""
    a = cv[0] ** 2 + cv[1] ** 2 - dv_speed ** 2; b = 2 * (r[0] * cv[0] + r[1] * cv[1]); c = r[0] ** 2 + r[1] ** 2
    ts = []
    if abs(a) < 1e-9:
        ts = [-c / b] if abs(b) > 1e-9 else []
    else:
        disc = b * b - 4 * a * c
        if disc >= 0:
            ts = [(-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)]
    ts = [t for t in ts if t > 0]
    if not ts:
        return None
    t = min(ts)
    return (r[0] + cv[0] * t, r[1] + cv[1] * t), t


def play_rows(p):
    T = {n: {int(q[0]): q for q in tr} for n, tr in p['tracks'].items()}
    c, k0, ke = p['carrier'], p['k0'], p['ke']
    if c not in T:
        return []
    C = T[c]
    frames = [f for f in range(k0, ke + 1) if f in C]
    if len(frames) < 2:
        return []
    defs = [n for n, s in p['side'].items() if s == 'def' and n in T]
    offs = [n for n, s in p['side'].items() if s == 'off' and n in T and n != c]
    pos = lambda n, f: (T[n][f][1], T[n][f][2])
    vel = lambda n, f: (T[n][f][3], T[n][f][4])
    dist = {n: {f: math.dist(pos(n, f), pos(c, f)) for f in frames if f in T[n]} for n in defs}
    first_contact = min(((f, n) for n in defs for f, x in dist[n].items() if x <= CONTACT), default=None)

    def attempt(n):
        dd = dist.get(n) or {}
        if not dd or min(dd.values()) > DROP:
            return None
        fs = sorted(dd)
        contact = next((f for f in fs if dd[f] <= CONTACT), None)
        localmin = next((f for i, f in enumerate(fs) if dd[f] < REACH and (i == 0 or dd[f] <= dd[fs[i - 1]])
                         and (i == len(fs) - 1 or dd[f] < dd[fs[i + 1]])), None)
        cands = [f for f in (contact, localmin) if f is not None]
        return min(cands) if cands else min(dd, key=dd.get)

    att = {n: attempt(n) for n in p['labels'] if n in dist}
    order = sorted((f, n) for n, f in att.items() if f is not None)
    out = []
    for n, kind in p['labels'].items():
        if n not in dist:
            continue
        row = dict(src=p['src'], key=p['key'], id=n, kind=kind, ptype=p['ptype'], pos=p['pos'].get(n, '?'))
        fa = att.get(n)
        if fa is None:
            row['dropped'] = True; out.append(row); continue
        dd = dist[n]
        # Look-back geometry may reach before the catch / handoff (tracks start 1.2 s earlier); attempts never do.
        dd = {**{f: math.dist(pos(n, f), pos(c, f)) for f in T[n] if f in C and f < k0}, **dd}
        fl = fa - LB if (fa - LB) in dd else min(dd)
        (cx, cy), (cvx, cvy) = pos(c, fl), vel(c, fl)
        (dx, dy), (dvx, dvy) = pos(n, fl), vel(n, fl)
        cs, ds = math.hypot(cvx, cvy), math.hypot(dvx, dvy)
        u = unit(cvx, cvy)
        rx, ry = dx - cx, dy - cy                               # defender relative to carrier
        los_v = (-rx, -ry)                                       # defender's line of sight to the carrier
        along, lat = rx * u[0] + ry * u[1], -rx * u[1] + ry * u[0]
        near_side = -1 if cy < W / 2 else 1
        closing = (dd[fl - 3] - dd[fl]) / 0.3 if (fl - 3) in dd else None
        traffic = sum(1 for m in defs if m != n and fl in T[m] and math.dist(pos(m, fl), (cx, cy)) <= 5)
        # Approach angle between the two velocities: 0 chasing the same way, 180 head-on.
        approach = abs(sang((cvx, cvy), (dvx, dvy))) if cs > 1 and ds > 1 else None
        # Aim: angle of the defender's velocity off his line of sight, positive toward the carrier's travel (leading),
        # against the lead a constant-velocity intercept at his current speed needs.
        lead_sign = 1 if (los_v[0] * cvy - los_v[1] * cvx) >= 0 else -1
        aim = lead_sign * sang(los_v, (dvx, dvy)) if ds > 1 else None
        ic = intercept(los_v, ds, (cvx, cvy)) if ds > 1 else None
        need = lead_sign * sang(los_v, ic[0]) if ic else None
        if cs <= 1:
            need = 0.0
        # Body facing (o) off the line of sight; and the defender's facing off his own travel (shuffling / turned).
        o = T[n][fl][5]
        face = abs(sang((math.cos(o), math.sin(o)), los_v)) if o is not None else None
        face_run = abs(sang((math.cos(o), math.sin(o)), (dvx, dvy))) if o is not None and ds > 1 else None
        oc = T[c][fl][5]
        car_sees = abs(sang((math.cos(oc), math.sin(oc)), (rx, ry))) if oc is not None else None
        # Speed change over the last 1.0 s (breaking down) and the carrier's cut over the last 0.5 s.
        f10 = fa - 10 if (fa - 10) in T[n] else None
        brk = ds_at = None
        ds_at = math.hypot(*vel(n, fa))
        if f10 is not None:
            brk = ds_at - math.hypot(*vel(n, f10))
        f5 = fa - 5
        cut = None
        if f5 in C and math.hypot(*vel(c, f5)) > MOVING and math.hypot(*vel(c, fa)) > MOVING:
            cut = abs(sang(vel(c, f5), vel(c, fa)))
        cs_at = math.hypot(*vel(c, fa))
        # Mass and momentum (listed weight; sim: body mass converted to lb).
        wd, wc = p['wt'].get(n), p['wt'].get(c)
        hd, hc = p['ht'].get(n), p['ht'].get(c)
        # Blockers on the defender and the crowd around the carrier.
        blk_fl = sum(1 for m in offs if fl in T[m] and math.dist(pos(m, fl), (dx, dy)) <= 1.5)
        pile = sum(1 for m in defs if m != n and fa in T[m] and math.dist(pos(m, fa), pos(c, fa)) <= 1.5)
        prior = any(m != n and f in dist[m] and dist[m][f] <= CONTACT for m in defs for f in range(fa - 5, fa))
        rank = next(i for i, (f, m) in enumerate(order) if m == n)
        # After the attempt: carrier deflection, speed kept, separation, forward progress.
        aft = {}
        for dt in (5, 10):
            g = fa + dt
            if g in C and g <= ke + 2:
                aft[dt] = g
        after = {}
        if 5 in aft:
            g = aft[5]
            if cs_at > MOVING and math.hypot(*vel(c, g)) > MOVING:
                after['deflect'] = round(abs(sang(vel(c, fa), vel(c, g))), 1)
            after['cs_kept'] = round(math.hypot(*vel(c, g)) / cs_at, 2) if cs_at > MOVING else None
            after['sep05'] = round(dd[g], 2) if g in dd else None
        if 10 in aft:
            after['fwd10'] = round(pos(c, aft[10])[0] - pos(c, fa)[0], 2)
        row.update(dropped=False, attempt_dist=round(dd[fa], 2), t=round((fa - k0) / 10, 1),
                   bearing='ahead' if along > 1 else 'behind' if along < -1 else 'level', outside=(dy - cy) * near_side > 0,
                   along=round(along, 2), lat=round(lat, 2), dist=round(dd[fl], 2),
                   closing=round(closing, 2) if closing is not None else None, cs=round(cs, 2), ds=round(ds, 2),
                   dlat=round((dvx * -u[1] + dvy * u[0]) - (cvx * -u[1] + cvy * u[0]), 2), traffic=traffic,
                   sideline=round(min(cy, W - cy), 2), approach=round(approach) if approach is not None else None,
                   aim=round(aim, 1) if aim is not None else None, need=round(need, 1) if need is not None else None,
                   face=round(face) if face is not None else None, face_run=round(face_run) if face_run is not None else None,
                   car_sees=round(car_sees) if car_sees is not None else None,
                   brk=round(brk, 2) if brk is not None else None, ds_at=round(ds_at, 2), cs_at=round(cs_at, 2),
                   cut=round(cut, 1) if cut is not None else None, wd=wd, wc=wc, hd=hd, hc=hc,
                   blk=blk_fl, pile=pile, prior=prior, rank=rank,
                   first_on_play=first_contact is not None and first_contact[1] == n,
                   xlos=round(pos(c, fa)[0] - p['los'], 1), yds_after=round(pos(c, frames[-1])[0] - pos(c, fa)[0], 1),
                   dt_end=round((ke - fa) / 10, 1), **after)
        out.append(row)
    return out


def rows(plays_path, out_path):
    n = 0
    with open(out_path, 'w') as out:
        for line in open(plays_path):
            for r in play_rows(json.loads(line)):
                out.write(json.dumps(r) + '\n'); n += 1
    print('rows', n)


# ---------------------------------------------------------------- tables
def binkey(k):
    """Numeric order for band labels ('<a', 'a-b', '>=b'), string order otherwise."""
    import re
    m = re.match(r'^(<|>=)?(-?[\d.]+)', str(k))
    if not m:
        return (1, 0, str(k))
    return (0, float(m.group(2)) + (-1e-6 if m.group(1) == '<' else 1e6 if m.group(1) == '>=' else 0), '')


def tables(path):
    R = [json.loads(l) for l in open(path)]
    used = [r for r in R if not r['dropped']]
    is_miss = lambda r: r['kind'] == 'missed'
    med = lambda x: (sorted(x)[len(x) // 2] if x else None)
    fmt = lambda x, d=1: '-' if x is None else f"{x:.{d}f}"

    def rate(v):
        m = sum(map(is_miss, v))
        return f"{m / len(v):.3f} ({m}/{len(v)})" if v else '-'
    band = lambda x, edges: None if x is None else next((f"{a}-{b}" for a, b in zip(edges, edges[1:]) if a <= x < b), f">={edges[-1]}" if x >= edges[-1] else f"<{edges[0]}")
    srcs = sorted({r['src'] for r in R})
    print(f"source {'/'.join(srcs)}; rows {len(R)}; attempt observed {len(used)}; overall miss probability {rate(used)}\n")

    def table(title, v, keyf, order=None, extra=True):
        g = defaultdict(list)
        for r in v:
            k = keyf(r)
            if k is not None:
                g[k].append(r)
        hdr = f"| {title} | n | miss probability |" + (" yds after, miss | yds after, made | carrier speed kept 0.5 s, miss |" if extra else '')
        print(hdr); print('|' + '---|' * (hdr.count('|') - 1))
        for k in (order or sorted(g, key=binkey)):
            x = g.get(k, [])
            if not x:
                continue
            line = f"| {k} | {len(x)} | {rate(x)} |"
            if extra:
                line += (f" {fmt(med([r['yds_after'] for r in x if is_miss(r)]))} | {fmt(med([r['yds_after'] for r in x if not is_miss(r)]))} |"
                         f" {fmt(med([r['cs_kept'] for r in x if is_miss(r) and r.get('cs_kept') is not None]), 2)} |")
            print(line)
        print()

    def cross(title, v, rowf, colf, rows_, cols):
        g = defaultdict(list)
        for r in v:
            a, b = rowf(r), colf(r)
            if a is not None and b is not None:
                g[(a, b)].append(r)
        print(f"| {title} | " + ' | '.join(cols) + ' |'); print('|---|' + '---|' * len(cols))
        for a in rows_:
            print(f"| {a} | " + ' | '.join(rate(g[(a, b)]) for b in cols) + ' |')
        print()

    BEAR = ['ahead', 'level', 'behind']
    tr3 = lambda r: '0' if r['traffic'] == 0 else '1-2' if r['traffic'] <= 2 else '3+'
    mov = lambda r: 'moving' if r['cs'] >= MOVING else 'stopped'
    print('## A. Bearing, stratified\n')
    cross('traffic (defenders within 5 yd) \\ bearing', used, tr3, lambda r: r['bearing'], ['0', '1-2', '3+'], BEAR)
    cross(f'carrier at the look-back (moving >= {MOVING} yd/s) \\ bearing', used, mov, lambda r: r['bearing'], ['moving', 'stopped'], BEAR)
    cross('already in contact with another defender (0.5 s before) \\ bearing', used, lambda r: 'yes' if r['prior'] else 'no',
          lambda r: r['bearing'], ['no', 'yes'], BEAR)
    cross('tackler order on the play \\ bearing', used, lambda r: str(min(r['rank'], 2)) if r['rank'] < 2 else '2+',
          lambda r: r['bearing'], ['0', '1', '2+'], BEAR)

    OPEN = [r for r in used if r['traffic'] == 0 and not r['prior'] and r['blk'] == 0 and r['cs'] >= MOVING]
    print(f"## B. Open field: no other defender within 5 yd, no prior contact, no blocker within 1.5 yd of the defender, "
          f"carrier moving (n {len(OPEN)}, miss {rate(OPEN)})\n")
    table('bearing', OPEN, lambda r: r['bearing'], BEAR)
    table('approach angle between velocities, deg (0 chase, 180 head-on)', OPEN, lambda r: band(r['approach'], [0, 45, 90, 135, 180.1]))
    table('aim minus required lead, deg (- under-leads / chases, + over-leads)', OPEN,
          lambda r: band(r['aim'] - r['need'], [-180, -30, -10, 10, 30]) if r['aim'] is not None and r['need'] is not None else None)
    table('closing speed, yd/s', OPEN, lambda r: band(r['closing'], [-99, 0, 2, 4, 6, 8]))
    table('defender speed at the look-back, yd/s', OPEN, lambda r: band(r['ds'], [0, 2, 4, 6, 8]))
    table('defender speed change over the last 1.0 s, yd/s (breaking down < 0)', OPEN, lambda r: band(r['brk'], [-99, -2, -0.5, 0.5, 2]))
    table('carrier speed, yd/s', OPEN, lambda r: band(r['cs'], [2, 4, 6, 8]))
    table('carrier cut over the last 0.5 s, deg', OPEN, lambda r: band(r['cut'], [0, 10, 20, 40, 60]))
    table('lateral speed difference, |yd/s|', OPEN, lambda r: band(abs(r['dlat']), [0, 1, 2, 4, 6]))
    table('defender facing off his line of sight to the carrier, deg', OPEN, lambda r: band(r['face'], [0, 20, 45, 90, 180.1]))
    table('defender facing off his own travel, deg (shuffling / turned)', OPEN, lambda r: band(r['face_run'], [0, 20, 45, 90, 180.1]))
    table('carrier facing off the line to the defender, deg (0 sees him coming)', OPEN, lambda r: band(r['car_sees'], [0, 45, 90, 135, 180.1]))
    table('weight ratio defender / carrier', OPEN, lambda r: band(r['wd'] / r['wc'], [0, 0.9, 1.0, 1.1, 1.25]) if r['wd'] and r['wc'] else None)
    table('momentum ratio defender / carrier (weight x speed)', OPEN,
          lambda r: band(r['wd'] * r['ds'] / (r['wc'] * r['cs']), [0, 0.5, 0.8, 1.25, 2]) if r['wd'] and r['wc'] and r['cs'] > 0 else None)
    table('height difference defender - carrier, in', OPEN, lambda r: band(r['hd'] - r['hc'], [-99, -2, 0, 2, 4]) if r['hd'] and r['hc'] else None)
    table('sideline distance, yd', OPEN, lambda r: band(r['sideline'], [0, 3, 6, 10, 15]))
    table('distance at the attempt, yd', OPEN, lambda r: band(r['attempt_dist'], [0, 0.5, 1.0, 1.5, 2.0]))
    table('position group', OPEN, lambda r: {'CB': 'CB', 'SS': 'S', 'FS': 'S', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'LB': 'LB',
                                             'DE': 'DL', 'DT': 'DL', 'NT': 'DL'}.get(r['pos'], r['pos']))
    table('play type', OPEN, lambda r: r['ptype'])
    table('carrier yards past the line at the attempt', OPEN, lambda r: band(r['xlos'], [-99, 0, 5, 10, 20]))

    print('## C. Crowd\n')
    table('other defenders within 1.5 yd of the carrier at the attempt', used, lambda r: str(min(r['pile'], 2)) if r['pile'] < 2 else '2+', ['0', '1', '2+'])
    table('blockers within 1.5 yd of the defender at the look-back', used, lambda r: str(min(r['blk'], 2)) if r['blk'] < 2 else '2+', ['0', '1', '2+'])
    table('first defender to reach contact range on the play', used, lambda r: 'yes' if r['first_on_play'] else 'no', ['yes', 'no'])

    print('## D. What a miss and a made tackle look like after the attempt (open field)\n')
    print('| bearing | label | n | carrier deflection 0.5 s, deg p50 | carrier speed kept 0.5 s p50 | separation 0.5 s, yd p50 | carrier forward yd in 1.0 s p50 | time to the end, s p50 |')
    print('|---|---|---|---|---|---|---|---|')
    for b in BEAR:
        for lab_ in ('missed', 'made'):
            v = [r for r in OPEN if r['bearing'] == b and (is_miss(r) if lab_ == 'missed' else not is_miss(r))]
            g = lambda k: [r[k] for r in v if r.get(k) is not None]
            print(f"| {b} | {lab_} | {len(v)} | {fmt(med(g('deflect')))} | {fmt(med(g('cs_kept')), 2)} | {fmt(med(g('sep05')), 2)} | "
                  f"{fmt(med(g('fwd10')))} | {fmt(med(g('dt_end')))} |")
    print()
    print('## E. Made tackles: forward progress after the attempt by approach and momentum (open field)\n')
    made = [r for r in OPEN if not is_miss(r)]
    print('| group | n | carrier forward yd in 1.0 s p25 / p50 / p75 | yds to the end p50 |'); print('|---|---|---|---|')
    def qs(x):
        x = sorted(x); return ' / '.join(f"{x[int(p * (len(x) - 1))]:.1f}" for p in (.25, .5, .75)) if x else '-'
    for name, f in [('head-on (approach >= 135)', lambda r: r['approach'] is not None and r['approach'] >= 135),
                    ('angled (45-135)', lambda r: r['approach'] is not None and 45 <= r['approach'] < 135),
                    ('chasing (< 45)', lambda r: r['approach'] is not None and r['approach'] < 45),
                    ('defender momentum > carrier x1.25', lambda r: r['wd'] and r['wc'] and r['cs'] > 0 and r['wd'] * r['ds'] > 1.25 * r['wc'] * r['cs']),
                    ('defender momentum < carrier x0.8', lambda r: r['wd'] and r['wc'] and r['cs'] > 0 and r['wd'] * r['ds'] < 0.8 * r['wc'] * r['cs'])]:
        v = [r for r in made if f(r)]
        print(f"| {name} | {len(v)} | {qs([r['fwd10'] for r in v if r.get('fwd10') is not None])} | {fmt(med([r['yds_after'] for r in v]))} |")
    print()
    logit(OPEN, 'F. Joint logistic model, open field')
    logit(used, 'G. Joint logistic model, all attempts (with crowd terms)', crowd=True)


def logit(v, title, crowd=False):
    import numpy as np
    names = ['closing', 'ds', 'cs', '|dlat|', 'approach/90', '|aim-need|/30', 'face/90', 'brk', 'cut/30', 'log w ratio',
             'sideline<3', 'attempt_dist']
    if crowd:
        names += ['traffic', 'prior', 'pile', 'blk', 'rank']
    X, y = [], []
    for r in v:
        vals = [r['closing'], r['ds'], r['cs'], abs(r['dlat']), None if r['approach'] is None else r['approach'] / 90,
                None if r['aim'] is None or r['need'] is None else abs(r['aim'] - r['need']) / 30,
                None if r['face'] is None else r['face'] / 90, r['brk'], 0.0 if r['cut'] is None else r['cut'] / 30,
                math.log(r['wd'] / r['wc']) if r['wd'] and r['wc'] else None, float(r['sideline'] < 3), r['attempt_dist']]
        if crowd:
            vals += [min(r['traffic'], 4), float(r['prior']), min(r['pile'], 3), min(r['blk'], 2), min(r['rank'], 3)]
        if any(x is None for x in vals):
            continue
        X.append(vals); y.append(1.0 if r['kind'] == 'missed' else 0.0)
    if len(X) < 200:
        print(f"## {title}: too few complete rows ({len(X)})\n"); return
    X, y = np.array(X), np.array(y)
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = np.hstack([np.ones((len(X), 1)), (X - mu) / sd])
    b = np.zeros(Z.shape[1])
    for _ in range(50):
        pr = 1 / (1 + np.exp(-Z @ b)); Wt = pr * (1 - pr)
        H = Z.T @ (Z * Wt[:, None]) + 1e-6 * np.eye(Z.shape[1]); g = Z.T @ (y - pr)
        step = np.linalg.solve(H, g); b += step
        if np.abs(step).max() < 1e-8:
            break
    se = np.sqrt(np.diag(np.linalg.inv(H)))
    print(f"## {title} (n {len(X)}, miss {y.mean():.3f}); coefficients per 1 sd, log-odds of a miss\n")
    print('| term | mean | sd | coef | se | z |'); print('|---|---|---|---|---|---|')
    for i, nm in enumerate(names):
        print(f"| {nm} | {mu[i]:.2f} | {sd[i]:.2f} | {b[i + 1]:+.2f} | {se[i + 1]:.2f} | {b[i + 1] / se[i + 1]:+.1f} |")
    print()


# ---------------------------------------------------------------- NFL vs sim, same operator
def _band(x, edges):
    if x is None:
        return None
    if x < edges[0]:
        return f"<{edges[0]}"
    return next((f"{a}-{b}" for a, b in zip(edges, edges[1:]) if a <= x < b), f">={edges[-1]}")


GROUP = {'CB': 'CB', 'SS': 'S', 'FS': 'S', 'S': 'S', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'LB': 'LB', 'DE': 'DL', 'DT': 'DL',
         'NT': 'DL', 'EDGE': 'DL', 'DL': 'DL'}
SPECS = [
    ('bearing', lambda r: r['bearing']),
    ('traffic: other defenders within 5 yd', lambda r: '0' if r['traffic'] == 0 else '1-2' if r['traffic'] <= 2 else '3+'),
    ('already in contact with another defender', lambda r: 'yes' if r['prior'] else 'no'),
    ('tackler order', lambda r: str(r['rank']) if r['rank'] < 2 else '2+'),
    ('blockers within 1.5 yd of the defender', lambda r: str(r['blk']) if r['blk'] < 2 else '2+'),
    ('carrier speed, yd/s', lambda r: _band(r['cs'], [0, 2, 4, 6, 8])),
    ('defender speed, yd/s', lambda r: _band(r['ds'], [0, 2, 4, 6, 8])),
    ('closing speed, yd/s', lambda r: _band(r['closing'], [0, 2, 4, 6, 8])),
    ('approach angle, deg (0 chase, 180 head-on)', lambda r: _band(r['approach'], [0, 45, 90, 135])),
    ('aim minus required lead, deg', lambda r: _band(r['aim'] - r['need'], [-30, -10, 10, 30]) if r['aim'] is not None and r['need'] is not None else None),
    ('defender speed change over the last 1.0 s, yd/s', lambda r: _band(r['brk'], [-2, -0.5, 0.5, 2])),
    ('carrier cut over the last 0.5 s, deg', lambda r: _band(r['cut'], [0, 10, 20, 40, 60])),
    ('|lateral speed difference|, yd/s', lambda r: _band(abs(r['dlat']), [0, 1, 2, 4, 6])),
    ('defender facing off his line of sight, deg', lambda r: _band(r['face'], [0, 20, 45, 90])),
    ('defender facing off his travel, deg', lambda r: _band(r['face_run'], [0, 20, 45, 90])),
    ('weight ratio defender / carrier', lambda r: _band(r['wd'] / r['wc'], [0, 0.9, 1.0, 1.1, 1.25]) if r['wd'] and r['wc'] else None),
    ('momentum ratio defender / carrier', lambda r: _band(r['wd'] * r['ds'] / (r['wc'] * r['cs']), [0, 0.5, 0.8, 1.25, 2]) if r['wd'] and r['wc'] and r['cs'] > 0 else None),
    ('distance at the attempt, yd', lambda r: _band(r['attempt_dist'], [0, 0.5, 1.0, 1.5, 2.0])),
    ('sideline distance, yd', lambda r: _band(r['sideline'], [0, 3, 6, 10, 15])),
    ('position group', lambda r: GROUP.get(r['pos'], r['pos'])),
    ('play type', lambda r: r['ptype']),
]
AFTER = [('carrier deflection 0.5 s after, deg', 'deflect', 0), ('carrier speed kept 0.5 s after', 'cs_kept', 2),
         ('separation 0.5 s after, yd', 'sep05', 2), ('carrier forward yd in 1.0 s', 'fwd10', 1),
         ('carrier yards from the attempt to the end', 'yds_after', 1), ('time from the attempt to the end, s', 'dt_end', 1)]


def is_open(r):
    return r['traffic'] == 0 and not r['prior'] and r['blk'] == 0 and r['cs'] >= MOVING


def compare(nfl_path, sim_path):
    A = [r for r in map(json.loads, open(nfl_path)) if not r['dropped']]
    B = [r for r in map(json.loads, open(sim_path)) if not r['dropped']]
    miss = lambda v: sum(r['kind'] == 'missed' for r in v)
    rt = lambda v: f"{miss(v) / len(v):.3f} ({miss(v)}/{len(v)})" if v else '-'
    print(f"NFL attempts {len(A)}, miss {rt(A)}; sim attempts {len(B)}, miss {rt(B)}.")
    print(f"Open field: NFL {rt([r for r in A if is_open(r)])}; sim {rt([r for r in B if is_open(r)])}.\n")
    print("Share = the bin's share of all attempts (made and missed) on that side; the geometry of attempts, before outcomes.\n")
    for scope, fa, fb in (('all attempts', A, B), ('open field', [r for r in A if is_open(r)], [r for r in B if is_open(r)])):
        print(f"### {scope}\n")
        for title, f in SPECS:
            ga, gb = defaultdict(list), defaultdict(list)
            for r in fa:
                k = f(r)
                if k is not None: ga[k].append(r)
            for r in fb:
                k = f(r)
                if k is not None: gb[k].append(r)
            na, nb = sum(map(len, ga.values())) or 1, sum(map(len, gb.values())) or 1
            print(f"| {title} | NFL share | sim share | NFL miss | sim miss |"); print('|---|---|---|---|---|')
            keys = set(ga) | set(gb)
            for k in ([b for b in ('ahead', 'level', 'behind') if b in keys] if title == 'bearing' else sorted(keys, key=binkey)):
                print(f"| {k} | {len(ga[k]) / na:.2f} | {len(gb[k]) / nb:.2f} | {rt(ga[k])} | {rt(gb[k])} |")
            print()
    print('### After the attempt (open field), p25 / p50 / p75\n')
    print('| measure | label | NFL | sim |'); print('|---|---|---|---|')
    qs = lambda x, d: ' / '.join(f"{sorted(x)[int(p * (len(x) - 1))]:.{d}f}" for p in (.25, .5, .75)) + f" (n {len(x)})" if x else '-'
    oa, ob = [r for r in A if is_open(r)], [r for r in B if is_open(r)]
    for title, k, d in AFTER:
        for lab in ('missed', 'made'):
            sel = lambda v: [r[k] for r in v if r.get(k) is not None and ((r['kind'] == 'missed') == (lab == 'missed'))]
            print(f"| {title} | {lab} | {qs(sel(oa), d)} | {qs(sel(ob), d)} |")
    print()


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'dump-nfl':
        weeks = [int(w) for w in sys.argv[5].split(',')] if len(sys.argv) > 5 else list(range(1, 10))
        dump_nfl(sys.argv[2], sys.argv[3], sys.argv[4], weeks)
    elif cmd == 'compare':
        compare(sys.argv[2], sys.argv[3])
    elif cmd == 'rows':
        rows(sys.argv[2], sys.argv[3])
    else:
        tables(sys.argv[2])
