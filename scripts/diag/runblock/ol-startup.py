"""Offensive linemen's start from the stance, NFL tracking vs sim (same
operator): mean speed (yd/s, 0.1 s central differences of the 0.1 yd
positions) at 0.1-0.8 s after the snap, by run concept.
usage: ol-startup.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys, math
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
T = [.1, .2, .3, .4, .5, .6, .8, 1.0]
def prof(rows, label, concepts):
    acc = {t: [] for t in T}
    for raw in rows:
        if (raw.get('cell') or {}).get('concept') not in concepts or raw.get('kind') != 'run': continue
        p = Play(raw)
        for i in p.who('O', 'OL'):
            for t in T:
                k = p.k(t)
                if k < 1 or k + 1 >= p.frames: continue
                a, b = p.pos(i, k - 1), p.pos(i, k + 1)
                if a[0] is None or b[0] is None: continue
                acc[t].append(math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * p.dt))
    print(f"{label:30s} " + ' '.join(f"{t}:{sum(acc[t])/max(1,len(acc[t])):.2f}" for t in T))
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
prof(nfl, 'NFL outside zone', ('OUTSIDE ZONE',)); prof(nfl, 'NFL inside zone', ('INSIDE ZONE',)); prof(nfl, 'NFL power/counter', ('POWER', 'COUNTER'))
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(path, 'rt')]
    tag = path.split('/')[-1][:10]
    prof(rows, f"{tag} outside/wide", ('outsideZone', 'wideZone')); prof(rows, f"{tag} inside", ('insideZone',)); prof(rows, f"{tag} power/counter", ('power', 'counter'))
