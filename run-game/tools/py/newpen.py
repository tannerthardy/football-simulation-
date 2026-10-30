"""OZ snaps (same id) where the arm's first carrier contact is a DL behind the LOS and the base's is not: who hit him,
was that DL a combination defender in either arm (planned combo target at the snap), his blocker at the hit."""
import json, sys, math
from collections import Counter
def load(paths):
    out = {}
    for path in paths:
        for p in json.load(open(path)): out[p['id']] = p
    return out
def first(p):
    s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
    c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
    if c is None: return None
    for k, f in enumerate(fr):
        if f['ph'] != 'live' or f['c'] != c: continue
        for j, a in enumerate(ag):
            if a['team'] == 'D' and math.dist(f['a'][j][:2], f['a'][c][:2]) < 1.0:
                return dict(k=k, j=j, x=f['a'][c][0] - los, pos=a['pos'], slot=a['slot'], eng=f['a'][j][5])
    return None
T = sys.argv[1]; A = load([f'{T}/trace-seed{s}-run-DEV542.json' for s in (7, 9, 11, 13)]); B = load([f'{T}/trace-seed{s}-run-{sys.argv[2]}.json' for s in (7, 9, 11, 13)])
C = Counter()
for i, pb in B.items():
    if not pb['setup'].get('concept', '').startswith(('oz', 'wz')) or i not in A: continue
    fa, fb = first(A[i]), first(pb)
    dl = lambda f: f and f['x'] < 0 and f['pos'] in ('DT', 'DE', 'EDGE')
    if dl(fb) and not dl(fa):
        ag = pb['setup']['agents']
        combo_tgt = {ag[b]['tgt'] for b in range(len(ag)) if ag[b]['plan'] == 'combo'}
        role = 'combo DL' if fb['slot'] in combo_tgt else 'other DL'
        blk = ag[fb['eng']]['slot'] + ':' + str(pb['frames'][fb['k']]['a'][fb['eng']][8]) if fb['eng'] >= 0 else 'unblocked'
        C[f'new DL backfield first hit: {role}, at the hit {"engaged" if fb["eng"] >= 0 else "free"}'] += 1
        C['  blocker at hit ' + blk.split(':')[1] if fb['eng'] >= 0 else '  free'] += 1
    if dl(fa) and not dl(fb): C['removed DL backfield first hit'] += 1
for k, v in sorted(C.items()): print(k, v)
