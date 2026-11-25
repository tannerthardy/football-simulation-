"""Speed as a share of each player's own top speed in open-field movement, by role: one operator for NFL tracking and sim common-style plays (positions 0.1 s).
  python3 -I scripts/diag/yac/speed_share.py NFL.jsonl.gz SIM.jsonl.gz
Speed = central difference over 0.4 s. Own top speed = that player's p98 speed over all his frames in the sample (needs >= 200). Open field = no other player within 1.5 yd.
Roles (frames): carrier = the target after the catch to the end; pursuer = a defender 2.5-6 yd from that carrier, not ahead of him (bearing off the carrier's run >= 60 deg),
after the catch, the carrier above 4 yd/s; coverage in phase = a defender (DB or LB) from 1.0 s after the snap to the throw within 4 yd of the nearest receiver (WR, TE, RB).
Sim rows carry the speed the controller REQUESTED (|sim.intents vel|); its share of the body's own top speed is printed beside."""
import gzip, json, math, sys, collections as C
import numpy as np

ELIG = {'WR', 'TE', 'RB', 'FB'}
DEF_COV = {'CB', 'S', 'FS', 'SS', 'LB', 'DB', 'ILB', 'OLB', 'MLB', 'NB'}

def load(path, sim):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}
        tc, tt = ev.get('catch'), ev.get('pass_forward')
        if tc is None or tt is None: continue
        xy = np.array([[np.nan if v is None else v for v in r] for r in raw['xy']], dtype=float)
        F = xy.shape[0]
        if F < 14: continue
        n = xy.shape[1] // 2; P = xy.reshape(F, n, 2)
        if sim:
            side = raw['side']; keys = raw['key']; pos = raw['pos']; tgt = raw['receiver']; req = np.array(raw['req'], dtype=float).reshape(F, n); vmax = raw['vmax']
        else:
            pl = raw['players']; side = [p['side'] for p in pl]; keys = [p.get('id') for p in pl]; pos = [p.get('pos') for p in pl]; tgt = raw.get('target'); req = None; vmax = None
        if tgt is None: continue
        yield dict(P=P, side=side, keys=keys, pos=pos, tgt=tgt, tc=tc, tt=tt, req=req, vmax=vmax, F=F, end=min(F - 1, int(round(ev.get('end', (F - 1) * .1) / .1))))

def speeds(P):
    V = np.full(P.shape, np.nan); V[2:-2] = (P[4:] - P[:-4]) / 0.4
    return np.hypot(V[..., 0], V[..., 1]), V

def collect(path, sim):
    plays = list(load(path, sim)); top = C.defaultdict(list)
    for pl in plays:
        S, V = speeds(pl['P']); pl['S'] = S; pl['V'] = V
        for i, k in enumerate(pl['keys']):
            if k is not None: top[k].extend(S[3:, i][~np.isnan(S[3:, i])].tolist())
    p98 = {k: np.percentile(v, 98) for k, v in top.items() if len(v) >= 200}
    rows = C.defaultdict(list)
    for pl in plays:
        P, S, F = pl['P'], pl['S'], pl['F']; n = P.shape[1]
        D = np.linalg.norm(P[:, :, None, :] - P[:, None, :, :], axis=3); D[:, np.arange(n), np.arange(n)] = np.inf
        near = D.min(axis=2); k_c = int(round(pl['tc'] / .1)); k_t = int(round(pl['tt'] / .1)); r = pl['tgt']
        elig = [i for i in range(n) if pl['side'][i] == 'O' and pl['pos'][i] in ELIG]
        for k in range(3, F - 3):
            for i in range(n):
                key = pl['keys'][i]
                if key not in p98 or np.isnan(S[k, i]) or near[k, i] <= 1.5: continue
                share = S[k, i] / p98[key]; rq = pl['req'][k, i] / pl['vmax'][i] if pl['req'] is not None else None
                if i == r and k_c <= k <= pl['end']: rows['carrier'].append((share, rq))
                elif pl['side'][i] == 'D' and k_c <= k <= pl['end'] and k >= 2:
                    d = P[k, i] - P[k, r]; L = np.hypot(*d); cs = S[k, r]
                    if cs > 4 and 2.5 <= L < 6 and (d @ pl['V'][k, r]) / (L * cs) <= 0.5:
                        rows['pursuer'].append((share, rq))
                elif pl['side'][i] == 'D' and pl['pos'][i] in DEF_COV and k_t >= k >= 10 and elig:
                    if min(np.hypot(*(P[k, i] - P[k, e])) for e in elig) < 4: rows['coverage in phase'].append((share, rq))
    return rows, len(plays)

def show(name, rows, n):
    print(f"== {name}: {n} completions")
    for role in ('carrier', 'pursuer', 'coverage in phase'):
        v = np.array([x[0] for x in rows[role]]);
        if not len(v): continue
        q = [np.percentile(v, p) for p in (25, 50, 75)]
        line = f"  {role:18s} n {len(v):7d} share of own top speed p25/50/75 {q[0]:.2f}/{q[1]:.2f}/{q[2]:.2f}  mean {v.mean():.2f}  >=0.9 {np.mean(v >= .9):.0%}  >=1.0 {np.mean(v >= 1):.0%}"
        rq = [x[1] for x in rows[role] if x[1] is not None]
        if rq: line += f" | requested share of vmax p25/50/75 {np.percentile(rq, 25):.2f}/{np.percentile(rq, 50):.2f}/{np.percentile(rq, 75):.2f}, >=0.95 {np.mean(np.array(rq) >= .95):.0%}"
        print(line)

if __name__ == '__main__':
    for name, path, sim in (('NFL', sys.argv[1], False), ('ours', sys.argv[2], True)):
        rows, n = collect(path, sim); show(name, rows, n)
