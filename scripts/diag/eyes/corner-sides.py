"""Corner alignment by side, 2026-11-14 (Rules + Coaching, alignment rules): what sets each corner's depth and press
independently. One operator on NFL tracking and sim exports, geometry at the snap (presnap-looks.py's): plays with a
wideout (#1 9+ yd from the ball) on both sides; per side, the defender over #1 (nearest, within 4 yd across, short of
9 yd deep): press under 2.2 yd, else his cushion.
Per side: field or boundary (the wide side is away from the near sideline; the middle third of the field, ball within
3 yd of centre, is 'middle'), receivers to his side (1 / 2 / 3+), #1's split from the ball and his room to the sideline,
#1 on the ball (within 1.1 yd of the line) or off; per play: the coverage (NFL pff_passCoverage, sim the call; inferred,
weaker) and down and distance.
usage: python3 -I corner-sides.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
SCR = set()
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] == 'SCREEN': SCR.add(f"{r['gameId']}-{r['playId']}")
SKIP = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|\+pa\b|bubble|tunnel|slip|now_', re.I)
OL = {'T', 'G', 'C', 'OT', 'OG'}
def fam(c, nfl):
    c = c.lower()
    if nfl:
        for k, v in (('cover-0', 'c0'), ('cover-1', 'c1'), ('2-man', '2man'), ('cover-2', 'c2'), ('cover-3', 'c3'), ('quarters', 'c4'), ('cover 6', 'c6'), ('cover-6', 'c6')):
            if k in c: return v
        return 'other'
    for k, v in (('cover0', 'c0'), ('cover1', 'c1'), ('cover2man', '2man'), ('pounder', '2man'), ('finger', '2man'), ('rolex', '2man'), ('tampa', 'c2'), ('cover2', 'c2'), ('cover3', 'c3'), ('cover9', 'c3'), ('cover6', 'c6'), ('cover4', 'c4'), ('quarters', 'c4')):
        if k in c: return v
    return 'other'
def rows(raw, pf):
    p = Play(raw); by = raw.get('ball_y'); pos = {j: p.pos(j, 0) for j in range(p.n)}
    if by is None or any(v[0] is None for v in pos.values()): return []
    O = [j for j, pl in enumerate(p.players) if pl['side'] == 'O']
    qb = next((j for j in O if p.players[j].get('group') == 'QB' or p.players[j].get('pos') == 'QB'), None)
    rec = [j for j in O if j != qb and p.players[j].get('group') != 'OL' and p.players[j].get('pos') not in OL
           and not (pos[j][0] < -2 and abs(pos[j][1] - by) < 4)]
    Dd = [j for j, pl in enumerate(p.players) if pl['side'] == 'D']
    out = []
    for s in (1, -1):
        side = sorted([j for j in rec if (pos[j][1] - by) * s > 0], key=lambda j: -abs(pos[j][1] - by))
        if not side or abs(pos[side[0]][1] - by) <= 9: return []
        w = side[0]; c = [d for d in Dd if pos[d][0] < 9 and abs(pos[d][1] - pos[w][1]) <= 4]
        if not c: return []
        cb = min(c, key=lambda d: (pos[d][0] - pos[w][0]) ** 2 + (pos[d][1] - pos[w][1]) ** 2)
        room = (53.3 - pos[w][1]) if s > 0 else pos[w][1]
        fb = 'middle' if abs(by - 26.65) < 3 else ('field' if (by < 26.65) == (s > 0) else 'boundary')
        out.append(dict(press=pos[cb][0] < 2.2, cush=pos[cb][0], fb=fb, n=min(len(side), 3), split=abs(pos[w][1] - by), room=room,
                        onball=pos[w][0] > -1.1))
    return out
pc = lambda a, n: f"{100 * a / n:5.1f}" if n else '  -  '
for arg in args:
    name, paths = arg.split('=', 1); P = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id']); cell = raw.get('cell') or {}
            if pf is not None:
                if pf['dropbackType'] != 'TRADITIONAL' or pf['playAction'] == 'TRUE' or raw['id'] in SCR: continue
                cov = fam(pf['pff_passCoverage'], True); down, dist = int(pf['down']), int(pf['yardsToGo'])
            else:
                if SKIP.search(str(cell.get('concept') or '')): continue
                cov = fam(str(cell.get('coverage') or ''), False); down, dist = int(cell.get('down') or 1), int(cell.get('toGo') or 10)
            r = rows(raw, pf)
            if len(r) == 2: P.append((r, cov, down, dist))
    n = len(P); kinds = collections.Counter(sum(x['press'] for x in r) for r, *_ in P)
    print(f"== {name}: plays with a wideout each side {n}; corners pressed 0 / 1 / 2: {pc(kinds[0], n)} / {pc(kinds[1], n)} / {pc(kinds[2], n)}")
    # Per side: press rate by each variable (one at a time).
    S = [(x, cov, down, dist, r) for r, cov, down, dist in P for x in r]
    def tab(label, key, order):
        g = collections.defaultdict(list)
        for x, cov, down, dist, r in S: g[key(x, cov, down, dist)].append(x['press'])
        print(f"   press rate by {label}: " + '  '.join(f"{k} {pc(sum(g[k]), len(g[k]))}% (n {len(g[k])})" for k in order if g[k]))
    tab('field/boundary', lambda x, *a: x['fb'], ['field', 'boundary', 'middle'])
    tab('receivers to his side', lambda x, *a: x['n'], [1, 2, 3])
    tab('#1 on/off the ball', lambda x, *a: 'on' if x['onball'] else 'off', ['on', 'off'])
    tab('#1 room to the sideline', lambda x, *a: '<6' if x['room'] < 6 else '6-9' if x['room'] < 9 else '9-12' if x['room'] < 12 else '12+', ['<6', '6-9', '9-12', '12+'])
    tab('coverage', lambda x, cov, *a: cov, ['c0', 'c1', '2man', 'c2', 'c3', 'c4', 'c6', 'other'])
    tab('down', lambda x, cov, down, dist: f"{down}{'s' if dist <= 3 else 'm' if dist <= 7 else 'l'}" if down > 1 else '1', ['1', '2s', '2m', '2l', '3s', '3m', '3l'])
    # The one-press plays: which corner presses.
    one = [(r, cov) for r, cov, *_ in P if sum(x['press'] for x in r) == 1]; m = len(one) or 1
    def which(lab, f, applies):
        A = [(r, cov) for r, cov in one if applies(*r)]; k = sum(1 for r, cov in A if f(next(x for x in r if x['press']), next(x for x in r if not x['press'])))
        print(f"   one-press plays: the pressed corner {lab}: {pc(k, len(A))}% (of {len(A)} where it applies)")
    which('is the boundary one', lambda a, b: a['fb'] == 'boundary', lambda a, b: {a['fb'], b['fb']} == {'field', 'boundary'})
    which('is on the side with fewer receivers', lambda a, b: a['n'] < b['n'], lambda a, b: a['n'] != b['n'])
    which('is over the #1 on the ball', lambda a, b: a['onball'], lambda a, b: a['onball'] != b['onball'])
    which('is over the #1 with less room to the sideline', lambda a, b: a['room'] < b['room'], lambda a, b: abs(a['room'] - b['room']) >= 2)
    g = collections.defaultdict(list)
    for x, cov, down, dist, r in S: g[(cov, x['n'])].append(x['press'])
    print('   press rate by coverage x receivers to his side (1 / 2 / 3+): ' + '  '.join(f"{c} " + '/'.join(pc(sum(g[(c, k)]), len(g[(c, k)])).strip() for k in (1, 2, 3)) for c in ('c1', 'c2', 'c3', 'c4', 'c6')))
    g = collections.defaultdict(list)
    for x, cov, down, dist, r in S: g[(x['fb'], x['n'])].append(x['press'])
    print('   press rate by field/boundary x receivers to his side (1 / 2 / 3+): ' + '  '.join(f"{fb} " + '/'.join(f"{pc(sum(g[(fb, k)]), len(g[(fb, k)])).strip()} (n {len(g[(fb, k)])})" for k in (1, 2, 3)) for fb in ('field', 'boundary', 'middle')))
    g = collections.defaultdict(list)
    for x, cov, down, dist, r in S: g[(x['n'], 'tight' if x['split'] < 12 else 'wide')].append(x['press'])
    print('   press rate by receivers x #1 split from the ball (< 12 / 12+ yd): ' + '  '.join(f"{k} rec " + '/'.join(pc(sum(g[(k, t)]), len(g[(k, t)])).strip() for t in ('tight', 'wide')) for k in (1, 2, 3)))
    one_by = collections.Counter(c for _, c in one); all_by = collections.Counter(c for _, c, *_ in P)
    print('   one-press share of plays by coverage: ' + '  '.join(f"{c} {pc(one_by[c], all_by[c])}% (n {all_by[c]})" for c in ('c0', 'c1', '2man', 'c2', 'c3', 'c4', 'c6')))
    fbp = sum(1 for r, _ in one if {x['fb'] for x in r} == {'field', 'boundary'})
    print(f"   one-press plays with a field and a boundary side: {fbp} of {len(one)}; coverage of one-press plays: " + ' '.join(f"{k} {pc(v, m)}" for k, v in collections.Counter(c for _, c in one).most_common()))
