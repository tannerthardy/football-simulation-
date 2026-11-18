"""The Cover 2 hole shot, NFL side (Integration, 2026-11-18): Cover 2 throws to a vertical #1 (the target is the widest
receiver on his side at the snap) beyond 15 air yards, no play action. Per throw: the corner (PFF FL / FR on the target's
side) and the half safety (2L / 2R on that side): contact on #1 at the release (closest approach in the first 1.0 s),
#1's lateral reroute at 1.0 s, the corner's depth under #1 at the throw (yd, + = shallower than #1), flight time, each
defender's distance to #1 at the ball's arrival, caught, yards, YAC, and who tackled. JSONL out, one row per throw;
`table` summarizes NFL and sim rows (scripts/diag/coverage/hole-shot.mts writes the same row).
  python3 -I hole_shot.py nfl <bdb2025 dir> <out.jsonl> [weeks]
  python3 -I hole_shot.py table <rows.jsonl> [...]
"""
import csv, json, math, sys, statistics as st
from collections import defaultdict


def nfl(src, out, weeks):
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{src}/players.csv'))}
    plays = {(p['gameId'], p['playId']): p for p in csv.DictReader(open(f'{src}/plays.csv'))
             if p['pff_passCoverage'] == 'Cover-2' and p['playAction'] == 'FALSE' and p['passResult'] in ('C', 'I', 'IN')
             and p['passLength'] not in ('', 'NA') and float(p['passLength']) >= 15}
    pp = defaultdict(dict)
    for r in csv.DictReader(open(f'{src}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in plays:
            pp[k][r['nflId']] = r
    frames = defaultdict(list)
    for w in weeks.split(','):
        for f in csv.DictReader(open(f'{src}/tracking_week_{w}.csv')):
            if (f['gameId'], f['playId']) in plays:
                frames[(f['gameId'], f['playId'])].append(f)
    n = 0
    with open(out, 'w') as o:
        for k, fs in frames.items():
            p = plays[k]
            tgt = next((i for i, r in pp[k].items() if r['wasTargettedReceiver'] == '1'), None)
            if not tgt:
                continue
            snap = next((int(f['frameId']) for f in fs if f['frameType'] == 'SNAP'), None)
            thr = next((int(f['frameId']) for f in fs if f['event'] in ('pass_forward',)), None)
            arr = next((int(f['frameId']) for f in fs if f['event'] in ('pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete')), None)
            if snap is None or thr is None or arr is None:
                continue
            ball = next((f for f in fs if f['displayName'] == 'football' and int(f['frameId']) == snap), None)
            if not ball:
                continue
            dirn = 1 if fs[0]['playDirection'] == 'right' else -1
            los, by = float(ball['x']), float(ball['y'])
            at = defaultdict(dict)
            for f in fs:
                if f['displayName'] != 'football':
                    at[f['nflId']][int(f['frameId'])] = (float(f['x']), float(f['y']))
            if snap not in at.get(tgt, {}):
                continue
            side = 1 if at[tgt][snap][1] > by else -1
            off = [i for i in at if pp[k].get(i, {}).get('teamAbbr') == p['possessionTeam'] and pos.get(i) in ('WR', 'TE', 'RB', 'FB') and snap in at[i]]
            mine = [i for i in off if (at[i][snap][1] - by) * side > 0]
            if not mine or max(mine, key=lambda i: abs(at[i][snap][1] - by)) != tgt:
                continue
            def lab(lbls):
                c = [i for i, r in pp[k].items() if r['pff_defensiveCoverageAssignment'] in lbls and snap in at.get(i, {})
                     and (at[i][snap][1] - by) * side > 0]
                return c[0] if c else None
            cb, sf = lab(('FL', 'FR')), lab(('2L', '2R'))
            if not cb or not sf:
                continue
            d = lambda a, b, fr: math.dist(at[a][fr], at[b][fr]) if fr in at[a] and fr in at[b] else None
            jam = min(x for x in (d(cb, tgt, fr) for fr in range(snap, snap + 11)) if x is not None)
            rr = abs(at[tgt].get(snap + 10, at[tgt][snap])[1] - at[tgt][snap][1])
            under = (at[tgt][thr][0] - at[cb][thr][0]) * dirn if thr in at[cb] and thr in at[tgt] else None
            cbV = (at[cb][thr][0] - at[cb][thr - 3][0]) * dirn / 0.3 if thr in at[cb] and thr - 3 in at[cb] else None
            cbV1 = (at[cb][thr + 10][0] - at[cb][thr + 7][0]) * dirn / 0.3 if thr + 10 in at[cb] and thr + 7 in at[cb] else None
            r = pp[k][tgt]
            tackler = [pos.get(i) for i, x in pp[k].items() if x['soloTackle'] == '1' or x['tackleAssist'] == '1' or x['assistedTackle'] == '1']
            o.write(json.dumps({'src': 'NFL', 'jam': jam, 'reroute': rr, 'under': under, 'flight': (arr - thr) / 10, 'cbV': cbV, 'cbV1': cbV1,
                                'cbAtArr': d(cb, tgt, arr), 'sAtArr': d(sf, tgt, arr), 'caught': p['passResult'] == 'C',
                                'int': p['passResult'] == 'IN', 'yards': float(p['yardsGained'] or 0),
                                'yac': float(r['yardageGainedAfterTheCatch'] or 0) if p['passResult'] == 'C' else None,
                                'tackler': tackler, 'air': float(p['passLength'])}) + '\n')
            n += 1
    print(n, 'NFL hole-shot throws')


def table(paths):
    g = defaultdict(list)
    for path in paths:
        for line in open(path):
            r = json.loads(line)
            g[r['src']].append(r)
    med = lambda v: f'{st.median(v):.1f}' if v else '-'
    print('| src | n | comp | yd/att | YAC/catch | 40+ | corner within 1 yd of #1 by 1.0 s | corner under #1 at throw, yd | flight, s | corner / safety to #1 at arrival, yd | tackled by CB / S |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for s, v in g.items():
        c = [r for r in v if r['caught']]
        t = [x for r in c for x in (r['tackler'] or [])]
        print(f"| {s} | {len(v)} | {len(c) / len(v):.2f} | {sum(r['yards'] for r in v) / len(v):.1f} | {med([r['yac'] for r in c if r['yac'] is not None])} | "
              f"{sum(r['yards'] >= 40 for r in v)} | {sum(r['jam'] < 1 for r in v) / len(v):.2f} | {med([r['under'] for r in v if r['under'] is not None])} | "
              f"{med([r['flight'] for r in v])} | {med([r['cbAtArr'] for r in v if r['cbAtArr'] is not None])} / {med([r['sAtArr'] for r in v if r['sAtArr'] is not None])} | "
              f"{sum(x in ('CB',) for x in t)} / {sum(x in ('SS', 'FS', 'S') for x in t)} |")


if __name__ == '__main__':
    if sys.argv[1] == 'nfl':
        nfl(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else '1')
    else:
        table(sys.argv[2:])
