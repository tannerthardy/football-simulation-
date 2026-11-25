# Where does the NFL's median-under-capacity come from? (Rules #774, effort-as-role.) Ball-held route speed as a SHARE of that receiver's own top-decile speed (his p90 over all his held-route frames, s >= 1 yd/s,
# 0.5 to 3.5 s after the snap, all routes), BDB 2025 weeks given, drop-backs with a pass_forward, coverage from the charting column (plays.pff_manZone: Man / Zone), WR and TE (and RB) apart.
#   a) targeted on the play vs not   b) man vs zone   c) time since the snap (0.5 s bins)   d) for breaking routes (route_break.py's break, turn >= 60 deg): the last 1.0 s into the break: speed share at
#   tb-1.0..-0.5 and tb-0.5..0, and the distance to the vertex at which he is below 90% of his cruise (plant_brake.py's onset).
#   python3 -I scripts/diag/route-speed/nfl_effort.py OUT.json WEEK [WEEK ...]      report: python3 -I scripts/diag/route-speed/nfl_effort.py report OUT.json
import csv, sys, json, math, statistics as st, collections as C
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import route_break as rb, plant_brake as pb
D = 'data/raw/bdb2025/big-data-bowl-data'
def q(v, p): v = sorted(v); return v[min(len(v) - 1, int(p * (len(v) - 1) + 0.5))] if v else float('nan')
def collect(out, weeks):
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
    play = {}
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        if r['isDropback'] in ('TRUE', 'True') and r['pff_manZone'] in ('Man', 'Zone'): play[(r['gameId'], r['playId'])] = (r['pff_manZone'], float(r['absoluteYardlineNumber']))
    route = {}; targeted = set()
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play: continue
        if r['routeRan'] not in ('', 'NA') and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = r['routeRan']
        if r['wasTargettedReceiver'] in ('1', '1.0', 'TRUE', 'True'): targeted.add((k, r['nflId']))
    frames = []   # (nflId, group, targeted, cov, t, s, route)
    breaks = []   # (nflId, group, targeted, cov, route, turn, sh1, sh2, onset_dist)
    tracks = {}
    for w in weeks:
        snap = {}; thrown = {}; trk = C.defaultdict(list)
        for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
            k = (r['gameId'], r['playId'])
            if k not in play or r['displayName'] == 'football': continue
            if r['event'] == 'ball_snap': snap.setdefault(k, int(r['frameId']))
            if r['event'] in ('pass_forward', 'qb_sack', 'qb_strip_sack', 'run', 'handoff'): thrown.setdefault(k, int(r['frameId']))
            key = (k, r['nflId'])
            if key in route and pos.get(r['nflId']) in ('WR', 'TE', 'RB'): trk[key].append((int(r['frameId']), float(r['x']), float(r['y']), float(r['s']), r['playDirection']))
        for (k, i), F in trk.items():
            if k not in snap or k not in thrown: continue
            s0 = snap[k]; end = thrown[k]; F.sort(); sgn = 1 if F[0][4] == 'right' else -1
            g = pos[i]; tg = (k, i) in targeted; cov = play[k][0]
            T = []
            for f, x, y, s, d in F:
                if s0 + 5 <= f < end:
                    frames.append((i, g, tg, cov, (f - s0) / 10, s, route[(k, i)]))
                if s0 <= f < end: T.append(((f - s0) / 10, sgn * (x - play[k][1]), sgn * y, s))
            if len(T) >= 25 and T[-1][0] >= 2.4:
                res = pb.profile([(t, x, y) for t, x, y, s in T], min(T[-1][0], 4.5))
                if res and res['turn'] >= 60:
                    tb = res['ta_off']  # not used for window; recompute break time below
                    breaks.append(dict(i=i, g=g, tg=tg, cov=cov, route=route[(k, i)], turn=res['turn'], cruise=res['cruise'], onset=res['onset_dist'], onset_t=res['onset_before'], va=res['v_arrive'], prof=res['prof']))
        print('week', w, len(frames), len(breaks), file=sys.stderr)
    byp = C.defaultdict(list)
    for i, g, tg, cov, t, s, r in frames:
        if s >= 1.0: byp[i].append(s)
    top = {i: q(v, 0.9) for i, v in byp.items() if len(v) >= 60}
    json.dump(dict(frames=[f for f in frames if f[0] in top and f[5] >= 0.0], top=top, breaks=[b for b in breaks if b['i'] in top]), open(out, 'w'))
def report(path):
    d = json.load(open(path)); top = d['top']
    F = [(g, tg, cov, t, s / top[i], r) for i, g, tg, cov, t, s, r in d['frames'] if str(i) in top or i in top]
    top = {str(k): v for k, v in top.items()}
    F = [(g, tg, cov, t, s / top[str(i)], r) for i, g, tg, cov, t, s, r in d['frames'] if str(i) in top]
    for g in ('WR', 'TE', 'RB'):
        S = [f for f in F if f[0] == g and f[4] < 1.6]
        if len(S) < 500: continue
        print(f'== {g}: {len(S)} held-route frames (speed over his own top decile); medians / top decile of the share')
        for lab, sel in (('targeted', lambda f: f[1]), ('not targeted', lambda f: not f[1]), ('man', lambda f: f[2] == 'Man'), ('zone', lambda f: f[2] == 'Zone')):
            row = []
            for a, b in ((0.5, 1.0), (1.0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.0), (3.0, 3.5)):
                v = [f[4] for f in S if sel(f) and a <= f[3] < b and f[4] >= 0.0]
                row.append(f'{a:.1f}-{b:.1f}s {q(v, .5):.2f} (n {len(v)})' if len(v) >= 30 else f'{a:.1f}-{b:.1f}s   -')
            print(f'  {lab:13s} ' + ' | '.join(row))
        for tg in (True, False):
            for cov in ('Man', 'Zone'):
                row = []
                for a, b in ((1.0, 2.0), (2.0, 3.0)):
                    v = [f[4] for f in S if f[1] == tg and f[2] == cov and a <= f[3] < b]
                    row.append(f'{a:.0f}-{b:.0f}s {q(v, .5):.2f} (n {len(v)})' if len(v) >= 30 else f'{a:.0f}-{b:.0f}s   -')
                print(f'  {"targeted" if tg else "not targeted":13s} {cov:5s} ' + ' | '.join(row))
    B = [b for b in d['breaks'] if str(b['i']) in top]
    print(f'== breaking routes (turn >= 60 deg), n {len(B)}: speed share into the break')
    for g in ('WR', 'TE', 'RB'):
        for tg in (True, False):
            for cov in ('Man', 'Zone'):
                S = [b for b in B if b['g'] == g and b['tg'] == tg and b['cov'] == cov]
                if len(S) < 20: continue
                sh = lambda k: [b['prof'][k][1] / top[str(b['i'])] for b in S if b['prof'][k][1] is not None]
                print(f'  {g} {"targeted" if tg else "not targeted":12s} {cov:5s} n {len(S):4d} | cruise share {q([b["cruise"] / top[str(b["i"])] for b in S], .5):.2f} | speed share at tb-1.0 {q(sh(1), .5):.2f}, tb-0.5 {q(sh(3), .5):.2f}, tb {q(sh(5), .5):.2f} | onset {q([b["onset_t"] for b in S], .5):.2f} s / {q([b["onset"] for b in S], .5):.1f} yd before the vertex | arrival {q([b["va"] for b in S], .5):.1f} yd/s')
def fromsim(inp, out):
    R = json.load(open(inp)); frames = []; breaks = []
    for r in R:
        T = [(t, x, y, sp) for t, x, y, sp in r['tr']]
        for t, x, y, sp in T:
            if t >= 0.5: frames.append((r['id'], r['g'], r['tg'], r['cov'], t, sp, r['route']))
        if len(T) >= 25 and T[-1][0] >= 2.4:
            res = pb.profile([(t, x, y) for t, x, y, sp in T], min(T[-1][0], 4.5))
            if res and res['turn'] >= 60: breaks.append(dict(i=r['id'], g=r['g'], tg=r['tg'], cov=r['cov'], route=r['route'], turn=res['turn'], cruise=res['cruise'], onset=res['onset_dist'], onset_t=res['onset_before'], va=res['v_arrive'], prof=res['prof']))
    byp = C.defaultdict(list)
    for i, g, tg, cov, t, s, r in frames:
        if s >= 1.0: byp[i].append(s)
    top = {i: q(v, 0.9) for i, v in byp.items() if len(v) >= 60}
    json.dump(dict(frames=[f for f in frames if f[0] in top], top=top, breaks=[b for b in breaks if b['i'] in top]), open(out, 'w'))
if __name__ == '__main__':
    if sys.argv[1] == 'fromsim': fromsim(sys.argv[2], sys.argv[3]); sys.exit()
    if sys.argv[1] == 'report': report(sys.argv[2])
    else: collect(sys.argv[1], sys.argv[2:])
