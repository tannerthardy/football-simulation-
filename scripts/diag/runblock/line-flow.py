"""Offensive line motion on designed runs, by concept family: OL speed at
0.5/1.0/1.5 s, net line lateral flow |mean dy| and mean forward dx at 1.5 s.
Same operator for NFL and sim. python3 -I line-flow.py LABEL=plays.jsonl.gz ..."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    res = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if not fam: continue
        p = Play(raw)
        if p.frames < 16: continue
        ol = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None and p.pos(i, 15)[0] is not None]
        if len(ol) < 5: continue
        r = res.setdefault(fam, {'s5': [], 's10': [], 's15': [], 'flow': [], 'fwd': [], 'dl': [], 'same': []})
        box = [i for i in p.box_defenders() if p.pos(i, 15)[0] is not None]
        if box:
            ol_dy = sum(p.pos(i, 15)[1] - p.pos(i, 0)[1] for i in ol) / len(ol)
            dl_dy = sum(p.pos(i, 15)[1] - p.pos(i, 0)[1] for i in box) / len(box)
            r['dl'].append(abs(dl_dy)); r['same'].append(1.0 if dl_dy * ol_dy > 0 else 0.0)
        for k, key in ((5, 's5'), (10, 's10'), (15, 's15')): r[key].append(sum(p.speed(i, k) for i in ol) / len(ol))
        r['flow'].append(abs(sum(p.pos(i, 15)[1] - p.pos(i, 0)[1] for i in ol) / len(ol)))
        r['fwd'].append(sum(p.pos(i, 15)[0] - p.pos(i, 0)[0] for i in ol) / len(ol))
    print(f"== {label}")
    for fam, r in sorted(res.items()):
        print(f"  {fam:13} n={len(r['flow']):5} OL speed 0.5/1.0/1.5s {q(r['s5'],.5):.1f}/{q(r['s10'],.5):.1f}/{q(r['s15'],.5):.1f} | line flow |dy| at 1.5s p50 {q(r['flow'],.5):.2f} p75 {q(r['flow'],.75):.2f} | forward dx p50 {q(r['fwd'],.5):+.2f} | front-line DL flow |dy| p50 {q(r['dl'],.5):.2f}, same direction {sum(r['same'])/max(1,len(r['same'])):.2f}")
