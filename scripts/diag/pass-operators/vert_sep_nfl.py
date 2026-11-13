"""Where the corner is on an NFL go (vert_pos mode) and how tight NFL verticals and hitches are at the moment our QB moves off them (BDB 2025 raw tracking, read in place
from the archive zip). Non-PA drop-backs that were thrown. For receivers whose PFF routeRan is GO (gos and seams) or
HITCH: at a sample time before the release (GO 2.85 s, HITCH 2.15 s after the snap; the play is dropped if the ball is
already out), if he is in the depth window (GO 12-15 yd past the line, HITCH 4-7 yd), the distance to his nearest
defender; by shell (pff_passCoverage, grouped) and man/zone. Same quantity as scripts/diag/risk/vert-sep.ts on the sim.
usage: python3 -I scripts/diag/pass-operators/vert_sep_nfl.py ARCHIVE.zip [weeks=1,2,3] [--pos]
--pos: for GO runners against Cover 3 / Cover 4, the defensive back nearest him at the snap (his corner): at 1.5 / 2.0 /
2.85 s (before the release), depth over him (+ = deeper), lateral (+ = inside), distance; on top (> 1 yd deeper) /
hip to hip (within 1 yd) / trailing (> 1 yd shallower); upfield speed of the corner and the runner (s along dir)."""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'big-data-bowl-data/'
POS = '--pos' in sys.argv
wa = [a for a in sys.argv[2:] if a.startswith('weeks=')]
weeks = [int(w) for w in (wa[0].split('=')[1] if wa else '1,2,3').split(',')]
PP = C.defaultdict(list)
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
plays = {}
for r in rd('plays.csv'):
    if r['isDropback'] in ('TRUE', 'True', '1') and r['playAction'] not in ('TRUE', 'True', '1') and r['passResult'] in ('C', 'I', 'IN') and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(poss=r['possessionTeam'], cov=r['pff_passCoverage'] or 'NA', mz=r['pff_manZone'] or 'NA')
DBS = {r['nflId'] for r in rd('players.csv') if r['position'] in ('CB', 'SS', 'FS', 'DB')}
route = {}
for r in rd('player_play.csv'):
    k = (r['gameId'], r['playId'])
    if k in plays and r['routeRan'] in ('GO', 'HITCH'): route[(k, r['nflId'])] = r['routeRan']
WIN = {'GO': (2.85, 12, 15), 'HITCH': (2.15, 4, 7)}
def shell(c):
    t = c.lower().replace(' ', '').replace('-', '')
    for a, b in (('2man', 'cover2-man'), ('cover0', 'cover0'), ('cover1', 'cover1'), ('cover2', 'cover2'), ('cover3', 'cover3'), ('quarters', 'cover4'), ('cover6', 'cover6')):
        if a in t: return b
    return 'other'
out = C.defaultdict(list)
for w in weeks:
    rows = C.defaultdict(list)
    for r in rd(f'tracking_week_{w}.csv'):
        k = (r['gameId'], r['playId'])
        if k in plays: rows[k].append(r)
    for k, R in rows.items():
        ev = {}; fr = C.defaultdict(dict); ball = {}
        for r in R:
            f = int(r['frameId'])
            if r['event'] not in ('', 'NA') and r['event'] not in ev: ev[r['event']] = f
            if r['nflId'] in ('', 'NA'): ball[f] = float(r['x']); continue
            fr[f][r['nflId']] = r
        snap, rel = ev.get('ball_snap'), ev.get('pass_forward')
        if snap is None or rel is None or snap not in ball: continue
        los = ball[snap]; sg = 1 if R[0]['playDirection'] == 'right' else -1
        for (kk, pid), rt in route.items():
            if kk != k: continue
            t0, lo, hi = WIN[rt]; f = snap + round(t0 * 10)
            if f >= rel or f not in fr or pid not in fr[f]: continue
            me = fr[f][pid]; depth = (float(me['x']) - los) * sg
            if not (lo <= depth <= hi): continue
            defs = [r for i, r in fr[f].items() if r['club'] != plays[k]['poss'] and i != pid]
            if not defs: continue
            sh = shell(plays[k]['cov'])
            if POS and rt == 'GO' and sh in ('cover3', 'cover4') and snap in fr and pid in fr[snap]:
                s0 = fr[snap][pid]; by = ball.get(snap, None)
                dd = [(math.hypot(float(r['x']) - float(s0['x']), float(r['y']) - float(s0['y'])), i) for i, r in fr[snap].items() if r['club'] != plays[k]['poss'] and i in DBS]
                # No. 1: is he the widest offensive player on his side of the ball at the snap?
                bys = float(fr[snap][pid]['y']) if False else None
                bpos = [float(r['y']) for i, r in fr[snap].items() if r['club'] == plays[k]['poss']]
                cy = sum(bpos) / len(bpos) if bpos else 26.65
                my0 = float(s0['y']); side = 1 if my0 >= cy else -1
                wid = max((abs(float(r['y']) - cy) for i, r in fr[snap].items() if r['club'] == plays[k]['poss'] and (float(r['y']) - cy) * side > 0), default=0)
                is1 = abs(my0 - cy) >= wid - 1e-6
                if dd:
                    cid = min(dd)[1]; row = {'one': is1}
                    for lab, tt in (('1.5', 1.5), ('2.0', 2.0), ('2.85', 2.85)):
                        ff = snap + round(tt * 10)
                        if ff >= rel or ff not in fr or pid not in fr[ff] or cid not in fr[ff]: continue
                        m, c = fr[ff][pid], fr[ff][cid]
                        mx, my, cx2, cy2 = float(m['x']), float(m['y']), float(c['x']), float(c['y'])
                        over = (cx2 - mx) * sg; mid = 26.65
                        inside = (abs(my - mid) - abs(cy2 - mid))
                        up = lambda r: float(r['s']) * math.sin(math.radians(float(r['dir']))) * sg if r['s'] not in ('', 'NA') and r['dir'] not in ('', 'NA') else float('nan')
                        row[lab] = (over, inside, math.hypot(cx2 - mx, cy2 - my), up(c), up(m))
                    PP[sh].append(row)
            d = min(math.hypot(float(r['x']) - float(me['x']), float(r['y']) - float(me['y'])) for r in defs)
            out[(rt, shell(plays[k]['cov']), plays[k]['mz'])].append(d)
    print(f'week {w} done', file=sys.stderr)
q = lambda v: '/'.join(f'{sorted(v)[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75)) if len(v) >= 5 else '-'
if POS:
    for sh in ('cover3', 'cover4'):
        V = [r for r in PP[sh] if r.get('one') or '--all' in sys.argv]; print(f'== NFL {sh} (No. 1 only unless --all): GO runner vs his corner (DB nearest him at the snap), n {len(V)}')
        for lab in ('1.5', '2.0', '2.85'):
            W = [r[lab] for r in V if lab in r]
            if len(W) < 5: continue
            print(f'   {lab:>4} s n {len(W):3d} | over him {q([w[0] for w in W])} | inside {q([w[1] for w in W])} | distance {q([w[2] for w in W])} | on top {100*sum(w[0] > 1 for w in W)/len(W):.0f}% hip {100*sum(abs(w[0]) <= 1 for w in W)/len(W):.0f}% trailing {100*sum(w[0] < -1 for w in W)/len(W):.0f}% | |lateral| {q([math.sqrt(max(0, w[2] ** 2 - w[0] ** 2)) for w in W])} | upfield speed: corner {q([w[3] for w in W if w[3] == w[3]])} vs runner {q([w[4] for w in W if w[4] == w[4]])} yd/s')
print('== NFL: nearest defender to a GO / HITCH runner at the sample time, in the depth window (p25/p50/p75 yd)')
for rt in ('GO', 'HITCH'):
    allv = [d for (r, s, m), v in out.items() if r == rt for d in v]
    print(f'   {rt:<5} all n {len(allv):4d} | {q(allv)} | within 1.5 yd {100 * sum(d < 1.5 for d in allv) / max(1, len(allv)):.0f}%')
    for mz in ('Man', 'Zone'):
        v = [d for (r, s, m), L in out.items() if r == rt and m == mz for d in L]
        print(f'     {mz:<5} n {len(v):4d} | {q(v)}')
    for s in ('cover0', 'cover1', 'cover2-man', 'cover2', 'cover3', 'cover4', 'cover6', 'other'):
        v = [d for (r, ss, m), L in out.items() if r == rt and ss == s for d in L]
        if len(v) >= 10: print(f'       {s:<10} n {len(v):4d} | {q(v)}')
