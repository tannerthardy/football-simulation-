"""Quarters apex leverage against No. 2 and a flat back, through time (BDB 2025, read in place; PFF's call and job pick
the plays and the apex, movement is from tracking). Plays: pff_passCoverage Quarters or Cover-6 (both halves kept,
labelled), non-PA drop-backs, thrown or not. Per side of the ball: the apex = the side's one defender with PFF job CF
(curl-flat); No. 2 = the second eligible from that sideline at the snap; the back = an RB/FB who releases to that side
(2+ yd outside the ball and moving out by 2.0 s, under 4 yd deep). The Mike = the defender with job HOL or HC nearest
the ball's y. At 0.5 / 1.0 / 1.5 / 2.0 / 2.5 s (frames that exist): the apex's depth past the line, his `out` (toward
that sideline) relative to No. 2 and to the back (+ = outside), his depth over the back; the Mike's depth and his out
relative to No. 2. Split: No. 2 vertical (depth gain > 5 by 2 s) with / without a flat back.
usage: python3 -I scripts/diag/pass-operators/apex_leverage_nfl.py ARCHIVE.zip [weeks=1,...,9]"""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); D = 'big-data-bowl-data/'
wa = [a for a in sys.argv[2:] if a.startswith('weeks=')]
weeks = [int(w) for w in (wa[0].split('=')[1] if wa else '1,2,3,4,5,6,7,8,9').split(',')]
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(D + n), encoding='utf-8'))
plays = {}
for r in rd('plays.csv'):
    cov = r['pff_passCoverage'] or ''
    if r['isDropback'] in ('TRUE', 'True', '1') and r['playAction'] not in ('TRUE', 'True', '1') and ('Quarters' in cov or 'Cover-6' in cov or 'Cover 6' in cov) and r['playNullifiedByPenalty'] != 'Y':
        plays[(r['gameId'], r['playId'])] = dict(poss=r['possessionTeam'], cov=cov)
pos = {r['nflId']: r['position'] for r in rd('players.csv')}
job = C.defaultdict(dict)
for r in rd('player_play.csv'):
    k = (r['gameId'], r['playId'])
    if k in plays and r['pff_defensiveCoverageAssignment'] not in ('', 'NA'): job[k][r['nflId']] = r['pff_defensiveCoverageAssignment']
TS = (0.5, 1.0, 1.5, 2.0, 2.5)
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
            if r['nflId'] in ('', 'NA'): ball[f] = (float(r['x']), float(r['y'])); continue
            fr[f][r['nflId']] = r
        snap = ev.get('ball_snap')
        if snap is None or snap not in ball or snap not in fr: continue
        los, by0 = ball[snap]; sg = 1 if R[0]['playDirection'] == 'right' else -1
        P = lambda f, i: (( float(fr[f][i]['x']) - los) * sg, float(fr[f][i]['y'])) if f in fr and i in fr[f] else None
        off = [i for i, r in fr[snap].items() if r['club'] == plays[k]['poss'] and pos.get(i) in ('WR', 'TE', 'RB', 'FB')]
        J = job.get(k, {})
        for side in (1, -1):
            cf = [i for i, j in J.items() if j in ('CFL', 'CFR') and P(snap, i) and (P(snap, i)[1] - by0) * side > 0]
            if len(cf) != 1: continue
            apex = cf[0]
            recv = sorted([i for i in off if pos.get(i) in ('WR', 'TE') and (P(snap, i)[1] - by0) * side > 0], key=lambda i: -(P(snap, i)[1] - by0) * side)
            if len(recv) < 2: continue
            two = recv[1]
            out = lambda p: (p[1] - by0) * side
            backs = [i for i in off if pos.get(i) in ('RB', 'FB')]
            f2 = snap + 20
            back = next((b for b in backs if P(f2, b) and out(P(f2, b)) > 2 and P(f2, b)[0] < 4 and P(f2 - 3, b) and out(P(f2, b)) - out(P(f2 - 3, b)) > 0.4), None)
            mikes = [i for i, j in J.items() if j in ('HOL', 'HCL', 'HCR') and P(snap, i)]
            mike = min(mikes, key=lambda i: abs(P(snap, i)[1] - by0)) if mikes else None
            if not P(f2, two) or not P(snap, two): continue
            vert = P(f2, two)[0] - P(snap, two)[0] > 5
            row = dict(vert=vert, back=back is not None, cov='C6' if '6' in plays[k]['cov'] else 'Q', t={})
            for tt in TS:
                f = snap + round(tt * 10)
                a, b2 = P(f, apex), P(f, two)
                if not a or not b2: continue
                e = dict(depth=a[0], out2=out(a) - out(b2))
                if back is not None and P(f, back): e['outB'] = out(a) - out(P(f, back)); e['overB'] = a[0] - P(f, back)[0]
                if mike is not None and P(f, mike): e['mdepth'] = P(f, mike)[0]; e['mout2'] = out(P(f, mike)) - out(b2)
                row['t'][tt] = e
            rows.append(row)
    print(f'week {w}: {len(rows)}', file=sys.stderr)
q = lambda v: '/'.join(f'{sorted(v)[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75)) if len(v) >= 5 else '-'
print(f'== NFL quarters / Cover 6 apex (PFF CF) by side, n {len(rows)} (C6 {sum(r["cov"] == "C6" for r in rows)})')
for lab, F in (('No. 2 vertical, no flat back', lambda r: r['vert'] and not r['back']), ('No. 2 vertical, flat back', lambda r: r['vert'] and r['back']),
               ('No. 2 not vertical, flat back', lambda r: not r['vert'] and r['back'])):
    V = [r for r in rows if F(r)]
    print(f'   {lab} n {len(V)}')
    for tt in TS:
        E = [r['t'][tt] for r in V if tt in r['t']]
        if len(E) < 5: continue
        line = f'      {tt:.1f} s | apex depth {q([e["depth"] for e in E])} | out vs No. 2 {q([e["out2"] for e in E])}'
        EB = [e for e in E if 'outB' in e]
        if EB: line += f' | out vs back {q([e["outB"] for e in EB])}, over back {q([e["overB"] for e in EB])}'
        EM = [e for e in E if 'mdepth' in e]
        if EM: line += f' | Mike depth {q([e["mdepth"] for e in EM])}, out vs No. 2 {q([e["mout2"] for e in EM])}'
        print(line)
