"""Receiver alignment at the snap, NFL against ours, one operator (Rules, 2026-11-24).

Input: the open-census play format (NFL: nfl_routes.py; ours: Tools' sim_plays.mts --full --all), frame 0 = the snap.
Ball = the center's y at the snap. Field 53.33 yd wide; the hashes are 23.58 / 29.75 yd from a sideline (NFL).
Ball spot: left hash / middle / right hash (within 1.5 yd of a hash = on it). Boundary = the side nearer the sideline.
Eligibles: offense WR / TE / RB / FB, not the QB, not in motion at the snap (NFL PFF flag; ours: no motion on the play).
Per side of the ball (by y against the ball): receivers outside the tackle box on the line or off it, ordered outside-in
(#1 outermost). Reported per receiver: room to his own sideline, split from the ball, split from the next man inside him
(the next receiver, or the tackle), depth off the line. TE: attached (within 2.5 yd of the tackle laterally and within
1.6 yd of the line) or flexed. Backs: depth behind the line and width from the QB.
Formation family from positions, the same on both sides: count of detached receivers per side (#1-#3 outside the tackle
+2.5 yd), giving 2x2 / 3x1 / 2x1 / 1x1 / 3x2 / 4x1 / empty (no back); bunch = three on a side within 4 yd laterally;
stack = two within 1.2 yd laterally and 0.8+ yd apart in depth; nasty = a WR within 4 yd of the tackle or attached end.
Personnel by position counts (RB+FB, TE).
  python3 -I alignment_chart.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz [--md OUT.md]"""
import gzip, json, math, sys, collections
import numpy as np

W = 53.33; HASH = (23.58, 29.75)
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
SIM_FAM = {'hitch': 'HITCH', 'quick_hitch': 'HITCH', 'curl': 'HITCH', 'comeback': 'HITCH', 'stick': 'HITCH', 'hook': 'HITCH',
           'quick_out': 'OUT', 'out': 'OUT', 'deep_out': 'OUT', 'dig': 'IN', 'short_in': 'IN', 'slant': 'SLANT', 'post': 'POST',
           'corner': 'CORNER', 'cross': 'CROSS', 'shallow': 'CROSS', 'shallow_high': 'CROSS', 'mesh_under': 'CROSS', 'go': 'GO',
           'seam': 'GO', 'fade': 'GO', 'seam_read': 'GO', 'flat': 'FLAT', 'arrow': 'FLAT', 'wheel': 'WHEEL',
           'bubble': 'SCREEN', 'now_screen': 'SCREEN', 'tunnel': 'SCREEN', 'slip_screen': 'SCREEN', 'te_screen': 'SCREEN'}


def spot(ball):
    for h in HASH:
        if abs(ball - (W - h)) < 1.5: return 'left hash'
        if abs(ball - h) < 1.5: return 'right hash'
    return 'middle' if abs(ball - W / 2) < 3 else 'other'


def plays(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('screen'): pass
        X = np.array(p['x'], dtype=float); Y = np.array(p['y'], dtype=float); pl = p['players']
        if X.shape[1] < 1: continue
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        if not cs or len(ols) < 5: continue
        if not nfl and p.get('motion'): continue
        ball = float(Y[cs[0], 0]); tl = float(Y[ols, 0].min()); tr = float(Y[ols, 0].max())
        qb = p.get('qb')
        elig = []
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == qb or r['pos'] in OL or r['pos'] == 'QB': continue
            if nfl and r.get('motion'): return_skip = True
            rid = r.get('routeRan') if nfl else ((p.get('routes') or {}).get(str(i)) or {}).get('id')
            fam = rid if nfl else SIM_FAM.get(rid or '', None)
            elig.append(dict(i=i, pos=r['pos'], x=float(X[i, 0]), y=float(Y[i, 0]), route=fam, motion=bool(r.get('motion')) if nfl else False))
        yield dict(src='NFL' if nfl else 'ours', ball=ball, tl=tl, tr=tr, elig=elig, spot=spot(ball))


def rows(path, nfl):
    out = []
    for P in plays(path, nfl):
        ball, tl, tr = P['ball'], P['tl'], P['tr']
        backs = [e for e in P['elig'] if e['pos'] in BACK and e['x'] < -2.5 and tl - 1 <= e['y'] <= tr + 1]
        rec = [e for e in P['elig'] if e not in backs]
        if any(e['motion'] for e in P['elig']): continue
        pers = f"{sum(e['pos'] in BACK for e in P['elig'])}{sum(e['pos'] == 'TE' for e in P['elig'])}"
        sides = {}
        for sgn in (1, -1):
            edge = tr if sgn > 0 else tl
            S = sorted([e for e in rec if (e['y'] - ball) * sgn > 0], key=lambda e: -(e['y'] - ball) * sgn)
            sides[sgn] = (S, edge)
        det = {sgn: [e for e in S if (e['y'] - edge) * sgn > 2.5] for sgn, (S, edge) in sides.items()}
        counts = sorted((len(det[1]), len(det[-1])), reverse=True)
        fam = 'empty' if not backs else f"{counts[0]}x{counts[1]}"
        for sgn, (S, edge) in sides.items():
            D = det[sgn]
            bunch = len(D) >= 3 and abs(D[0]['y'] - D[2]['y']) <= 4
            room_side = (W - ball) if sgn > 0 else ball
            boundary = room_side < W - room_side - 1
            for n, e in enumerate(S):
                lat = abs(e['y'] - ball)
                inner = S[n + 1]['y'] if n + 1 < len(S) else edge
                gap = abs(e['y'] - inner)
                stack = any(o is not e and abs(o['y'] - e['y']) <= 1.2 and abs(o['x'] - e['x']) >= 0.8 for o in S)
                attached = e['pos'] == 'TE' and abs(e['y'] - edge) <= 2.5 and e['x'] > -1.6
                out.append(dict(src=P['src'], pos=e['pos'], num=n + 1, ndet=len(D), detached=(e['y'] - edge) * sgn > 2.5,
                                room=(W - e['y']) if sgn > 0 else e['y'], split=lat, gap=gap, depth=-e['x'], route=e['route'],
                                fam=fam, bunch=bunch, stack=stack, attached=attached, spot=P['spot'], boundary=boundary,
                                nasty=e['pos'] == 'WR' and (e['y'] - edge) * sgn <= 4, pers=pers, ballroom=room_side))
        for b in backs:
            out.append(dict(src=P['src'], pos='back', depth=-b['x'], width=abs(b['y'] - ball), fam=fam, pers=pers, spot=P['spot']))
    return out


q = lambda v, p: float(np.quantile(v, p)) if len(v) else float('nan')
f1 = lambda v: '-' if v != v else f"{v:.1f}"


def table(R, title, keyf, cols, out, order=None, minn=10):
    out.append(f"\n### {title}\n")
    out.append('| group | side | n | ' + ' | '.join(c[0] for c in cols) + ' |')
    out.append('|---|---|---|' + '---|' * len(cols))
    g = collections.defaultdict(list)
    for r in R:
        k = keyf(r)
        if k is not None: g[(k, r['src'])].append(r)
    keys = order or sorted({k for k, _ in g}, key=str)
    for k in keys:
        for src in ('NFL', 'ours'):
            v = g.get((k, src), [])
            if len(v) < minn: continue
            out.append(f"| {k} | {src} | {len(v)} | " + ' | '.join(c[1](v) for c in cols) + ' |')


def main():
    md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
    R = []
    for a in sys.argv[1:]:
        if a.startswith('--') or a == md: continue
        lab, path = a.split('=', 1); R += rows(path, lab == 'NFL')
    rec = [r for r in R if r['pos'] != 'back']
    q3 = lambda k: (lambda v: ' / '.join(f1(q([r[k] for r in v], p)) for p in (.25, .5, .75)))
    pct = lambda pred: (lambda v: f"{sum(pred(r) for r in v) / len(v):.0%}")
    cols = [('room to sideline p25/50/75', q3('room')), ('split from ball', q3('split')), ('gap to next inside', q3('gap')), ('depth', q3('depth'))]
    out = ['## Receiver alignment at the snap: NFL against ours', '']
    out.append(f"Receivers (not in motion): NFL {sum(r['src'] == 'NFL' for r in rec)}, ours {sum(r['src'] == 'ours' for r in rec)}.")
    table(rec, '#1 (outermost) by detached receivers on his side', lambda r: f"#1 of {r['ndet']}" if r['num'] == 1 and r['detached'] else None, cols, out, [f"#1 of {n}" for n in (1, 2, 3, 4)])
    table(rec, '#2 / #3 by detached count', lambda r: f"#{r['num']} of {r['ndet']}" if r['num'] > 1 and r['detached'] else None, cols, out, ['#2 of 2', '#2 of 3', '#3 of 3', '#2 of 4', '#3 of 4'])
    table(rec, '#1 by ball spot and side (boundary / field)', lambda r: f"{r['spot']} {'boundary' if r['boundary'] else 'field'}" if r['num'] == 1 and r['detached'] else None,
          cols + [('room on that side from the ball', q3('ballroom'))], out)
    table(rec, '#1 by his route', lambda r: r['route'] if r['num'] == 1 and r['detached'] and r['route'] else None, cols, out)
    table(rec, '#1 by formation family', lambda r: r['fam'] if r['num'] == 1 and r['detached'] else None, cols, out)
    table(rec, '#1 by personnel (backs + TEs)', lambda r: r['pers'] if r['num'] == 1 and r['detached'] else None, cols, out)
    shapes = [('bunch side', pct(lambda r: r['bunch'])), ('in a stack', pct(lambda r: r['stack'])), ('WR nasty (within 4 yd of the edge)', pct(lambda r: r['nasty']))]
    table(rec, 'Shapes (detached receivers)', lambda r: 'all detached' if r['detached'] else None, shapes, out)
    te = [r for r in rec if r['pos'] == 'TE']
    table(te, 'TE: attached or flexed', lambda r: 'TE', [('attached', pct(lambda r: r['attached'])), ('depth p50', q3('depth')), ('split from ball', q3('split'))], out)
    backs = [r for r in R if r['pos'] == 'back']
    table(backs, 'Backs: depth and width from the ball', lambda r: r['fam'] if r['fam'] != 'empty' else None,
          [('depth p25/50/75', q3('depth')), ('width p25/50/75', q3('width'))], out)
    table(rec, 'Ball spot (share of plays)', lambda r: r['spot'] if r['num'] == 1 and r['detached'] else None, [('n', lambda v: str(len(v)))], out)
    text = '\n'.join(out) + '\n'
    if md: open(md, 'w').write(text)
    print(text)


if __name__ == '__main__':
    main()
