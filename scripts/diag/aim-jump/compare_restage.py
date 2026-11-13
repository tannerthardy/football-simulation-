#!/usr/bin/env python3
"""Compare restage.ts arms on the same snaps and dice (TKL-2, Stage 4).

Outcomes: per snap, the mean over its k shifts; arm differences are paired by snap
(SE across snaps). Re-steer: scripts/mechanics/pursuit_aim.py (the NFL operator) on
each shift's plays separately, reported as mean and spread over the k shifts.

    python3 -I scripts/diag/aim-jump/compare_restage.py DIR BASE ARM [ARM ...]
"""
import gzip, json, math, os, re, subprocess, sys, tempfile
from collections import defaultdict
d, base, *arms = sys.argv[1:]
here = os.path.dirname(os.path.abspath(__file__))
op = os.path.join(here, "..", "..", "mechanics", "pursuit_aim.py")

def rows(arm):
    by = defaultdict(list)
    for r in json.load(open(f"{d}/{arm}.rows.json")): by[r["snap"]].append(r)
    return by

def mean(v): return sum(v) / len(v) if v else float("nan")

def resteer(arm):
    shifts = defaultdict(list)
    for line in gzip.open(f"{d}/{arm}.jsonl.gz", "rt"):
        shifts[json.loads(line)["id"].rsplit("-k", 1)[1]].append(line)
    out = defaultdict(list)
    with tempfile.TemporaryDirectory() as t:
        for j, lines in sorted(shifts.items()):
            f = os.path.join(t, f"k{j}.jsonl.gz")
            with gzip.open(f, "wt") as g: g.writelines(lines)
            txt = subprocess.run([sys.executable, "-I", op, f], capture_output=True, text=True, check=True).stdout
            m = re.search(r"re-steer: .* share >15 deg ([\d.]+)%", txt); out["all"].append(float(m.group(1)))
            band = None
            for ln in txt.splitlines():
                b = re.search(r"speed ratio pursuer/carrier (\S+)\s+yd", ln)
                if b: band = b.group(1); continue
                s = re.search(r"(slow<0.8|match0.8-1.1|fast>1.1)\s+samples\s+(\d+)%\s+re-steer >15\s+([\d.]+)%", ln)
                if s and band: out[f"{band} {s.group(1)}"].append(float(s.group(3)))
    return out

B = rows(base); RB = resteer(base)
def outcome(by):
    snaps = sorted(by)
    f = lambda key: {s: mean([float(r[key]) for r in by[s]]) for s in snaps}
    return f("yards"), {s: mean([r["missed"] + r["broken"] for r in by[s]]) for s in snaps}, f("td"), {s: by[s][0]["pass"] for s in snaps}
yb, mb, tb, pb = outcome(B)
print(f"snaps {len(yb)}, shifts per snap {len(next(iter(B.values())))}")
for arm in [base] + arms:
    A = rows(arm); ya, ma, ta, _ = outcome(A); R = RB if arm == base else resteer(arm)
    def paired(x, y, keep=lambda s: True):
        dv = [x[s] - y[s] for s in yb if keep(s)]
        m = mean(dv); se = math.sqrt(sum((v - m) ** 2 for v in dv) / max(1, len(dv) - 1) / max(1, len(dv)))
        return m, se
    print(f"== {arm}")
    for lab, keep in (("all", lambda s: True), ("runs", lambda s: not pb[s]), ("passes", lambda s: pb[s])):
        yv = mean([ya[s] for s in yb if keep(s)]); dy, se = paired(ya, yb, keep)
        print(f"   yards/play {lab:6s} {yv:6.2f}  vs {base} {dy:+.2f} ± {se:.2f}")
    dm, sm = paired(ma, mb)
    print(f"   missed+broken/play {mean(list(ma.values())):.3f}  vs {base} {dm:+.3f} ± {sm:.3f};  TD/play {mean(list(ta.values())):.3f}")
    for k in ["all"] + [f"{b} slow<0.8" for b in ("1.5-3", "3-6", "6-10", "10-15")] + [f"{b} match0.8-1.1" for b in ("6-10", "10-15")]:
        v = R.get(k, [])
        if v: print(f"   re-steer >15 deg {k:22s} {mean(v):5.1f}%  (shifts {min(v):.1f}-{max(v):.1f})")
