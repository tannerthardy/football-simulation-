"""The passer's plant on quick-game throws, NFL against ours by one operator (Rules + Coaching, 2026-11-24; a measured
witness for the QB lane's drop times, not a taught value). Non-PA dropbacks whose target is quick or flat by qb_gates'
class and released under 2.0 s.

Alignment is the QB's depth behind the line at the snap:
- under center: shallower than 2 yd;
- pistol: 2-4 yd;
- gun: 4 yd or deeper.

The plant is his deepest point between the snap and the release (10 Hz). A first rule (retreat speed under 0.5 yd/s
after 1.0) found no plant on 70% of NFL quick throws: the passer often throws without coming to a stop. "Still
retreating" counts the plays whose deepest point is the release frame or the one before it. The set is the first frame after his peak retreat speed at which he is under half of it (his deceleration onto the back
foot). Per alignment it reports, p25 / p50 / p75:
- his depth at the deepest point;
- the retreat from his snap depth;
- the peak retreat speed;
- the snap → set time and the depth at the set;
- the snap → release time.
  python3 -I qb_plant.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz [--md OUT.md]"""
import gzip, json, sys
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import qb_gates as G


def quick_ids(path, nfl):
    return {r['id'] for r in G.targets(path, nfl) if r['cls'] in ('quick', 'flat') and r['rel'] < 2.0}


def align(d0):
    return 'under center' if d0 < 2 else 'pistol' if d0 < 4 else 'gun'


def rows(path, nfl):
    ids = quick_ids(path, nfl)
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('id') not in ids or p.get('qb') is None or p.get('rel') is None: continue
        x = np.array(p['x'][p['qb']], dtype=float)
        d0 = -x[0]
        rel_k = min(p['rel'], len(x) - 1)
        k = int(np.argmin(x[:rel_k + 1]))                     # his deepest point before the release
        rel = p['rel'] / 10
        # The set: after his peak retreat speed, the first frame he is under half of it (his decel onto the back foot).
        v = np.zeros_like(x); v[1:-1] = (x[2:] - x[:-2]) / 0.2
        r = -v[:rel_k + 1]; kp = int(np.argmax(r)); ks = next((j for j in range(kp + 1, rel_k + 1) if r[j] < 0.5 * r[kp]), None)
        yield dict(al=align(d0), plant=k / 10, depth=float(-x[k]), retreat=float(-x[k] - d0), p2r=rel - k / 10, rel=rel,
                   still=k >= rel_k - 1, peak=float(r[kp]), set=ks / 10 if ks is not None else None,
                   setdepth=float(-x[ks]) if ks is not None else None)


def q3(v):
    v = [x for x in v if x is not None]
    return ' / '.join(f'{np.quantile(v, p):.2f}' for p in (.25, .5, .75)) + f' ({len(v)})' if len(v) >= 8 else f'- ({len(v)})'


def main():
    args = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a)
    out = ['| side | alignment | plays | still retreating at the release | depth at release yd | retreat yd | peak retreat speed yd/s | snap → set s | depth at set yd | snap → release s |',
           '|---|---|---|---|---|---|---|---|---|---|']
    for k in ('NFL', 'OURS'):
        if k not in args: continue
        R = list(rows(args[k], k == 'NFL'))
        for al in ('under center', 'pistol', 'gun'):
            S = [r for r in R if r['al'] == al]
            if not S: continue
            out.append(f"| {k} | {al} | {len(S)} | {sum(r['still'] for r in S)} | {q3([r['depth'] for r in S])} | {q3([r['retreat'] for r in S])} | "
                       f"{q3([r['peak'] for r in S])} | {q3([r['set'] for r in S])} | {q3([r['setdepth'] for r in S])} | {q3([r['rel'] for r in S])} |")
    text = '\n'.join(out); print(text)
    if '--md' in sys.argv: open(sys.argv[sys.argv.index('--md') + 1], 'w').write(text + '\n')


if __name__ == '__main__':
    main()
