"""QB and RB backfield motion on designed runs, one operator for NFL and sim:
QB distance travelled from his snap spot and his speed at 0.3-1.5 s, and the
back's, until the handoff. usage: qbdrop.py FILE [--sim-trace] [--formation F] [--concept C]"""
import gzip, json, math, sys
trace = '--sim-trace' in sys.argv
get = lambda n: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else None
wantF, wantC = get('--formation'), get('--concept')
form = json.load(open('out/mechanics/nfl-formation.json')) if not trace else {}
T = (0.3, 0.5, 0.7, 0.9, 1.1, 1.3)
med = lambda xs: round(sorted(xs)[len(xs) // 2], 2) if xs else None
S = {t: ([], [], []) for t in T}; x0s = []; n = 0
for line in gzip.open(sys.argv[1], 'rt'):
    r = json.loads(line)
    if trace:
        con = r.get('concept'); r = r.get('common')
        if not r: continue
        F = None
    else: con, F = (r.get('cell') or {}).get('concept'), form.get(r['id'])
    if r.get('kind') != 'run' or r.get('carrier') is None: continue
    if wantF and F != wantF: continue
    if wantC and con != wantC: continue
    qbs = [i for i, p in enumerate(r['players']) if p['side'] == 'O' and p['group'] == 'QB']
    if not qbs: continue
    q, xy, dt = qbs[0], r['xy'], r.get('dt', .1)
    h = (r.get('events') or {}).get('handoff') or 9
    if xy[0][2 * q] is None: continue
    n += 1; x0s.append(xy[0][2 * q])
    for t in T:
        k = int(round(t / dt))
        if t > h or k + 1 >= len(xy) or xy[k][2 * q] is None or xy[k - 1][2 * q] is None: continue
        d = math.hypot(xy[k][2 * q] - xy[0][2 * q], xy[k][2 * q + 1] - xy[0][2 * q + 1])
        v = math.hypot(xy[k + 1][2 * q] - xy[k - 1][2 * q], xy[k + 1][2 * q + 1] - xy[k - 1][2 * q + 1]) / (2 * dt)
        S[t][0].append(d); S[t][1].append(v); S[t][2].append(xy[k][2 * q])
print(f"{sys.argv[1].split('/')[-1]} {wantF or ''} {wantC or ''}: n {n}, QB depth at snap {med(x0s)}")
print('   ' + ' | '.join(f"t={t}: moved {med(S[t][0])} v {med(S[t][1])} depth {med(S[t][2])}" for t in T))
