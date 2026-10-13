"""Plot existing full native recordings; no generated plays or simulation edits."""
import gzip
import json
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = pathlib.Path(__file__).resolve().parents[2]
data = json.loads(gzip.decompress((root / "out/catch-chain/native-expanded.json.gz").read_bytes()))
summary = json.loads((root / "data/reviews/current/catch-chain-diagnosis.json").read_bytes())
fig, axes = plt.subplots(2, 2, figsize=(12, 9), layout="constrained")
for ax, play in zip(axes.flat, ["P58", "P173", "P103", "P67"]):
    c = next(c for c in data["clips"] if c["id"].endswith(play))
    s = next(c for c in summary["nativeCases"] if c["id"].endswith(play))
    runner, defender = s["runner"]["idx"], s["firstLoadedDefender"]["idx"]
    helper = 21 if play in ["P58", "P173"] else s["helper"]["idx"]
    start = c["result"]["stats"]["timeToThrow"] - .25
    stop = s["firstLoadedBoundary"] + 1.0
    rows = [r for r in c["rows"] if start <= r["t"] <= stop]
    for idx, color, role in [(runner, "#1976d2", "catcher"), (defender, "#d32f2f", "first loaded defender"), (helper, "#388e3c", "secondary defender")]:
        pts = [r["world"]["before"][idx]["pos"] for r in rows]
        p = c["players"][idx]
        ax.plot([p["x"] for p in pts], [p["y"] for p in pts], color=color, linewidth=2,
                label=f"{role}: {p['slot']} {p['id']}")
        for k in range(0, len(pts), 8):
            ax.plot(pts[k]["x"], pts[k]["y"], ".", color=color)
        if len(pts) > 1:
            ax.annotate("", (pts[-1]["x"], pts[-1]["y"]), (pts[-2]["x"], pts[-2]["y"]), arrowprops={"arrowstyle": "->", "color": color})
    for event, marker, color, offset in [("catch", "o", "black", (5, -15)), ("tackle_wrap", "s", "#d32f2f", (5, 9)), ("broken_tackle", "x", "black", (5, 25))]:
        e = next((e for e in c["result"]["events"] if e["type"] == event and
                  (event != "tackle_wrap" or e.get("a") == defender)), None)
        if e and start <= e["t"] <= stop:
            r = min(c["rows"], key=lambda r: abs(r["t"] - e["t"] - .05))
            p = r["world"]["before"][runner]["pos"]
            ax.scatter(p["x"], p["y"], marker=marker, color=color, s=60, zorder=5)
            ax.annotate(event.replace("_", " "), (p["x"], p["y"]), xytext=offset, textcoords="offset points", fontsize=8)
    for y in [0, 53.333333333333336]:
        if ax.get_ylim()[0] - 2 <= y <= ax.get_ylim()[1] + 2:
            ax.axhline(y, color="gray", linewidth=1)
    ax.set_title(f"{play}: {s['outcome']}, {s['yac']:.1f} YAC\nrelative motion across grip {s['entryGeometry']['transverseSpeed']:.1f} yd/s")
    ax.set_xlabel("Downfield x (yards)")
    ax.set_ylabel("Across-field y (yards)")
    ax.set_aspect("equal", adjustable="datalim")
    ax.legend(fontsize=7, loc="best")
    ax.grid(alpha=.2)
fig.suptitle("Actual native catch → approach → contact → support\nSame baseline; dots every 0.4 s. Rear origin alone does not predict failure.")
for extension in ["png", "svg"]:
    fig.savefig(root / f"data/reviews/current/catch-chain-film.{extension}", dpi=160)
