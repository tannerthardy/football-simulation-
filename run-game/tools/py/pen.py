"""Zone/gap runs: share whose first defender contact with the carrier (1.0 yd) is behind the LOS, by whom (DL/LB/DB);
and DL deepest penetration at 1.5 s (mean of the deepest DL's -x)."""
import json, sys, math
from collections import Counter
GROUP = {"DT": "DL", "DE": "DL", "EDGE": "DL", "LB": "LB", "CB": "DB", "S": "DB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ", "power": "POWER", "counter": "COUNTER", "trap": "TRAP"}
C = Counter(); pen = Counter()
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        fam = next((v for k, v in FAM.items() if s.get('concept', '').startswith(k)), None)
        if not fam or not fr: continue
        c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if c is None: continue
        C[fam + ' runs'] += 1
        hit = None
        for k, f in enumerate(fr):
            if f['ph'] != 'live' or f['c'] != c: continue
            for j, a in enumerate(ag):
                if a['team'] == 'D' and math.dist(f['a'][j][:2], f['a'][c][:2]) < 1.0: hit = (k, j); break
            if hit: break
        if hit and fr[hit[0]]['a'][c][0] - los < 0:
            C[fam + ' first contact behind LOS'] += 1; C[fam + ' ... by ' + GROUP.get(ag[hit[1]]['pos'], ag[hit[1]]['pos'])] += 1
        if len(fr) > 15:
            dl = [j for j, a in enumerate(ag) if a['team'] == 'D' and GROUP.get(a['pos']) == 'DL']
            if dl: pen[fam] += -min(fr[15]['a'][j][0] - los for j in dl); pen[fam + ' n'] += 1
for fam in ('IZ', 'OZ', 'POWER', 'COUNTER', 'TRAP'):
    n = C[fam + ' runs']
    if not n: continue
    print(f"{fam}: runs {n} | first contact behind LOS {C[fam+' first contact behind LOS']/n:.3f} (DL {C[fam+' ... by DL']/n:.3f}, LB {C[fam+' ... by LB']/n:.3f}, DB {C[fam+' ... by DB']/n:.3f}) | deepest DL at 1.5 s {pen[fam]/max(1,pen[fam+' n']):.2f} yd")
