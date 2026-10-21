"""The back's speed (yd/s) and depth at the handoff, NFL tracking vs sim,
same operator: carrier speed at the handoff frame and at +0.5 s, by run
family and by the QB's depth at the snap (under center < 2.5 yd behind the
ball, shotgun otherwise).
usage: handoff-speed.py SIM_COMMON.jsonl.gz [...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
FAM = {'OUTSIDE ZONE': 'zone', 'INSIDE ZONE': 'zone', 'outsideZone': 'zone', 'wideZone': 'zone', 'insideZone': 'zone',
       'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'DUO': 'gap', 'power': 'gap', 'counter': 'gap', 'trap': 'gap', 'duo': 'gap'}
def speeds(rows, label):
    acc = {}
    for raw in rows:
        fam = FAM.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw); c = raw.get('carrier'); h = p.events.get('handoff')
        qbs = p.who('O', 'QB')
        if c is None or h is None or not qbs or not p.live(h + .5): continue
        qx = p.pos(qbs[0], 0)[0]
        if qx is None: continue
        form = 'under' if qx > -2.5 else 'gun'
        acc.setdefault((form, fam), []).append((p.speed(c, p.k(h)), p.speed(c, p.k(h + .5)), p.pos(c, p.k(h))[0]))
    for (form, fam), v in sorted(acc.items()):
        print(f"{label:22s} {form:5s} {fam:4s} n {len(v):5d} | speed at handoff p25/50/75 {q([a[0] for a in v],.25)}/{q([a[0] for a in v])}/{q([a[0] for a in v],.75)} | +0.5 s {q([a[1] for a in v])} | depth {q([a[2] for a in v])}")
nfl = [json.loads(l) for l in gzip.open('out/mechanics/nfl-plays.jsonl.gz', 'rt')]
speeds([r for r in nfl if r.get('kind') == 'run'], 'NFL')
for path in sys.argv[1:]:
    speeds([json.loads(l) for l in gzip.open(path, 'rt')], path.split('/')[-1][:12])
