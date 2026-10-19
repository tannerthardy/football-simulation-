"""Near-line encounters at speed, one operator for NFL tracking and sim
common plays (the power-tail question: do second-level and secondary
defenders stop a fast back near the line as often as NFL defenders do?).
For runs, each defender's first frame within 1.0 yd of the carrier while the
carrier is 0-10 yd past the line is an encounter. Outcome as in
openfield.py: 'ended' if the play ends within 1.0 s, 'broken' if the carrier
is still >= 4 yd/s 0.5 s later and gains >= 5 more yards, else 'slowed'.
Rows by defender group and carrier speed at the encounter. 'broken' is a
survivor-conditioned motion proxy, not a broken-tackle label. Sim plays end
sooner after first contact than NFL plays, so later arrivals are undercounted
in the sim; --first keeps only each run's earliest encounter (ties: all).
usage: dbhits.py FILE [--ytg60] [--concept power] [--first]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
concept = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
BINS = ((5.5, '<5.5'), (7.0, '5.5-7'), (99, '7+'))
rows, runs = [], 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    # Sim ids start with the concept; NFL plays carry PFF's run concept.
    if concept and not (str(raw['id']).startswith(concept + '/') or (raw.get('cell') or {}).get('concept') == concept.upper()): continue
    p = Play(raw); c = raw['carrier']; runs += 1
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    found = []
    for d in p.who('D'):
        k = next((k for k in range(end + 1) if 0 <= (p.pos(c, k)[0] or -99) < 10 and p.dist(c, d, k) <= 1.0), None)
        if k is None: continue
        cx, cs = p.pos(c, k)[0], p.speed(c, k)
        k5 = p.k(k * p.dt + .5)
        if (end - k) * p.dt <= 1.0: out = 'ended'
        elif k5 <= end and p.speed(c, k5) >= 4 and max(p.pos(c, kk)[0] for kk in range(k, end + 1)) - cx >= 5: out = 'broken'
        else: out = 'slowed'
        found.append((k, (raw['players'][d]['group'], next(n for top, n in BINS if cs < top), out)))
    if '--first' in sys.argv and found:
        k0 = min(k for k, _ in found); found = [f for f in found if f[0] == k0]
    rows += [r for _, r in found]
print(f"{path.split('/')[-1][:24]:24s} runs {runs}, encounters {len(rows)}")
for g in ('DL', 'LB', 'DB'):
    line = []
    for _, b in BINS:
        s = [r for r in rows if r[0] == g and r[1] == b]
        pct = lambda o: 100 * sum(1 for r in s if r[2] == o) / max(1, len(s))
        line.append(f"{b:>5s} n {len(s):4d} ({len(s)/max(1,runs):.2f}/run) ended {pct('ended'):3.0f}% broken {pct('broken'):3.0f}%")
    print(f"  {g}  " + ' | '.join(line))
