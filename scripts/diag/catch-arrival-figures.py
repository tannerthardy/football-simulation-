"""Plot achieved velocities, load and recovery from saved native World traces."""
import gzip
import json
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = pathlib.Path(__file__).resolve().parents[2]
packets = [json.loads((root / f"out/catch-arrival/{group}/summary.json").read_bytes())
           for group in ["revised-primary", "revised-fresh"]]
fig, axes = plt.subplots(2, 3, figsize=(13, 8), layout="constrained")
for column, cid in enumerate(["R3101-S1001-P58", "R6103-S3001-P4", "R7204-S4001-P84"]):
    case = next(c for p in packets for c in p["cases"] if c["id"] == cid)
    for a, color, style in zip(case["outcomes"], ["#777777", "#146cba"], ["--", "-"]):
        x = json.loads(gzip.decompress((root / a["artifact"]["path"]).read_bytes()))
        ci, di = x["baselineCatcher"]["idx"], x["selectedDefender"]["idx"]
        ct = next(e["t"] for e in x["result"]["events"] if e["type"] == "catch")
        rows = [r for r in x["rows"] if ct-.5 <= r["t"] <= ct+2 and r["world"]]
        ts = [r["t"]+.05-ct for r in rows]
        # Relative motion transverse to the physical COM-to-COM line.
        cross, xi = [], []
        for r in rows:
            runner, defender = r["world"]["after"][ci], r["world"]["after"][di]
            dx, dy = runner["pos"]["x"]-defender["pos"]["x"], runner["pos"]["y"]-defender["pos"]["y"]
            vx, vy = runner["vel"]["x"]-defender["vel"]["x"], runner["vel"]["y"]-defender["vel"]["y"]
            cross.append(abs(vx*dy-vy*dx)/max(1e-9, (dx*dx+dy*dy)**.5))
            xi.append(sum(v*v for v in runner["support"]["xi"].values())**.5)
        label = f"{a['arm']}: {x['result']['stats']['yac']:.1f} YAC, {x['result']['outcome']}"
        axes[0, column].plot(ts, cross, color=color, linestyle=style, label=label)
        axes[1, column].plot(ts, xi, color=color, linestyle=style)
        for h in x["holds"]:
            if h["defender"] == di and h["carrier"] == ci and h["firstLoaded"] is not None:
                axes[0, column].axvline(h["firstLoaded"]-ct, color=color, alpha=.45, linewidth=.8)
                if h["brokenAt"] is not None:
                    axes[1, column].axvline(h["brokenAt"]-ct, color=color, alpha=.45, linewidth=.8)
                break
    for row in range(2):
        axes[row, column].axvline(0, color="black", linewidth=.8, alpha=.3)
        axes[row, column].grid(alpha=.2)
        axes[row, column].set_xlabel("Seconds from catch tick (20 Hz)")
    axes[0, column].set_title(cid + "\n" + ("selected repair" if column == 0 else "lost ordinary control" if column == 1 else "fresh repair"))
    axes[0, column].set_ylabel("Achieved transverse relative speed (yd/s)")
    axes[1, column].set_ylabel("Runner capture deviation |xi| (yd)")
    axes[0, column].legend(fontsize=7)
fig.suptitle("One defender's moving-arrival probe: achieved contact and recovery\nPhysics/capabilities/helper policy fixed. Vertical colored lines: first load (top), grip break (bottom).")
fig.savefig(root / "out/catch-arrival/arrival-film.svg")
fig.savefig(root / "out/catch-arrival/arrival-film.png", dpi=150)
