"""Pre-snap quick-game looks, 2026-11-14 (Rules + Coaching for the QB lane's pre-snap build): how often each look that
selects a side or an alert occurs at the snap. One operator on NFL tracking and sim exports, geometry only (no
position labels), frame 0 (the snap), x downfield from the line, y across.
  receivers: offense, not QB / line (group OL, or NFL T/G/C), not in the backfield (x < -2 within 4 yd of the ball);
             per side (sign of y - ball), #1 the widest, #2 the next.
  shell:     defenders 9+ yd deep inside the numbers (12-41.3 yd across): 0 / 1 / 2+ (zero / one-high / two-high).
  corner:    over a detached #1 (9+ yd from the ball, a wideout; a side without one has no corner), the nearest defender within 4 yd of him across and short of 9 yd deep; cushion = his depth;
             press under 2.2 yd (screenLook's); leverage inside / outside of #1 by more than 0.5 yd, else head-up.
  apex:      over #2, the nearest other defender 1.5-9 yd deep within 4 yd across: in the box if within 5.5 yd of the
             ball across, else walked out.
  numbers:   per side, defenders 1.5-9 yd deep wider than 5 yd from the ball vs receivers wider than 5 yd (screenLook's).
  soft:      a corner cushion of 5+ yd (the hitch is run at 4-5 yd, Maurek et al.; deeper than the hitch is a hitch).
Population: dropbacks that are not play action, designed movement or screens (NFL: TRADITIONAL, playAction FALSE, no
SCREEN route; sim: concept name). With --quick, the sim side is split by the called quick concept.
usage: python3 -I presnap-looks.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
SCR = set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'SCREEN': SCR.add(f"{r['gameId']}-{r['playId']}")
SKIP = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|\+pa\b|bubble|tunnel|slip|now_', re.I)
QUICK = ['slant_flat', 'stick', 'quick_outs', 'hitches', 'double_slants', 'fade_flat', 'hitch_out', 'seam_slant', 'trips_stick', 'seam_hitch']
OL = {'T', 'G', 'C', 'OT', 'OG'}
def look(p, by):
    pos = {j: p.pos(j, 0) for j in range(p.n)}
    if any(v[0] is None for v in pos.values()): return None
    O = [j for j, pl in enumerate(p.players) if pl['side'] == 'O']
    qb = next((j for j in O if p.players[j].get('group') == 'QB' or p.players[j].get('pos') == 'QB'), None)
    rec = [j for j in O if j != qb and p.players[j].get('group') != 'OL' and p.players[j].get('pos') not in OL
           and not (pos[j][0] < -2 and abs(pos[j][1] - by) < 4)]
    Dd = [j for j, pl in enumerate(p.players) if pl['side'] == 'D']
    deep = [d for d in Dd if pos[d][0] >= 9 and 12 <= pos[d][1] <= 41.3]
    out = {'shell': min(len(deep), 2), 'sides': {}}
    for s in (1, -1):
        side = sorted([j for j in rec if (pos[j][1] - by) * s > 0], key=lambda j: -abs(pos[j][1] - by))
        r = {'n': len(side), 'wide_rec': sum(1 for j in rec if (pos[j][1] - by) * s > 5),
             'wide_def': sum(1 for d in Dd if 1.5 <= pos[d][0] < 9 and (pos[d][1] - by) * s > 5),
             'deep_side': sum(1 for d in deep if (pos[d][1] - by) * s > 0)}
        if side and abs(pos[side[0]][1] - by) > 9:
            w = side[0]; c = [d for d in Dd if pos[d][0] < 9 and abs(pos[d][1] - pos[w][1]) <= 4]
            if c:
                cb = min(c, key=lambda d: (pos[d][0] - pos[w][0]) ** 2 + (pos[d][1] - pos[w][1]) ** 2)
                lev = (pos[cb][1] - pos[w][1]) * s
                r.update(cushion=pos[cb][0], press=pos[cb][0] < 2.2, lev='out' if lev > 0.5 else 'in' if lev < -0.5 else 'head')
            else: cb = None; r.update(cushion=None, press=False, lev='none')
            if len(side) > 1:
                t = side[1]; a = [d for d in Dd if d != cb and 1.5 <= pos[d][0] < 9 and abs(pos[d][1] - pos[t][1]) <= 4]
                if a:
                    ap = min(a, key=lambda d: (pos[d][0] - pos[t][0]) ** 2 + (pos[d][1] - pos[t][1]) ** 2)
                    r['apex'] = 'box' if abs(pos[ap][1] - by) <= 5.5 else 'out'
                else: r['apex'] = 'none'
        out['sides'][s] = r
    out['field'] = 1 if by < 26.65 else -1        # the wide side is away from the near sideline
    return out
pc = lambda a, n: f"{100 * a / n:5.1f}" if n else '  -  '
for arg in args:
    name, paths = arg.split('=', 1); L = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); con = str((raw.get('cell') or {}).get('concept') or '')
            if pf is not None:
                if pf['dropbackType'] != 'TRADITIONAL' or pf['playAction'] == 'TRUE' or raw['id'] in SCR: continue
                grp = 'NFL'
            else:
                if SKIP.search(con): continue
                grp = con if con in QUICK else 'other'
            lk = look(Play(raw), raw.get('ball_y'))
            if lk: L['all'].append(lk); L[grp].append(lk)
    print(f"== {name}")
    print('group            n  zero 1-high 2-high | both press  one press | soft(5+): both  one  none | clear softer side (1+ yd) | '
          'apex walked out: both one none | outnumbered side (def > rec) | 3x1 backside #1 pressed, no deep help')
    for g in ['all'] + [q for q in QUICK if q in L] + ['other']:
        v = L.get(g) or []
        if not v: continue
        n = len(v); C = collections.Counter()
        for lk in v:
            C[lk['shell']] += 1; S = lk['sides']
            pr = sum(S[s].get('press', False) for s in S); C['press2'] += pr == 2; C['press1'] += pr == 1
            soft = [S[s].get('cushion') is not None and S[s]['cushion'] >= 5 for s in S]; C['soft' + str(sum(soft))] += 1
            cu = [S[s].get('cushion') for s in S]
            C['clear'] += None not in cu and abs(cu[0] - cu[1]) >= 1
            ao = sum(S[s].get('apex') == 'out' for s in S); C['apex' + str(ao)] += 1
            C['outnum'] += any(S[s]['wide_def'] > S[s]['wide_rec'] and S[s]['wide_rec'] > 0 for s in S)
            for s in S:
                if S[s]['n'] == 1 and S[-s]['n'] >= 3:
                    C['3x1'] += 1; C['iso'] += S[s].get('press', False) and S[s]['deep_side'] == 0
        print(f"{g:14s} {n:5d}  {pc(C[0], n)} {pc(C[1], n)} {pc(C[2], n)} |  {pc(C['press2'], n)}     {pc(C['press1'], n)} |      {pc(C['soft2'], n)} {pc(C['soft1'], n)} {pc(C['soft0'], n)} |   {pc(C['clear'], n)}"
              f"                   |       {pc(C['apex2'], n)} {pc(C['apex1'], n)} {pc(C['apex0'], n)} |   {pc(C['outnum'], n)}                    |  {pc(C['iso'], C['3x1'])} of {C['3x1']} 3x1")
