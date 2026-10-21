"""Summarize leadprobe.ts outputs. usage: python3 scripts/diag/gap/leadsum.py label=file.jsonl ..."""
import json, sys, statistics as st
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = [json.loads(l) for l in open(path) if l.strip()]
    for key in ['all', 'power/i_pro_21/weak', 'power/i_pro_21/strong', 'power/ace_12', 'counter']:
        rs = rows if key == 'all' else [r for r in rows if all(k in (r['concept'], r['formation'], r['dir']) for k in key.split('/'))]
        if not rs: continue
        g = [r['gain'] for r in rs]
        d = {k: [r['depth'][k] for r in rs if r['depth'][k] is not None] for k in ('1.4', '1.8', '2.2')}
        lat = [r['leadAtCross'] for r in rs if r['leadAtCross'] is not None]
        print(f"{label:8s} {key:22s} n {len(rs):3d} | lead blocks before cross {sum(r['blockedBeforeCross'] for r in rs):3d} (backer {sum(r['backerBeforeCross'] for r in rs):3d}) ever {sum(1 for r in rs if r['first']):3d}"
              f" | gain p50 {st.median(g):5.2f} mean {st.mean(g):5.2f} <0 {sum(x < 0 for x in g):2d} <=2 {sum(x <= 2 for x in g):3d}"
              f" | lead depth 1.4/1.8/2.2 {st.median(d['1.4']):5.2f}/{st.median(d['1.8']):5.2f}/{st.median(d['2.2']):5.2f}"
              f" | lead-carrier lateral at cross p50 {st.median(lat) if lat else float('nan'):5.2f}")
