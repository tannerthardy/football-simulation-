"""The release of an outside vertical route against a pressed corner (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/press_release.py [--bdb <dir with player_play.csv, plays.csv>] <plays.jsonl.gz> [...]

Population: pass plays; a WR running a go/fade (NFL: player_play routeRan GO; sim: players[i].route go or fade) who is
the widest receiver on his side, with the nearest defender within 3.0 yd of him at the snap ('the corner').
NFL player indices follow nfl_bdb2025.py's order (offense first, then nflId as a string).
At 0.5 s steps to 3.0 s (while the ball is not yet thrown, and separately all snaps to the step):
  - receiver depth past the line;
  - his position relative to the corner along the field (receiver x - corner x; + = past him) and laterally (|dy|);
  - receiver and corner speed.
When he first gets level with the corner (receiver x >= corner x: 'past the hip'), contact time at the line (frames
within 1.0 yd centre to centre in the first 1.5 s), the first 0.5 s / 0.5-1.0 s speed, and the throw time. Split all /
man / Cover 1 by the play's coverage label."""
import sys, os, json, gzip, math, csv, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]; GO = {}
if args and args[0] == '--bdb':
    D = args[1]; args = args[2:]
    poss = {f"{r['gameId']}-{r['playId']}": r['possessionTeam'] for r in csv.DictReader(open(f'{D}/plays.csv', newline=''))}
    by = collections.defaultdict(list)
    for r in csv.DictReader(open(f'{D}/player_play.csv', newline='')):
        by[f"{r['gameId']}-{r['playId']}"].append((r['teamAbbr'], r['nflId'], r['routeRan']))
    for k, rows in by.items():
        if k not in poss: continue
        rows.sort(key=lambda t: (t[0] != poss[k], t[1]))
        GO[k] = [t[2] == 'GO' for t in rows]
T = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)

def cover1(label):
    s = (label or '').lower().replace('-', '').replace(' ', '')
    return s.startswith('cover1')

for path in args:
    G = collections.defaultdict(list); bad = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass': continue
        pl = raw['players']
        if raw.get('source', '').startswith('nfl'):
            g = GO.get(raw['id'])
            if g is None: continue
            if len(g) != len(pl): bad += 1; continue
            isgo = lambda i: g[i]
        else:
            isgo = lambda i: (pl[i].get('route') or '').split(':')[-1] in ('go', 'fade')
        p = Play(raw)
        if p.frames < 6: continue
        bx = raw.get('ball_y', 26.65)
        WR = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'WR' and p.pos(i, 0)[0] is not None]
        Dd = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        cell = raw.get('cell') or {}
        fam = coverage_family(cell.get('coverage')) or 'other'
        c1 = cover1(cell.get('coverage'))
        kt = p.k(ev['pass_forward']) if 'pass_forward' in ev else p.frames
        for r in WR:
            if not isgo(r): continue
            ry = p.pos(r, 0)[1]; side = 1 if ry > bx else -1
            if any(side * (p.pos(o, 0)[1] - ry) > 0 for o in WR if o != r and side * (p.pos(o, 0)[1] - bx) > 0): continue  # not widest
            c = min(Dd, key=lambda d: p.dist(r, d, 0))
            if p.dist(r, c, 0) > 3.0: continue
            o = {'gap0': p.dist(r, c, 0), 'cov': fam, 'c1': c1, 'tthrow': kt * p.dt if kt < p.frames else None, 'steps': {}}
            for t in T:
                k = p.k(t)
                if k >= p.frames or p.pos(r, k)[0] is None or p.pos(c, k)[0] is None: continue
                o['steps'][t] = dict(depth=p.pos(r, k)[0], along=p.pos(r, k)[0] - p.pos(c, k)[0],
                                     lat=abs(p.pos(r, k)[1] - p.pos(c, k)[1]), rs=p.speed(r, k), cs=p.speed(c, k), pre=k <= kt)
            o['hip'] = next((k * p.dt for k in range(1, min(p.frames, p.k(3.5))) if p.pos(r, k)[0] is not None and p.pos(c, k)[0] is not None
                             and p.pos(r, k)[0] >= p.pos(c, k)[0]), None)
            o['contact'] = sum(1 for k in range(0, min(p.frames, p.k(1.5))) if p.pos(r, k)[0] is not None and p.pos(c, k)[0] is not None and p.dist(r, c, k) <= 1.0) * p.dt
            o['s05'] = p.speed(r, min(p.frames - 1, p.k(0.5))); o['cs05'] = p.speed(c, min(p.frames - 1, p.k(0.5)))
            for key in ('all', fam) + (('cover1',) if c1 else ()):
                G[key].append(o)
    print(f'== {os.path.basename(path)}' + (f' (skipped {bad} plays whose player count did not match player_play)' if bad else ''))
    for key in ('all', 'man', 'zone', 'cover1'):
        v = G[key]
        if not v: continue
        hips = [o['hip'] for o in v if o['hip'] is not None]
        print(f"  {key:6} n {len(v):4} | snap gap p50 {q([o['gap0'] for o in v]):.1f} | contact in first 1.5 s p50 {q([o['contact'] for o in v]):.1f} s (p75 {q([o['contact'] for o in v], .75):.1f}), any {100*sum(o['contact']>0 for o in v)/len(v):.0f}% | "
              f"speed at 0.5 s rec {q([o['s05'] for o in v]):.1f} corner {q([o['cs05'] for o in v]):.1f} | past the hip by 3.5 s {100*len(hips)/len(v):.0f}%, when p50 {q(hips):.1f} s (p75 {q(hips, .75):.1f}) | throw p50 {q([o['tthrow'] for o in v if o['tthrow']]):.2f} s")
        for t in T:
            w = [o['steps'][t] for o in v if t in o['steps']]
            wp = [s for s in w if s['pre']]
            if not w: continue
            print(f"     t {t:.1f}  n {len(w):4} (pre-throw {len(wp):4}) | depth {q([s['depth'] for s in w]):5.1f} | rec - corner along {q([s['along'] for s in w]):+5.1f} (p25 {q([s['along'] for s in w], .25):+5.1f}, p75 {q([s['along'] for s in w], .75):+5.1f}) | lateral {q([s['lat'] for s in w]):.1f} | "
                  f"speed rec {q([s['rs'] for s in w]):.1f} corner {q([s['cs'] for s in w]):.1f} | pre-throw depth {q([s['depth'] for s in wp]):5.1f} along {q([s['along'] for s in wp]):+5.1f}")
