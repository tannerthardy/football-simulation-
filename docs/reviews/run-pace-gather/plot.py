"""Plot saved native evidence only; performs no simulation.

Reads the small committed plot-data.json, extracted from the exact #117
isolated interaction arms documented in README.md. Performs no native replay.
"""
from pathlib import Path
import json
import os

os.environ.setdefault("MPLCONFIGDIR", "/tmp/run-pace-gather-matplotlib")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUTPUT = Path(__file__).with_name("paths.png")
DATA = json.loads(Path(__file__).with_name("plot-data.json").read_text())

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10,
                     "axes.spines.top": False, "axes.spines.right": False})
fig, axes = plt.subplots(2, 2, figsize=(12.2, 8.1), constrained_layout=True)
for arm in DATA["arms"]:
    label, color = arm["label"], arm["color"]
    times, request, achieved, beyond_los, load, de_ahead = zip(*arm["samples"])
    # Requests stored in frame t were consumed before that World's .05s step.
    axes[0, 0].step([t - .05 for t in times], request, where="post", color=color,
                    label=label + " — request", linewidth=1.8)
    axes[0, 0].plot(times, achieved, color=color, linestyle="--", linewidth=1.6,
                    label=label + " — achieved")
    axes[0, 1].plot(times, beyond_los,
                    color=color, linewidth=2.1, label=label)
    axes[1, 0].plot(times, load, color=color, linewidth=1.8, label=label)
    axes[1, 1].plot(times, de_ahead, color=color, linewidth=1.8, label=label)

axes[0, 0].set(title="A. Same direction, less unnecessary braking",
               ylabel="RB speed (yd/s)", xlabel="Command time (solid); post-step time (dashed), s")
axes[0, 0].set_xlim(1.5, 2.55)
axes[0, 0].annotate("1.75s command: ½ → 15/16 pace", xy=(1.75, 5.70),
                    xytext=(1.63, 8.2), arrowprops={"arrowstyle": "->", "color": "#444"})
axes[0, 0].legend(fontsize=8, loc="lower right", framealpha=.9)
axes[0, 1].set(title="B. Earlier arrival, not a guaranteed escape",
               ylabel="RB body center beyond LOS (yd)", xlabel="Post-World time (s)")
axes[0, 1].axhline(0, color="#777", linewidth=.8)
axes[0, 1].text(1.52, .07, "Line of scrimmage", color="#555", fontsize=9)
axes[0, 1].scatter([2.95, 2.80], [.032, .115], c=[arm["color"] for arm in DATA["arms"]], zorder=4)
axes[0, 1].annotate("LOS: 2.95 → 2.80s", xy=(2.80, .115), xytext=(2.04, 1.15),
                    arrowprops={"arrowstyle": "->", "color": "#444"})
axes[0, 1].axvline(3.10, color="#555", linestyle=":", linewidth=1)
axes[0, 1].text(3.075, -2.9, "Mike grasps at 3.10s\nwith bounded pace", ha="right", fontsize=9)
axes[1, 0].set(title="C. LT still transmits real load through arrival",
               ylabel="LT → DE_W force (kg·yd/s²)", xlabel="Post-World time (s)")
axes[1, 1].set(title="D. End remains ahead of the tackle",
               ylabel="DE_W − LT upfield body-center position (yd)", xlabel="Post-World time (s)")
axes[1, 1].set_ylim(.50, .70)
axes[1, 1].text(1.56, .675, "Positive: end is on the upfield side\nNo DE_W runner contact in either arm", fontsize=9)
for ax in axes.flat:
    ax.grid(axis="y", alpha=.18)
    if ax is not axes[0, 0]:
        ax.set_xlim(1.5, 3.15)
for ax in [axes[0, 1], axes[1, 0], axes[1, 1]]:
    ax.legend(fontsize=8, loc="best")
fig.suptitle("Weak wide zone: bounded pace improves arrival while preserving the loaded edge block\n"
             "Exact saved Ace12 Over3 interaction with unmerged #117; all 22 players react normally",
             fontsize=13, fontweight="bold")
fig.savefig(OUTPUT, dpi=150, facecolor="white")
print(OUTPUT)
