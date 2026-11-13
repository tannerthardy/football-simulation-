"""How tight NFL verticals and hitches are at the moment our QB moves off them (BDB 2025 raw tracking, read in place
from the archive zip). Non-PA drop-backs that were thrown. For receivers whose PFF routeRan is GO (gos and seams) or
HITCH: at a sample time before the release (GO 2.85 s, HITCH 2.15 s after the snap; the play is dropped if the ball is
already out), if he is in the depth window (GO 12-15 yd past the line, HITCH 4-7 yd), the distance to his nearest
defender; by shell (pff_passCoverage, grouped) and man/zone. Same quantity as scripts/diag/risk/vert-sep.ts on the sim.
usage: python3 -I scripts/diag/pass-operators/vert_sep_nfl.py ARCHIVE.zip [weeks=1,2,3]"""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'big-data-bowl-data/'
weeks = [int(w) for w in (sys.argv[2].split('=')[1] if len(sys.argv) > 2 else '1,2,3').split(',')]
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
plays = {}
for r in rd('plays.csv'):
    if r['isDropback'] in ('TRUE', 'True', '1') and r['playAction'] not in ('TRUE', 'True', '1') and r['passResult'] in ('C', 'I', 'IN') and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(poss=r['possessionTeam'], cov=r['pff_passCoverage'] or 'NA', mz=r['pff_manZone'] or 'NA')
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
            d = min(math.hypot(float(r['x']) - float(me['x']), float(r['y']) - float(me['y'])) for r in defs)
            out[(rt, shell(plays[k]['cov']), plays[k]['mz'])].append(d)
    print(f'week {w} done', file=sys.stderr)
q = lambda v: '/'.join(f'{sorted(v)[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75)) if len(v) >= 5 else '-'
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
