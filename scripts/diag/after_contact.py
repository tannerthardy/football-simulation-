#!/usr/bin/env python3
"""What first contact does to a run carrier, NFL vs run-only sim, one operator.
    python3 -I scripts/diag/after_contact.py <nfl.jsonl.gz> <trace.json>...
At the first carrier contact tc (NFL event first_contact; sim carrier_contact/tackle_wrap):
entry speed, speed and gain 0.5 s later, yards from contact to the end, time to the end."""
import math, statistics as st, sys
sys.path.insert(0, "scripts/mechanics")
import run_film_reference as R
def med(v):
    v = [x for x in v if x is not None]; return f"{st.median(v):5.2f}" if v else "    -"
def mean(v):
    v = [x for x in v if x is not None]; return f"{sum(v)/len(v):5.2f}" if v else "    -"
out = {}
for play in list(R.nfl(sys.argv[1])) + list(R.sim(sys.argv[2:])):
    xy, c, n, tc = play["xy"], play["carrier"], len(play["xy"]), play["contact"]
    if tc is None: continue
    k = int(round(tc / .1)); ke = min(n - 1, int(round(play["end"] / .1)))
    if k < 1 or k + 1 >= n: continue
    sp = lambda f: math.hypot(xy[min(n-1,f+1)][c][0]-xy[f-1][c][0], xy[min(n-1,f+1)][c][1]-xy[f-1][c][1]) / .2
    vx = lambda f: (xy[min(n-1,f+1)][c][0]-xy[f-1][c][0]) / .2
    entry, x0 = sp(k), xy[k][c][0]
    k5 = k + 5
    row = dict(entry=entry, entry_vx=vx(k), behind=x0 < 0, after=xy[ke][c][0] - x0, dur=(ke - k) * .1,
               sp5=sp(k5) if k5 + 1 < n and k5 <= ke else None, gain5=(xy[k5][c][0] - x0) if k5 <= ke else xy[ke][c][0] - x0)
    out.setdefault(play["src"], []).append(row)
print(f"{'src':4s} {'n':>5s} entry entry-vx  speed+0.5s  gain+0.5s  after(med) after(mean)  contact->end  behind-LOS")
for src in ("nfl", "sim"):
    r = out[src]
    print(f"{src:4s} {len(r):5d} {med([x['entry'] for x in r])} {med([x['entry_vx'] for x in r])}     {med([x['sp5'] for x in r])}      {med([x['gain5'] for x in r])}      {med([x['after'] for x in r])}      {mean([x['after'] for x in r])}       {med([x['dur'] for x in r])}       {mean([x['behind'] for x in r])}")
print("by entry downfield speed (yd/s): after-contact yards median / mean, n")
for lo, hi in ((-9, 1), (1, 3), (3, 5), (5, 99)):
    line = f"  vx {lo:>3}..{hi:<3}"
    for src in ("nfl", "sim"):
        r = [x for x in out[src] if lo <= x['entry_vx'] < hi]
        line += f"  {src}: {med([x['after'] for x in r])} / {mean([x['after'] for x in r])} (n {len(r):4d})"
    print(line)
def q(v, p): v = sorted(v); return round(v[int(p * (len(v) - 1))], 2)
for src in ("nfl", "sim"):
    r = out[src]; a = [x['after'] for x in r]; d = [x['dur'] for x in r]
    print(f"{src}: live@0.8 {sum(x > .8 for x in d)/len(d):.2f} live@1.0 {sum(x > 1.0 for x in d)/len(d):.2f} after p25/50/75/90 {q(a,.25)}/{q(a,.5)}/{q(a,.75)}/{q(a,.9)} share>=10 {sum(x >= 10 for x in a)/len(a):.3f}")
