"""Who stops runs in a yardage band, one operator for NFL tracking and sim
common plays. For runs whose final gain falls in [LO, HI), the defender
nearest the carrier at the run's end (a tackler proxy), by group and by his
depth past the line at the snap (deep 10+, mid 5-10, box <5); also whether
he was nearer than 1.5 yd (contact) and how far behind the carrier he was.
usage: stopper.py FILE LO HI [--ytg60] [--concept iz|oz]"""
import gzip, json, math, sys, collections
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--') and a not in ('iz', 'oz')]
path, LO, HI = args[0], float(args[1]), float(args[2])
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
cnt = collections.Counter(); n = 0; total = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if want and raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') != {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE'}[want]: continue
    if want and raw.get('source') == 'sim' and not raw['id'].startswith(want + '/'): continue
    total += 1
    if not (LO <= raw['yards'] < HI): continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    D = [d for d in p.who('D') if p.pos(d, end)[0] is not None and p.pos(d, 0)[0] is not None]
    if not D or p.pos(c, end)[0] is None: continue
    d = min(D, key=lambda d: p.dist(c, d, end)); n += 1
    x0 = p.pos(d, 0)[0]; lvl = 'deep10+' if x0 >= 10 else 'mid5-10' if x0 >= 5 else 'box<5'
    cnt[(p.players[d]['group'], lvl)] += 1
print(f"{path.split('/')[-1]} {want or ''} runs {total}, ending in [{LO:.0f},{HI:.0f}): {n} ({100*n/max(1,total):.1f}%) | nearest at the end, share by group/snap depth:")
print('   ' + '  '.join(f"{g}/{l} {100*v/n:.0f}%" for (g, l), v in cnt.most_common()))
