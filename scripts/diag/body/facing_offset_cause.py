"""Where the receivers' offset between orientation and travel comes from: frames at 3+ yd/s in open movement, split by what the travel does next (break within 0.5 s: heading change >= 35 deg over k..k+5; straight: under 12 deg over k-3..k+8),
signed against the bearing to the passer (positive = toward him) and against the side of the coming turn. NFL (o) and sim (o shoulders, h hips); one operator.
  python3 -I scripts/diag/body/facing_offset_cause.py NFL.pkl SIM.jsonl.gz [...]"""
import sys, numpy as np
src = open(__file__.replace('facing_offset_cause.py', 'facing_dist.py')).read().split('nfl = load_nfl(sys.argv[1])')[0]
exec(compile(src, 'facing_dist.py', 'exec'))
def run(name, plays, which):
    rows = {'straight': [], 'pre-break (0-0.3 s)': [], 'pre-break (0.3-0.5 s)': []}; tow = {k: [] for k in rows}; sideb = {k: [] for k in rows}
    for pl in plays:
        om = open_mask(pl); F = pl['s'].shape[1]; o = pl[which]; d = pl['d']
        qs = [i for i, (p, s) in enumerate(zip(pl['pos'], pl['side'])) if p == 'QB' and s == 'O']
        for i, (p, s) in enumerate(zip(pl['pos'], pl['side'])):
            if s != 'O' or p not in REC: continue
            for k in range(3, min(pl['throw'], F) - 9):
                if not om[i, k] or pl['s'][i, k] < 3 or np.isnan(o[i, k]) or np.isnan(d[i, k]): continue
                off = wrap(o[i, k] - d[i, k])
                ahead = wrap(d[i, k + 5] - d[i, k]); back = wrap(d[i, k] - d[i, k - 3]); long = wrap(d[i, k + 8] - d[i, k - 3])
                if abs(ahead) >= 35 and abs(back) < 20: cls = 'pre-break (0-0.3 s)' if abs(wrap(d[i, k + 2] - d[i, k])) >= 12 else 'pre-break (0.3-0.5 s)'
                elif abs(long) < 12: cls = 'straight'
                else: continue
                rows[cls].append(abs(off)); sideb[cls].append(off * np.sign(ahead) if cls != 'straight' else np.nan)
                if qs:
                    q = qs[0]; b = np.degrees(np.arctan2(pl['x'][q, k] - pl['x'][i, k], pl['y'][q, k] - pl['y'][i, k]))
                    # toward the passer: does the orientation sit on the passer's side of the path?
                    tow[cls].append(np.sign(wrap(b - d[i, k])) * off)
    print(f'-- {name} ({which}) receivers, 3+ yd/s, open movement: |o - travel| p25/50/75 deg (n); signed toward the passer median; signed toward the coming turn median')
    for cls, R in rows.items():
        if len(R) < 30: print(f'   {cls:24s} n {len(R)}'); continue
        R = np.array(R); T = np.array(tow[cls]); S = np.array(sideb[cls])
        print(f'   {cls:24s} {np.percentile(R,25):4.0f} {np.percentile(R,50):4.0f} {np.percentile(R,75):4.0f} ({len(R)})  toward passer {np.median(T):+5.1f}' + (f'  toward the turn {np.nanmedian(S):+5.1f}' if cls != 'straight' else ''))
run('NFL', load_nfl(sys.argv[1]), 'o')
for f in sys.argv[2:]:
    sim = load_sim(f); run('sim ' + f.split('/')[-1], sim, 'o'); run('sim ' + f.split('/')[-1], sim, 'h')
