"""Render committed measurements only; no native simulation or ignored input."""
from pathlib import Path
import json
import os
import time

os.environ.setdefault("MPLCONFIGDIR", "/tmp/zone-combo-surface-matplotlib")
os.environ.setdefault("XDG_CACHE_HOME", "/tmp/zone-combo-surface-cache")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

started = time.perf_counter()
HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / "plot-data.json").read_text())
SLOTS = DATA["positionSlots"]
COLORS = {"LT": "#71818c", "LG": "#128b92", "C": "#2460a7", "RG": "#a44980",
          "RT": "#7766ab", "DT_W": "#b24234", "LB_M": "#c14832", "RB": "#222222"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                     "axes.spines.top": False, "axes.spines.right": False})
fig, axes = plt.subplots(2, 2, figsize=(12.8, 9.5), constrained_layout=True)
for n, arm in enumerate(DATA["arms"]):
    ax = axes[0, n]
    samples = arm["samples"]
    for slot in SLOTS:
        i = SLOTS.index(slot)
        xs, ys = zip(*(s[1][i] for s in samples))
        ax.plot(xs, ys, color=COLORS[slot], linewidth=1.6 if slot == "RB" else 1.3,
                linestyle="--" if slot.startswith("DT") or slot == "LB_M" else "-", alpha=.85)
        at_two = next(s for s in samples if s[0] == 2)
        x, y = at_two[1][i]
        ax.scatter([x], [y], s=24, c=COLORS[slot], zorder=4)
        ax.annotate(slot.replace("LB_M", "Mike"), (x, y), xytext=(4, 5 if slot != "DT_W" else -12),
                    textcoords="offset points", fontsize=8, color=COLORS[slot])
    for i, slot in enumerate(["C", "LG"]):
        loaded = [s for s in samples if s[2+i] > 1e-6]
        ax.scatter([s[1][SLOTS.index(slot)][0] for s in loaded],
                   [s[1][SLOTS.index(slot)][1] for s in loaded], c="#d0a126", s=8, alpha=.8, zorder=3)
    contact_time = 3.10 if n == 0 else 3.00
    contacted = next(s for s in samples if s[0] == contact_time)
    p = contacted[1][SLOTS.index("RB")]
    ax.scatter([p[0]], [p[1]], marker="x", c="#b24234", s=70, linewidths=2, zorder=5)
    ax.annotate(f"Mike grasp {contact_time:.2f}s", p, xytext=(-113, 16),
                textcoords="offset points", fontsize=9, color="#a03124")
    ax.axhline(0, linewidth=.8, color="#777")
    ax.set(title=arm["label"], xlabel="Toward weak side from ball (yd)",
           ylabel="Upfield from LOS (yd)", xlim=(-2, 10), ylim=(-7, 4.3))
    ax.set_aspect("equal", adjustable="box")
    ax.grid(alpha=.15)

for arm, color in zip(DATA["arms"], ["#9e6338", "#156e9d"]):
    samples = arm["samples"]
    start_y = 27.446 - 26.67  # same initial DT_W alignment, .05s before meaningful movement
    axes[1, 0].plot([s[0] for s in samples],
                    [s[1][SLOTS.index("DT_W")][0] - start_y for s in samples],
                    c=color, linewidth=2, label=arm["label"])
axes[1, 0].axvline(2, color="#888", linewidth=.8, linestyle=":")
axes[1, 0].set(title="DT_W gains 1.064 yd more lateral flow at 2.00s",
               xlabel="Post-World time (s)", ylabel="DT_W lateral movement (yd)")
axes[1, 0].text(.58, 2.55, "2.00s loaded keeper:\nBefore: C, 598 kg·yd/s²\nAfter: LG, 649 kg·yd/s²", fontsize=10)
axes[1, 0].legend(loc="lower right", fontsize=8)
axes[1, 0].grid(axis="y", alpha=.18)

rows = DATA["strongAtTwo"]["values"]
xs = list(range(len(rows)))
axes[1, 1].bar([x-.17 for x in xs], [r[1] for r in rows], width=.34, color="#177c8d", label="Playside lateral change")
axes[1, 1].bar([x+.17 for x in xs], [r[2] for r in rows], width=.34, color="#b55a32", label="Upfield change")
axes[1, 1].set_xticks(xs, [r[0] for r in rows])
axes[1, 1].axhline(0, color="#777", linewidth=.8)
axes[1, 1].set(title="Strong WZ: extra lateral flow has a depth cost",
               ylabel="After − before at 2.00s (yd)")
axes[1, 1].text(.1, -1.5, "RG: +0.796 yd lateral\n       −2.132 yd upfield", fontsize=10)
axes[1, 1].legend(loc="upper left", fontsize=8)
axes[1, 1].grid(axis="y", alpha=.18)

fig.suptitle("An initial shared contact surface changes first-level work, not just final yards\n"
             "Ace12 WZ Over3 · #117 + #122 before; same cohort + initial surface after", fontsize=13, fontweight="bold")
fig.supxlabel("Top: actual body-center paths, 0.50–3.10s. Dots/labels at 2.00s; gold dots = sampled C/LG load on DT_W.\n"
              "Both weak arms cross LOS at 2.80s and still miss Mike collection. All 22 players react normally; no literal foot locations.", fontsize=10)
fig.savefig(HERE / "chart.png", dpi=150, facecolor="white")
print(json.dumps({"artifact": str(HERE / "chart.png"), "renderSeconds": time.perf_counter()-started}))
