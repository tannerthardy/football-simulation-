"""Do linemen convert proximity into first contact? One operator for NFL and
sim common plays: at the frame the runner first reaches the line (depth 0),
box defenders (metrics.box_defenders) within REACH yd of him, how many of
those were next to an OL (within 1.5 yd: likely engaged), and how often the
first contact's nearest defender is one of them.
usage: dlconvert.py FILE.jsonl.gz [FAMILY]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
REACH = 1.6
fam = sys.argv[2] if len(sys.argv) > 2 else None
n = near = eng = conv = conv_eng = 0
for line in gzip.open(sys.argv[1], 'rt'):
    raw = json.loads(line)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if fam and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    p = Play(raw); c = raw['carrier']; ol = p.who('O', 'OL'); box = p.box_defenders()
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k0 = next((k for k in range(end + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0 and k * p.dt > .5), None)
    fc = (raw.get('events') or {}).get('first_contact')
    if k0 is None or fc is None: continue
    n += 1
    close = [d for d in box if (p.dist(d, c, k0) or 99) <= REACH]
    if not close: continue
    near += 1
    engaged = [d for d in close if any((p.dist(d, b, k0) or 99) <= 1.5 for b in ol)]
    eng += bool(engaged)
    kf = p.k(fc)
    defs = [i for i in p.who('D') if p.pos(i, kf)[0] is not None]
    first = min(defs, key=lambda i: p.dist(i, c, kf) or 99) if defs else None
    conv += first in close
    conv_eng += first in engaged
print(f"{sys.argv[1].split('/')[-1]:22s} {fam or 'all'}: runs crossing {n}; a box defender within {REACH} yd at the crossing {100*near/max(1,n):.0f}% (next to an OL {100*eng/max(1,near):.0f}% of those) | first contact by one of them {100*conv/max(1,near):.0f}% (by a lineman next to an OL {100*conv_eng/max(1,eng):.0f}%)")
