"""All run concepts in the dump, NFL vs sim: first contact (first frame after handoff a defender is within 1.0 yd of the carrier);
by carrier depth at first contact (<-1, -1..0, 0..1, 1..3, 3+): share of plays, share ending <=0, mean yards after contact (capped),
time from contact to end (NFL: the end event, tackle/out of bounds/TD/slide/safety; sim: the last frame, which is the whistle). Also plays with no contact."""
import sys, json, gzip, math, statistics as st, collections
CON = set(sys.argv[1].split(','))
def plays(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt") as f:
            for line in f:
                p = json.loads(line)
                if p["kind"] != "run" or p["carrier"] is None or p["cell"]["concept"] not in CON: continue
                c = p["carrier"]; pl = p["players"]; X = p["xy"]; D = [i for i, q in enumerate(pl) if q["side"] == "D"]
                yield p["yards"], [(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], p["events"].get("handoff") or 0, p["events"].get("end")
    else:
        for line in open(path):
            r = json.loads(line)
            if r["concept"] in CON: yield r["yards"], [tuple(x) for x in r["car"]], r["def"], r["handoff"], None
BINS = [(-99, -1, '<-1'), (-1, 0, '-1..0'), (0, 1, '0..1'), (1, 3, '1..3'), (3, 99, '3+')]
for path in sys.argv[2:]:
    R = collections.defaultdict(list); n = 0; none = 0
    for yds, C, df, ho, end in plays(path):
        n += 1; h = max(1, int(round(ho * 10))); hit = None
        for f in range(h, len(C)):
            if min(math.dist(d, C[f]) for d in df[f]) <= 1.0: hit = f; break
        if hit is None: none += 1; continue
        x = C[hit][0]; b = next(lab for lo, hi, lab in BINS if lo <= x < hi)
        R[b].append((yds, min(yds, 20) - x, ((round(end * 10) if end is not None else len(C) - 1) - hit) / 10))
    print("==", path.split('/')[-1], 'n', n, f'no contact {100*none/n:.0f}%')
    for _, _, lab in BINS:
        v = R[lab]
        if v: print(f"   contact at {lab:6} {100*len(v)/n:3.0f}% of plays | end <=0 {100*sum(y <= 0 for y, _, _ in v)/len(v):3.0f}% | after contact mean {st.mean(a for _, a, _ in v):.2f} p50 {st.median(a for _, a, _ in v):.2f} | contact->end {st.median(t for _, _, t in v):.1f}s")
