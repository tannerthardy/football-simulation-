"""Hip/orientation yaw rate p99 by speed bin, receivers and defenders in open movement, one operator for NFL tracking (o at 10 Hz, 0.1 s difference) and the sim (o = shoulders at the same grid; h = hips).
  python3 -I scripts/diag/body/yaw_rate.py NFL.pkl SIM.jsonl.gz [...]
Reuses facing_dist.py's loaders and open-movement mask (no other player within 1.5 yd). The rate is |wrap(o[k+1]-o[k])| / 0.1 s. NFL `o` is a 10 Hz sensor estimate, so its tail is a floor on a body's hip peaks."""
import sys, numpy as np
src = open(__file__.replace('yaw_rate.py', 'facing_dist.py')).read().split('nfl = load_nfl(sys.argv[1])')[0]
exec(compile(src, 'facing_dist.py', 'exec'))
def rates(plays, which):
    out = {}
    for grp, gn in ((REC, 'receivers'), (DEFN, 'defenders')):
        for b in BINS:
            R = []
            for pl in plays:
                om = open_mask(pl); F = pl['s'].shape[1]; o = pl[which]
                for i, p in enumerate(pl['pos']):
                    if p not in grp or (pl['side'][i] == 'O') != (grp is REC): continue
                    for k in range(3, min(pl['throw'], F) - 4):
                        if om[i, k] and om[i, k + 1] and b[0] <= pl['s'][i, k] < b[1] and not np.isnan(o[i, k]) and not np.isnan(o[i, k + 1]):
                            R.append(abs(wrap(o[i, k + 1] - o[i, k])) / 0.1)
            out[(gn, b)] = np.array(R)
    return out
def show(name, plays, which):
    r = rates(plays, which); print(f'-- {name} ({which})  yaw rate deg/s p50 / p90 / p99 (n)')
    for (gn, b), R in r.items():
        if len(R) < 50: continue
        print(f'   {gn:10s} {b[0]}-{b[1]:<3} {np.percentile(R, 50):5.0f} / {np.percentile(R, 90):5.0f} / {np.percentile(R, 99):5.0f}  ({len(R)})')
nfl = load_nfl(sys.argv[1]); show('NFL', nfl, 'o')
for f in sys.argv[2:]:
    sim = load_sim(f); show('sim ' + f.split('/')[-1], sim, 'o'); show('sim ' + f.split('/')[-1], sim, 'h')
