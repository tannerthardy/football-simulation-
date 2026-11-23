"""When do underneath droppers stop gaining depth, and on what (Integration, 2026-11-23: the QB lane's drop/set
measurement says NFL passers are still moving at 2.0 s on deeper drops and 35% of gun dropbacks never fall under 1 yd/s
before the release, so an NFL dropper cannot be keying "QB set"). Non-PA dropbacks, before the throw.
A settle: the first time after he has gained 1.5+ yd of depth from the snap that his upfield (depth) speed, over 0.3 s,
falls under 0.5 yd/s. At the settle: the time from the snap; his depth and its share of the depth he reaches by the
throw or 3.0 s; (NFL, defense-film rows with the passer) the passer's depth past his snap spot and speed then, and whether
the passer was under 1 yd/s; and the routes: the nearest eligible receiver in his window (within 6 yd laterally, from 3 yd
shallower to 4 yd deeper than him) and whether one is in it, and whether a receiver crossed into the window in the 0.3 s
before (entered). Also: droppers who never settle before the throw / 3.0 s.
NFL seats: PFF HCL / HCR (hook), CFL / CFR (curl_flat), HOL (hole) from the defense-film rows (nfl-defense-film.py).
Ours: hook / curl_flat / hole from the flat-seat rows (sim-flat-seat.mts; no passer track there).
usage: python3 -I scripts/diag/flat-seat/settle_trigger.py NFL_FILM.jsonl SIM_SEAT.jsonl [...]"""
import json, sys, math, collections
import numpy as np
SEAT = {'HCL': 'hook', 'HCR': 'hook', 'CFL': 'curl_flat', 'CFR': 'curl_flat', 'HOL': 'hole'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):5.2f} ({q(v, .25):5.2f}-{q(v, .75):5.2f})' if len(v) else '-'
def pct(a, b): return f'{100 * a / max(1, b):4.1f}%'


def settle(T, D, end):
    """Index of the settle (see above) in a depth track D over times T (t from the snap), or None."""
    d0 = D[0]
    for k in range(3, len(T)):
        if T[k] > end: break
        if D[k] - d0 < 1.5: continue
        if (D[k] - D[k - 3]) / max(1e-6, T[k] - T[k - 3]) < 0.5: return k
    return None


def window_state(me, R, k):
    inw = [p for p in R if abs(p[k][1] - me[1]) <= 6 and me[0] - 3 <= p[k][0] <= me[0] + 4]
    return bool(inw)


def nfl_rows(path):
    out = []
    for l in open(path):
        r = json.loads(l)
        if not r.get('dropback') or r.get('pa'): continue
        T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
        end = min(3.0, r['throw'] if r.get('throw') is not None else 3.0)
        pl = r['players']; X = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        qb = next((i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] == 'QB'), None)
        rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] in ('WR', 'TE', 'RB', 'FB')]
        for i, p in enumerate(pl):
            c = SEAT.get(p.get('assign'))
            if p['side'] != 'D' or not c: continue
            TT = T[k0:]; D = [X(i, k)[0] for k in range(k0, len(T))]
            ks = settle(TT, D, end)
            row = dict(cls=c, settled=ks is not None)
            if ks is not None:
                k = k0 + ks; me = X(i, k)
                kend = min(range(k0, len(T)), key=lambda kk: abs(T[kk] - end))
                R = [[X(j, kk) for kk in range(len(T))] for j in rec]
                inw = window_state(me, R, k); before = window_state(me, R, max(k0, k - 3))
                row.update(t=T[k], depth=me[0], share=(me[0] - D[0]) / max(0.1, X(i, kend)[0] - D[0]), inw=inw, entered=inw and not before)
                if qb is not None:
                    qd = -(X(qb, k)[0] - X(qb, k0)[0]); qv = math.dist(X(qb, k), X(qb, max(k0, k - 2))) / max(1e-6, T[k] - T[max(k0, k - 2)])
                    row.update(qbdrop=qd, qbv=qv)
            out.append(row)
    return out


def sim_rows(paths):
    out = []
    for p in paths:
        for l in open(p):
            r = json.loads(l)
            if r['pa'] or r['cls'] not in ('hook', 'curl_flat', 'hole'): continue
            T = r['t']; end = min(3.0, r['throw'] if r['throw'] is not None else 3.0)
            D = [d[0] if d else None for d in r['d']]
            if None in D[:int(end * 10) + 1]: continue
            ks = settle(T, D, end); row = dict(cls=r['cls'], settled=ks is not None)
            if ks is not None:
                me = r['d'][ks]; R = [x for x in r['rec'] if all(v is not None for v in x[:ks + 1])]
                kend = int(round(end * 10))
                inw = window_state(me, R, ks); before = window_state(me, R, max(0, ks - 3))
                row.update(t=T[ks], depth=me[0], share=(me[0] - D[0]) / max(0.1, D[kend] - D[0]), inw=inw, entered=inw and not before)
            out.append(row)
    return out


for lab, A in (('NFL', nfl_rows(sys.argv[1])), ('sim', sim_rows(sys.argv[2:]))):
    print(f'\n## {lab}')
    for c in ('hook', 'curl_flat', 'hole'):
        G = [r for r in A if r['cls'] == c]; S = [r for r in G if r['settled']]
        if not G: continue
        line = f'  {c:9s} n {len(G):5d}: settle before the throw / 3 s {pct(len(S), len(G))}; time {f3([r["t"] for r in S])} s; depth {f3([r["depth"] for r in S])}; share of his depth by the throw {f3([r["share"] for r in S])}; a route in his window then {pct(sum(r["inw"] for r in S), len(S))}, entering it {pct(sum(r["entered"] for r in S), len(S))}'
        if lab == 'NFL':
            Q = [r for r in S if 'qbdrop' in r]
            line += f'; the passer then: dropped {f3([r["qbdrop"] for r in Q])} yd, speed {f3([r["qbv"] for r in Q])} yd/s, under 1 yd/s {pct(sum(r["qbv"] < 1 for r in Q), len(Q))}'
        print(line)
