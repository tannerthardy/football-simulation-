#!/usr/bin/env python3
"""run_film_reference.py's wide-edge table for several common-format files
(NFL, or aim-jump/restage.ts arms), side by side. Same measure() code.

    python3 -I scripts/diag/edge/edge_table.py LABEL=plays.jsonl.gz [...]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from run_film_reference import measure, nfl, mean  # noqa: E402
print("Wide edges (1.5+ yd outside the surface): n, deep 2+ yd, first contact, in on the play at the end")
for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    out = {"timeline": [], "start": [], "pull": [], "backer": [], "edge": []}
    for play in nfl(path): measure(play, out)
    for playside in (True, False):
        r = [t for t in out["edge"] if t[1] is playside]
        print(f"  {label:8s} {'playside' if playside else 'backside'}: {len(r):4d}  deep {mean([t[2] for t in r])}  first contact {mean([t[3] for t in r])}  in on the play {mean([t[4] for t in r])}")
