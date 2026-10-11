"""Box defenders on runs: backward speed by number of OL within 1.5 yd, and
how long double teams last. Same code for NFL and sim common-format plays."""
import gzip, json, math, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
def run(path, label, limit=None):
    speeds = defaultdict(list); durations = []; n = 0; driven_by = defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run': continue
        p = Play(raw)
        c = raw.get('carrier')
        if c is None or p.players[c]['group'] != 'RB': continue
        n += 1
        if limit and n > limit: break
        ol = p.who('O', 'OL')
        for d in p.box_defenders():
            run_len = 0
            k_end = min(p.k(p.end), p.k(3.0))
            prev = None
            for k in range(p.k(0.3), k_end + 1):
                touching = sum(1 for o in ol if p.dist(d, o, k) <= 1.5)
                # backward speed: x velocity toward the defense's goal (+)
                a, b = max(0, k - 2), min(p.frames - 1, k + 2)
                vx = (p.pos(d, b)[0] - p.pos(d, a)[0]) / ((b - a) * p.dt) if b > a else 0
                speeds[min(touching, 2)].append(vx)
                if touching >= 2: run_len += 1
                elif run_len: durations.append(run_len * p.dt); run_len = 0
            if run_len: durations.append(run_len * p.dt)
    print(f'== {label}: {n} RB runs')
    for kk in (0, 1, 2):
        v = sorted(speeds[kk])
        if not v: continue
        q = lambda f: v[int(f * (len(v) - 1))]
        print(f'  OL touching={kk}: share {len(v)/sum(len(x) for x in speeds.values()):.2f}  backward speed p50 {q(.5):5.2f} p75 {q(.75):5.2f} p90 {q(.9):5.2f}  share >1 yd/s {sum(x>1 for x in v)/len(v):.2f}')
    d = sorted(durations)
    if d: print(f'  double-team spells (>=2 OL within 1.5 yd): n={len(d)} p50 {d[len(d)//2]:.1f}s p90 {d[int(.9*len(d))]:.1f}s  share >=1.5 s {sum(x>=1.5 for x in d)/len(d):.2f}')
run('out/mechanics/nfl-plays.jsonl.gz', 'NFL 2022', limit=2500)
run('out/mechanics/nfl2017-plays.jsonl.gz', 'NFL 2017', limit=2000)
run('out/mechanics/sim-plays.jsonl.gz', 'sim seed 101')
run('out/mechanics/sim-202.jsonl.gz', 'sim seed 202')
