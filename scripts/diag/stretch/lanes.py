"""Where runs cross the line, one operator for NFL tracking and sim common
plays. Play direction: the sign of the carrier's lateral displacement from the
snap to the handoff + 0.3 s (his first track). Lane at the crossing, from the
ball laterally and signed by that direction: cutback (< -1), middle (-1..1),
playside (1..4), outside (> 4). Per lane: share of runs, median gain, and 4+ /
10+ rates. usage: lanes.py FILE [--ytg60] [--fam F] [--nfl-forms SINGLEBACK,I_FORM]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else None
forms = tuple(sys.argv[sys.argv.index('--nfl-forms') + 1].split(',')) if '--nfl-forms' in sys.argv else None
F = json.load(open('out/mechanics/nfl-formation.json')) if forms else {}
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
o = {}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if fam and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    if forms and raw.get('source') != 'sim' and F.get(raw['id']) not in forms: continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if ev.get('handoff') is None: continue
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    k1 = p.k(ev['handoff'] + .3)
    if kx is None or k1 > end or p.pos(c, k1)[1] is None: continue
    s = 1 if p.pos(c, k1)[1] - p.pos(c, 0)[1] >= 0 else -1
    y = (p.pos(c, kx)[1] - by) * s
    lane = 'cutback' if y < -1 else 'middle' if y <= 1 else 'playside' if y <= 4 else 'outside'
    o.setdefault(lane, []).append(raw['yards']); n += 1
print(f"{path.split('/')[-1][:22]:22s} {fam or 'all'} runs crossing {n}")
for lane in ('cutback', 'middle', 'playside', 'outside'):
    g = o.get(lane, [])
    if g: print(f"  {lane:8s} {100*len(g)/n:4.0f}% | gain p50 {q(g)} | 4+ {100*sum(x >= 4 for x in g)/len(g):3.0f}% 10+ {100*sum(x >= 10 for x in g)/len(g):3.0f}% 40+ {100*sum(x >= 40 for x in g)/len(g):4.1f}%")
