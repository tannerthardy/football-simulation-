"""Static published receipt -> shareable plots; zero simulation calls."""
import json
import pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = pathlib.Path(__file__).resolve().parents[2]
report = json.loads((root / 'data/reviews/current/pass-rush-timing.json').read_text())
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10})
fig, axes = plt.subplots(1, 3, figsize=(15, 4.6))
clean_ids = set(report['cleanIds'])
rows = [r for r in report['nativeRows'] if r['id'] in clean_ids and r['measurement']['release'] is not None]
times = sorted(r['measurement']['release'] for r in rows)
ax = axes[0]
ax.step(times, [(i + 1) / len(times) for i in range(len(times))], where='post', color='#235f8b', lw=2)
ax.axvline(2.4, color='#235f8b', ls=':', label='Sim median 2.40 s')
ax.axvline(2.6, color='#b17828', ls='--', label='NFL retained median 2.60 s')
ax.set(title=f'Current clean releases (n={len(times)})', xlabel='Snap to ball release (s)', ylabel='Share released')
ax.set(xlim=(0, 5.5), ylim=(0, 1.03)); ax.legend(loc='lower right', fontsize=8)
for ax, pid in zip(axes[1:], ['R3101-S1001-P46', 'R4202-S2001-P150']):
    r = next(r for r in report['samePictureDiagnostic']['rows'] if r['id'] == pid)
    touch = r['firstContact']['t']
    samples = [s for s in r['samples'] if touch - 1.1 <= s['t'] <= touch]
    x = [s['t'] for s in samples]
    ax.plot(x, [s['oldTotal'] for s in samples], color='#ad3d3d', lw=2, label='Existing center forecast')
    ax.plot(x, [s['total'] for s in samples], color='#235f8b', lw=2, label='Same-picture contact envelope')
    ax.plot(x, [touch + .05 - t for t in x], color='#666666', ls=':', lw=2, label='Observed contact upper bound')
    ax.axhline(.45, color='#8a6d25', ls='--', label='Existing emergency threshold')
    ax.axvspan(touch, touch + .05, color='#999999', alpha=.25)
    ax.set(title=f'{pid}\nFirst contact tick {touch:.2f} s', xlabel='Decision time after snap (s)', ylabel='Estimated time / observed bound (s)')
    ax.set(xlim=(min(x), touch + .10), ylim=(0, max(1.1, max(s['oldTotal'] for s in samples) + .08)))
    ax.legend(loc='upper right', fontsize=7.5)
for ax in axes:
    ax.grid(alpha=.18)
    ax.spines[['top', 'right']].set_visible(False)
fig.suptitle('Release is not generally late; the QB can still underestimate attainable contact', fontsize=14)
fig.text(.5, .012, 'Baseline 4ded6b6, unchanged physics/43 flags. Contact occurs during the shaded 50-ms World step. Blue envelope is a diagnostic, not an installed fix.', ha='center', fontsize=9)
fig.tight_layout(rect=(0, .05, 1, .94))
out = root / 'docs/reviews/figures/pass-rush-pressure-forecast.png'
out.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(out, dpi=160)
print(out.relative_to(root))
