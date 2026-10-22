"""Where 20+ yard completions come from, one operator for NFL tracking and sim
common plays: completions per attempt by gain band, and for 20+ yd
completions the split between air yards at the catch and yards after it.
usage: longpass.py FILE"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
att = comp = 0; rows = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None: continue
    ev = raw.get('events') or {}
    if ev.get('pass_forward') is None: continue
    att += 1
    if ev.get('catch') is None: continue
    p = Play(raw); k = p.k(ev['catch']); x = p.pos(raw['target'], k)[0]
    if x is None: continue
    comp += 1; rows.append((raw['yards'], x, raw['yards'] - x))
long = [r for r in rows if r[0] >= 20]
pct = lambda n, d: f"{100 * n / max(1, d):.1f}%"
print(f"{path.split('/')[-1][:24]:24s} attempts {att}, completions {pct(comp, att)} | 20+ yd completions per attempt {pct(len(long), att)}: "
      f"caught 15+ yd downfield {pct(sum(1 for r in long if r[1] >= 15), len(long))}, YAC 10+ {pct(sum(1 for r in long if r[2] >= 10), len(long))}, "
      f"caught short (< 10 yd) {pct(sum(1 for r in long if r[1] < 10), len(long))} | completions caught 15+ downfield per attempt {pct(sum(1 for r in rows if r[1] >= 15), att)}")
