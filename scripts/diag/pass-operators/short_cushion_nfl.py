"""NFL twin of scripts/diag/risk/short-cushion.ts (BDB 2025 raw tracking, read in place from the archive zip). Non-PA
drop-backs, pff_passCoverage Cover-3 (any variant). No. 1 = the widest offensive player on his side of the offense's
centre at the snap, with PFF routeRan HITCH / OUT / CURL / COMEBACK; his corner = the defensive back (CB/SS/FS/DB)
nearest him at the snap. At the break (the first frame after he has run over 3 yd/s upfield that his upfield speed
drops below 1.5 or his lateral speed passes his upfield speed; s along dir), ball not yet thrown: the corner's depth
over him and distance, and the break time. When he is the target (wasTargettedReceiver): completion (passResult C),
yards per target (yardsGained, 0 if not complete) and per catch.
usage: python3 -I scripts/diag/pass-operators/short_cushion_nfl.py ARCHIVE.zip [weeks=1,2,3]"""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'big-data-bowl-data/'
wa = [a for a in sys.argv[2:] if a.startswith('weeks=')]
weeks = [int(w) for w in (wa[0].split('=')[1] if wa else '1,2,3').split(',')]
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
plays = {}
for r in rd('plays.csv'):
    if r['isDropback'] in ('TRUE', 'True', '1') and r['playAction'] not in ('TRUE', 'True', '1') and 'cover-3' in (r['pff_passCoverage'] or '').lower().replace(' ', '-') and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(poss=r['possessionTeam'], res=r['passResult'], yds=float(r['yardsGained'] or 0))
DBS = {r['nflId'] for r in rd('players.csv') if r['position'] in ('CB', 'SS', 'FS', 'DB')}
ROUTES = {'HITCH', 'OUT', 'CURL', 'COMEBACK'}
route, tgt = {}, {}
for r in rd('player_play.csv'):
    k = (r['gameId'], r['playId'])
    if k in plays and r['routeRan'] in ROUTES: route[(k, r['nflId'])] = r['routeRan']; tgt[(k, r['nflId'])] = r.get('wasTargettedReceiver') in ('1', 'TRUE', 'True')
rows = []
for w in weeks:
    by = C.defaultdict(list)
    for r in rd(f'tracking_week_{w}.csv'):
        k = (r['gameId'], r['playId'])
        if k in plays: by[k].append(r)
    for k, R in by.items():
        fr = C.defaultdict(dict); ev = {}; ball = {}
        for r in R:
            f = int(r['frameId'])
            if r['event'] not in ('', 'NA') and r['event'] not in ev: ev[r['event']] = f
            if r['nflId'] in ('', 'NA'): ball[f] = float(r['x']); continue
            fr[f][r['nflId']] = r
        snap = ev.get('ball_snap'); rel = ev.get('pass_forward') or ev.get('qb_sack') or 10 ** 9
        if snap is None or snap not in fr: continue
        sg = 1 if R[0]['playDirection'] == 'right' else -1
        off = [r for r in fr[snap].values() if r['club'] == plays[k]['poss'] and r.get('position', '') != 'QB']
        if not off: continue
        cy = sum(float(r['y']) for r in off) / len(off)
        for (kk, pid), rt in route.items():
            if kk != k or pid not in fr[snap]: continue
            my0 = float(fr[snap][pid]['y']); side = 1 if my0 >= cy else -1
            wid = max((abs(float(r['y']) - cy) for r in off if (float(r['y']) - cy) * side > 0), default=0)
            if abs(my0 - cy) < wid - 1e-6: continue
            dd = [(math.hypot(float(r['x']) - float(fr[snap][pid]['x']), float(r['y']) - my0), i) for i, r in fr[snap].items() if r['club'] != plays[k]['poss'] and i in DBS]
            if not dd: continue
            cid = min(dd)[1]; up = False; brk = None
            for f in sorted(fr):
                if f <= snap or pid not in fr[f] or cid not in fr[f]: continue
                m = fr[f][pid]
                if m['s'] in ('', 'NA') or m['dir'] in ('', 'NA'): continue
                vx = float(m['s']) * math.sin(math.radians(float(m['dir']))) * sg; vy = abs(float(m['s']) * math.cos(math.radians(float(m['dir']))))
                if vx > 3: up = True
                if up and (vx < 1.5 or vy > vx):
                    c = fr[f][cid]
                    brk = dict(t=(f - snap) / 10, over=(float(c['x']) - float(m['x'])) * sg, dist=math.hypot(float(c['x']) - float(m['x']), float(c['y']) - float(m['y'])), held=f < rel)
                    break
            rows.append(dict(rt=rt, brk=brk, target=tgt[(k, pid)], caught=plays[k]['res'] == 'C', yds=plays[k]['yds']))
    print(f'week {w} done', file=sys.stderr)
q = lambda v: '/'.join(f'{sorted(v)[int(p * (len(v) - 1))]:.1f}' for p in (.25, .5, .75)) if len(v) >= 5 else '-'
mean = lambda v: f'{sum(v) / len(v):.2f}' if v else '-'
print('== NFL: No. 1 short/intermediate breaking routes vs Cover 3, his corner at the break; targets')
for grp in (('HITCH',), ('OUT', 'CURL'), ('COMEBACK',)):
    V = [r for r in rows if r['rt'] in grp]; B = [r for r in V if r['brk'] and r['brk']['held']]; T = [r for r in V if r['target']]; Cc = [r for r in T if r['caught']]
    print(f"   {'/'.join(grp):<18} n {len(V):3d} | at the break (ball held) n {len(B)}: over him {q([r['brk']['over'] for r in B])} | distance {q([r['brk']['dist'] for r in B])} | break at {q([r['brk']['t'] for r in B])} s | targeted {len(T)}: complete {len(Cc)} ({100 * len(Cc) / len(T) if T else 0:.0f}%), yards per target {mean([r['yds'] if r['caught'] else 0 for r in T])}, per catch {mean([r['yds'] for r in Cc])}")
