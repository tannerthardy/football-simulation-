"""Outside zone line flow over time, NFL tracking vs sim (same operator):
offensive and defensive linemen's mean lateral displacement toward the play
side and depth change from the snap, every 0.25 s to 2.5 s. Play side = sign
of the runner's lateral move by handoff + 1 s.
usage: oz-flow-profile.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
T = [.25, .5, .75, 1.0, 1.25, 1.5, 2.0, 2.5]
mean = lambda v: round(sum(v) / len(v), 2) if v else None
def prof(rows, label, concept):
    ol = {t: [] for t in T}; dl = {t: [] for t in T}; old = {t: [] for t in T}
    for raw in rows:
        if (raw.get('cell') or {}).get('concept') != concept: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        if c is None or h is None or not p.live(h + 1.0): continue
        x0, y0 = p.pos(c, p.k(h)); x1, y1 = p.pos(c, p.k(h + 1.0))
        if x0 is None or x1 is None: continue
        s = 1 if y1 - y0 >= 0 else -1; by = raw['ball_y']
        line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7]
        for t in T:
            if not p.live(t): continue
            k = p.k(t)
            for i in p.who('O', 'OL'):
                a, b = p.pos(i, 0), p.pos(i, k)
                if a[0] is None or b[0] is None: continue
                ol[t].append((b[1] - a[1]) * s); old[t].append(b[0] - a[0])
            for i in line:
                a, b = p.pos(i, 0), p.pos(i, k)
                if a[0] is None or b[0] is None: continue
                dl[t].append((b[1] - a[1]) * s)
    print(f"{label:28s} OL lat " + ' '.join(f"{mean(ol[t])}" for t in T) + ' | OL depth ' + ' '.join(f"{mean(old[t])}" for t in T) + ' | DL lat ' + ' '.join(f"{mean(dl[t])}" for t in T))
print('times', T)
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
prof([r for r in nfl if r.get('kind') == 'run'], 'NFL OUTSIDE ZONE', 'OUTSIDE ZONE')
prof([r for r in nfl if r.get('kind') == 'run'], 'NFL INSIDE ZONE', 'INSIDE ZONE')
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    for c in ('outsideZone', 'insideZone'):
        prof(rows, f"{path.split('/')[-1][:10]} {c}", c)
