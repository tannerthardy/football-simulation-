"""Placebo floor for ref:report: python3 -I scripts/diag/ref-placebo.py <base> <placebo arm>... [--candidate <arm>]
Each placebo arm differs from <base> only by a 1e-3 yd nudge to one body after the first tick, so its paired delta is
divergence alone. Prints each arm's paired delta per family (yards capped at 20) and the spread (RMS across arms), the
floor a candidate's paired delta must clear; with --candidate, prints that arm's delta beside it."""
import glob, json, math, sys
argv = sys.argv[1:]; cand = None
if '--candidate' in argv: i = argv.index('--candidate'); cand = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
base, arms = argv[0], argv[1:]
def load(a):
    d = {}
    for f in glob.glob(f"out/ref/{a}-*.jsonl"):
        for l in open(f):
            r = json.loads(l); d[r["id"]] = r
    return d
GROUP = {"outsideZone": "OZ", "wideZone": "OZ", "insideZone": "IZ", "splitZone": "IZ", "power": "gap", "counter": "gap", "trap": "gap", "draw": "draw", "duo": "duo", "toss": "toss"}
FAM = ["OZ", "IZ", "gap", "duo", "toss", "draw", "all"]
B = load(base)
def delta(D, g):
    ids = [i for i in B if i in D and "error" not in B[i] and "error" not in D[i] and (g == "all" or GROUP.get(B[i]["scheme"], "other") == g)]
    if not ids: return None, 0, 0
    d = [min(D[i]["yards"], 20) - min(B[i]["yards"], 20) for i in ids]; m = sum(d) / len(d)
    se = math.sqrt(sum((x - m) ** 2 for x in d) / max(1, len(d) - 1) / len(d))
    return m, se, sum(1 for x in d if x != 0) / len(d)
print(f"{'family':6s}" + "".join(f"{a:>16s}" for a in arms) + f"{'placebo RMS':>14s}{'mean |SE|':>11s}" + (f"{cand:>16s}" if cand else ""))
for g in FAM:
    rows = [delta(load(a), g) for a in arms]
    vals = [m for m, _, _ in rows if m is not None]
    if not vals: continue
    rms = math.sqrt(sum(v * v for v in vals) / len(vals)); mse = sum(se for _, se, _ in rows) / len(rows)
    line = f"{g:6s}" + "".join(f"  {m:+6.2f} ({se:.2f})" for m, se, _ in rows) + f"{rms:14.2f}{mse:11.2f}"
    if cand:
        m, se, _ = delta(load(cand), g); line += f"  {m:+6.2f} ({se:.2f})"
    print(line)
moved = [delta(load(a), "all")[2] for a in arms]
print(f"share of plays whose yards change, per placebo arm: " + ", ".join(f"{100*x:.0f}%" for x in moved))
