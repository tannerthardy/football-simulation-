"""Tackle forms on one index (Integration, 2026-11-10; docs/reviews/2026-11-10-tackle-forms.md). Same code on NFL records
(out/mechanics/nfl-plays.jsonl.gz) and the sim's run-frames.mts / pass-frames.mts records; 0.1 s frames from the snap,
x from the line with the offense attacking +x. Index (shared with Defense's yards.py / backfield.py): first contact =
the first frame after the carrier phase starts (handoff, else the snap, on runs; the catch on passes) with any defender's
centre within 1.0 yd of the carrier's (geometric, identical code on both sides). Option "event" uses the record's
events.first_contact instead (NFL: BDB first_contact; sim: the engine's carrier_contact). End = events.end (sim: the
dead ball). The primary tackler = the defender nearest the carrier at first contact. Distributions, by the primary tackler's approach at contact (his bearing from the
carrier against the carrier's travel: front <= 45 deg, behind >= 135, else side):
  share; his speed at contact; defenders within 1 yd of the carrier at the end (solo vs gang); contact -> end (s);
  yards after contact (x gain); the runner's end direction (his motion over the last 0.3 s before the end against his
  travel at contact: forward / sideways / backward / stopped under 0.5 yd/s); defenders still (under 0.5 yd/s over the last
  0.3 s) within 1.5 yd of him at the end (tacklers left on the ground or piled).
usage: python3 -I tackle-forms.py <records> [kind: run|pass|all, default run] [contact: geometric|event, default geometric]"""
import sys, os, json, gzip, math, statistics as st, collections as C
path = sys.argv[1]; kind = sys.argv[2] if len(sys.argv) > 2 else 'run'; mode = sys.argv[3] if len(sys.argv) > 3 else 'geometric'
op = gzip.open if path.endswith('.gz') else open
R = C.defaultdict(list); n = 0
def pc(a, q):
    return sorted(a)[int(q * (len(a) - 1))] if a else float('nan')
for l in op(path, 'rt'):
    p = json.loads(l)
    if kind != 'all' and p.get('kind') != kind:
        continue
    ev, X, c = p.get('events', {}), p['xy'], p.get('carrier')
    if c is None or 'end' not in ev:
        continue
    fe = min(len(X) - 1, int(round(ev['end'] / 0.1)))
    D0 = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
    if mode == 'event':
        if 'first_contact' not in ev:
            continue
        f0 = int(round(ev['first_contact'] / 0.1))
    else:
        start = ev.get('catch', ev.get('handoff', 0.0)) or 0.0
        fs = int(round(start / 0.1))
        f0 = next((f for f in range(fs + 1, fe + 1) if any(math.dist((X[f][2 * i], X[f][2 * i + 1]), (X[f][2 * c], X[f][2 * c + 1])) <= 1.0 for i in D0)), None)
        if f0 is None:
            continue
    if f0 < 2 or fe - f0 < 1 or fe >= len(X):
        continue
    D = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
    P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1])
    vel = lambda i, f: ((X[min(f + 1, len(X) - 1)][2 * i] - X[max(f - 1, 0)][2 * i]) / 0.2, (X[min(f + 1, len(X) - 1)][2 * i + 1] - X[max(f - 1, 0)][2 * i + 1]) / 0.2)
    d = min(D, key=lambda i: math.dist(P(i, f0), P(c, f0)))
    cv = vel(c, f0); cs = math.hypot(*cv)
    if cs < 1.0:
        continue
    n += 1
    bx, by = P(d, f0)[0] - P(c, f0)[0], P(d, f0)[1] - P(c, f0)[1]; bn = math.hypot(bx, by) or 1
    cos = (cv[0] * bx + cv[1] * by) / (cs * bn)
    a = 'front' if cos >= math.cos(math.radians(45)) else 'behind' if cos <= math.cos(math.radians(135)) else 'side'
    R['approach'].append(a)
    R[a + '|dspeed'].append(math.hypot(*vel(d, f0)))
    R[a + '|n1'].append(sum(1 for i in D if math.dist(P(i, fe), P(c, fe)) <= 1.0))
    R[a + '|t'].append((fe - f0) * 0.1)
    R[a + '|yac'].append(P(c, fe)[0] - P(c, f0)[0])
    g = max(f0, fe - 3); mv = (P(c, fe)[0] - P(c, g)[0], P(c, fe)[1] - P(c, g)[1]); ms = math.hypot(*mv) / max(0.1, (fe - g) * 0.1)
    if ms < 0.5:
        R[a + '|dir'].append('stopped')
    else:
        cc = (mv[0] * cv[0] + mv[1] * cv[1]) / (math.hypot(*mv) * cs)
        R[a + '|dir'].append('forward' if cc > 0.5 else 'backward' if cc < -0.5 else 'sideways')
    R[a + '|still'].append(sum(1 for i in D if math.dist(P(i, fe), P(c, fe)) <= 1.5 and math.dist(P(i, g), P(i, fe)) / max(0.1, (fe - g) * 0.1) < 0.5))
print(f"== {os.path.basename(path)} [{kind}, {mode} first contact]: {n} carries with a first contact (carrier moving >= 1 yd/s)")
cnt = C.Counter(R['approach'])
for a in ('front', 'side', 'behind'):
    k = cnt[a]
    if not k:
        continue
    dirs = C.Counter(R[a + '|dir']); n1 = C.Counter(min(x, 3) for x in R[a + '|n1'])
    print(f"   {a:6s} {k / n:4.0%} | tackler speed p50 {pc(R[a + '|dspeed'], .5):.2f} | contact->end p25/p50/p75 {pc(R[a + '|t'], .25):.1f} {pc(R[a + '|t'], .5):.1f} {pc(R[a + '|t'], .75):.1f} s"
          f" | yards after contact p25/p50/p75 {pc(R[a + '|yac'], .25):.2f} {pc(R[a + '|yac'], .5):.2f} {pc(R[a + '|yac'], .75):.2f}"
          f" | defenders within 1 yd at end 0/1/2/3+ " + '/'.join(f"{n1[j] / k:.0%}" for j in range(4))
          + f" | end direction " + ' '.join(f"{x} {dirs[x] / k:.0%}" for x in ('forward', 'sideways', 'backward', 'stopped'))
          + f" | still defenders within 1.5 yd p50 {pc(R[a + '|still'], .5):.0f} (>=1: {sum(1 for x in R[a + '|still'] if x >= 1) / k:.0%})")
