"""Paired comparison of two ref-replay arms: python3 -I scripts/diag/ref-compare.py <base> <arm>
Reads out/ref/<arm>-*.jsonl. Yards capped at 20 for means (as hitblk.py); paired difference on capped yards."""
import glob, json, math, sys
def load(a):
    d = {}
    for f in glob.glob(f"out/ref/{a}-*.jsonl"):
        for l in open(f):
            r = json.loads(l); d[r["id"]] = r
    return d
A, B = load(sys.argv[1]), load(sys.argv[2])
GROUP = {"outsideZone": "OZ", "wideZone": "OZ", "insideZone": "IZ", "splitZone": "IZ", "power": "gap", "counter": "gap", "trap": "gap", "draw": "draw"}
def stat(rows):
    y = [min(r["yards"], 20) for r in rows]; n = max(1, len(y))
    out = f"n {len(y):4d} mean<20 {sum(y)/n:5.2f} <=0 {100*sum(r['yards']<=0 for r in rows)/n:4.1f}% 10+ {100*sum(r['yards']>=10 for r in rows)/n:4.1f}% 20+ {100*sum(r['yards']>=20 for r in rows)/n:4.1f}%"
    if rows and "broken" in rows[0]:
        out += f" broken/run {sum(r.get('broken', 0) for r in rows)/n:.3f} missed/run {sum(r.get('missed', 0) for r in rows)/n:.3f}"
    return out
err = [r for r in list(A.values()) + list(B.values()) if "error" in r]
print(f"plays {len(A)} / {len(B)}, errors {len(err)}", *[f"\n  {r['id']} {r['error']}" for r in err[:8]])
for g in ["OZ", "IZ", "gap", "draw", "other", "all"]:
    ids = [i for i in A if i in B and "error" not in A[i] and "error" not in B[i] and (g == "all" or GROUP.get(A[i]["scheme"], "other") == g)]
    if not ids: continue
    d = [min(B[i]["yards"], 20) - min(A[i]["yards"], 20) for i in ids]; m = sum(d) / len(d)
    se = math.sqrt(sum((x - m) ** 2 for x in d) / max(1, len(d) - 1) / len(d))
    print(f"{g:5s} {sys.argv[1]}: {stat([A[i] for i in ids])}\n      {sys.argv[2]}: {stat([B[i] for i in ids])}   paired {m:+.2f} (SE {se:.2f})")
