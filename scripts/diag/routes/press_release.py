"""Does press cost the outside receiver time or width? NFL against ours by one operator (Rules + Coaching, 2026-11-24; for
Coverage's staged Cover 2 / press jam).

Population: non-PA dropbacks. On each side, #1 (the widest offensive player running a route) is classed by the nearest
defender in front of him at the snap:
- **press:** 0-2.5 yd in front of him and within 1.5 yd across (the engine's RELEASE_SEEN "tight at the snap"; a
  first pass at 1.5 yd found 119 NFL press #1s and none of ours);
- **off:** the nearest defender in front 4-9 yd deep and within 3 yd across;
- else not counted.

For each #1 that reaches the depth, it reports, p25 / p50 / p75:
- the time from the snap to 10 yd past the line;
- the lateral displacement from his snap spot when he reaches 5 yd (release width);
- the share released inside / outside at 5 yd (toward or away from the ball, by more than 0.5 yd; else straight).

Ours: the #876 sim set (the defenders' alignment as tracked, the same rule). --check N prints N plays per class to check
the press label by hand.
  python3 -I press_release.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz [--check N] [--md OUT.md]"""
import gzip, json, sys
import numpy as np


def ones(path):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('qb') is None: continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); pl = p['players']; qb = p['qb']; ball = Y[qb, 0]
        runners = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r.get('pos') not in ('T', 'G', 'C', 'OT', 'OG', 'QB')
                   and (r.get('route') or (p.get('routes') or {}).get(str(i)))]
        defs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        for s in (1, -1):
            side = [i for i in runners if (Y[i, 0] - ball) * s > 0]
            if not side: continue
            one = max(side, key=lambda i: (Y[i, 0] - ball) * s)
            ahead = [(j, X[j, 0] - X[one, 0], Y[j, 0] - Y[one, 0]) for j in defs if X[j, 0] - X[one, 0] > -0.5]
            if not ahead: continue
            j, dx, dy = min(ahead, key=lambda t: np.hypot(t[1], t[2]))
            cls = 'press' if 0 <= dx <= 2.5 and abs(dy) <= 1.5 else 'off' if 4 <= dx <= 9 and abs(dy) <= 3 else None
            if not cls: continue
            x = X[one]; y = Y[one]
            k10 = next((k for k in range(len(x)) if x[k] >= 10), None)
            k5 = next((k for k in range(len(x)) if x[k] >= 5), None)
            w = None if k5 is None else float(y[k5] - y[0]) * (-s)   # positive = toward the ball (inside)
            yield dict(id=p.get('id'), cls=cls, d=(round(float(dx), 1), round(float(dy), 1)), t10=None if k10 is None else k10 / 10, w=w)


def q3(v):
    v = [x for x in v if x is not None]
    return ' / '.join(f'{np.quantile(v, p):.2f}' for p in (.25, .5, .75)) + f' ({len(v)})' if len(v) >= 8 else f'- ({len(v)})'


def main():
    args = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a)
    check = int(sys.argv[sys.argv.index('--check') + 1]) if '--check' in sys.argv else 0
    out = ['| side | class | #1s | time to 10 yd s | release width at 5 yd (+ inside) yd | inside / straight / outside |',
           '|---|---|---|---|---|---|']
    chk = []
    for k in ('NFL', 'OURS'):
        if k not in args: continue
        R = list(ones(args[k]))
        for c in ('press', 'off'):
            S = [r for r in R if r['cls'] == c]
            W = [r['w'] for r in S if r['w'] is not None]
            share = lambda f: f"{100 * sum(1 for w in W if f(w)) / len(W):.0f}%" if W else '-'
            out.append(f"| {k} | {c} | {len(S)} | {q3([r['t10'] for r in S])} | {q3([abs(w) for w in W])} | "
                       f"{share(lambda w: w > 0.5)} / {share(lambda w: abs(w) <= 0.5)} / {share(lambda w: w < -0.5)} |")
            if check: chk += [f"{k} {c} {r['id']} defender dx,dy {r['d']} t10 {r['t10']} w5 {None if r['w'] is None else round(r['w'], 2)}" for r in S[:check]]
    text = '\n'.join(out + ([''] + chk if chk else [])); print(text)
    if '--md' in sys.argv: open(sys.argv[sys.argv.index('--md') + 1], 'w').write(text + '\n')


if __name__ == '__main__':
    main()
