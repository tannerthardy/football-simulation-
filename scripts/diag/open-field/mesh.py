"""Mesh and backfield timing by formation and concept, one operator for NFL
(formation from plays.csv) and sim common plays: RB depth and width at the
snap, handoff time, RB depth at the handoff, line-crossing time.
usage: mesh.py FILE.jsonl.gz [--sim-trace] [--formation F] [--concept C]"""
import gzip, json, sys
trace = '--sim-trace' in sys.argv
get = lambda n: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else None
wantF, wantC = get('--formation'), get('--concept')
form = json.load(open('out/mechanics/nfl-formation.json')) if not trace else {}
q = lambda xs, f: round(sorted(xs)[int(f * (len(xs) - 1))], 2) if xs else None
S = {k: [] for k in ('depth0', 'width0', 'hand', 'depthH', 'cross', 'qbH')}
n = 0
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    con = None
    if trace:
        con, F = r.get('concept'), r.get('formation'); r = r.get('common')
        if not r: continue
    else:
        con, F = (r.get('cell') or {}).get('concept'), form.get(r['id'])
    if r.get('kind') != 'run' or r.get('carrier') is None: continue
    if wantF and F != wantF: continue
    if wantC and con != wantC: continue
    xy, c, dt = r['xy'], r['carrier'], r.get('dt', .1)
    if r['players'][c]['group'] != 'RB': continue
    h = (r.get('events') or {}).get('handoff')
    if h is None: continue
    qbs = [i for i, p in enumerate(r['players']) if p['side'] == 'O' and p['group'] == 'QB']
    n += 1
    S['depth0'].append(xy[0][2 * c]); S['width0'].append(abs(xy[0][2 * c + 1] - r['ball_y']))
    S['hand'].append(h); k = int(round(h / dt))
    if k < len(xy) and xy[k][2 * c] is not None: S['depthH'].append(xy[k][2 * c])
    if qbs and k < len(xy) and xy[k][2 * qbs[0]] is not None: S['qbH'].append(xy[k][2 * qbs[0]])
    kc = next((kk for kk in range(k, len(xy)) if xy[kk][2 * c] is not None and xy[kk][2 * c] >= 0), None)
    if kc is not None: S['cross'].append(kc * dt)
print(f"{sys.argv[1].split('/')[-1]} {wantF or 'all'} {wantC or 'all'}: n {n} | RB depth at snap {q(S['depth0'],.5)} width {q(S['width0'],.5)} | handoff p25/p50/p75 {q(S['hand'],.25)}/{q(S['hand'],.5)}/{q(S['hand'],.75)} | RB depth at handoff {q(S['depthH'],.5)} QB {q(S['qbH'],.5)} | cross p50 {q(S['cross'],.5)}")
