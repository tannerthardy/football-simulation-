"""Counter first contact, NFL vs sim, same operator: at the first-contact time, the defender nearest the carrier; carrier
x (behind LOS?); that defender's snap class signed toward the pull side (rule pullers' mean lateral at 1.5 s):
line (< 1.8 deep): 'end ps' (outermost play-side line man), 'line ps' (other play side), 'line bs'; box (1.8-8 deep,
within 8 yd): 'box ps' / 'box bs' (1 yd from the OL centre); 'DB/out'. Sim also: snap assignment of that man
(who had him as tgt/climb, their plan) and whether that blocker got a sustained block (1.2 yd, 0.3 s) on him first.
usage: ctrfirst.py run_film_reference.py nfl.jsonl.gz traces..."""
import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); N = collections.Counter()
def classify(p):
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy)
    if n < 22 or p["concept"] != "COUNTER" or p["contact"] is None: return None
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return None
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if not pulls: return None
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    f = k(p["contact"]); defs = [i for i, q in enumerate(pl) if q["side"] == "D"]
    j = min(defs, key=lambda j: math.dist(xy[f][j], xy[f][car]))
    x0, y0 = xy[0][j]; lat = (y0 - cy) * ps
    if x0 < 1.8:
        line_ps = [d for d in defs if xy[0][d][0] < 1.8 and (xy[0][d][1] - cy) * ps > 0]
        end = max(line_ps, key=lambda d: (xy[0][d][1] - cy) * ps) if line_ps else None
        cls = "end ps" if j == end else "line ps" if lat > 0 else "line bs"
    elif x0 < 8 and abs(y0 - cy) < 8: cls = "box ps" if lat > 1 else "box bs" if lat < -1 else "box mid"
    else: cls = "DB/out"
    return j, cls, xy[f][car][0] < 0, p["contact"]
for p in rfr.nfl(sys.argv[2]):
    r = classify(p)
    if not r: continue
    _, cls, behind, t = r; s = "nfl"; N[s] += 1; N[s, "behind"] += behind
    C[s, "all"][cls] += 1
    if behind: C[s, "behind"][cls] += 1
for path in sys.argv[3:]:
    raw = {q["id"]: q for q in json.load(open(path))}
    for p, q in zip(rfr.sim([path]), [q for q in raw.values() if not q["nullified"] and q["setup"].get("concept") is not None and any(f["c"] >= 0 and q["setup"]["agents"][f["c"]]["slot"] != "QB" for f in q["frames"])]):
        r = classify(p)
        if not r: continue
        j, cls, behind, t = r; s = "sim"; N[s] += 1; N[s, "behind"] += behind
        C[s, "all"][cls] += 1
        if behind:
            C[s, "behind"][cls] += 1
            ag = q["setup"]["agents"]; slot = ag[j]["slot"]
            own = [i for i, a in enumerate(ag) if a["team"] == "O" and (a.get("tgt") == slot or a.get("climb") == slot)]
            xy = p["xy"]
            def held(i):
                return any(all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2)) for f in range(2, min(len(xy) - 2, int(t / 0.1))))
            if not own: tag = "unassigned"
            else: tag = "assigned " + ",".join(f"{ag[i]['plan']}{'/' + ag[i]['role'] if ag[i].get('role') else ''}:{'held' if held(i) else 'never held'}" for i in own)
            C[s, "behind " + cls][tag] += 1
for s in ("nfl", "sim"):
    n = N[s]; b = N[s, "behind"]
    print(f"{s}: counters {n}, first contact behind LOS {b/n:.2f}")
    print("   all    :", " ".join(f"{c} {v/n:.2f}" for c, v in C[s, "all"].most_common()))
    print("   behind :", " ".join(f"{c} {v/n:.2f}" for c, v in C[s, "behind"].most_common()))
for cls in ("end ps", "line ps", "line bs", "box ps", "box mid", "box bs", "DB/out"):
    c = C["sim", "behind " + cls]
    if c: print(f"sim behind-LOS first contact by {cls}:", "; ".join(f"{k} {v}" for k, v in c.most_common(6)))
