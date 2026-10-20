"""How do 40+ runs escape? (sim open-field traces). Per 40+ run, from the
approach/encounter records: the closest any defender got (min distance), how
many defenders came within 1.5 yd, whether any tackle attempt was made, and
how attempts ended (events: missed/broken tackles). Categories:
  nobody near       no defender within 1.5 yd after the handoff
  near, no attempt  someone within 1.5 yd but no attempt
  attempt failed    at least one attempt, all failed
Also the defenders who came closest, by slot group, with their speed (ds),
the carrier's speed (cs), whether they were ahead (+) or behind, closing
speed, and whether engaged (eng) at the moment of closest approach.
usage: tailwhy.py LABEL [LABEL ...]  (out/open-field/all/LABEL.jsonl.gz)"""
import gzip, json, sys, collections
q = lambda v, f=.5: sorted(v)[min(len(v) - 1, int(f * len(v)))] if v else float('nan')
grp = lambda s: 'DL' if s.startswith(('DE', 'DT', 'NT')) else 'LB' if s.startswith('LB') else 'DB'
for label in sys.argv[1:]:
    rows = [r for r in map(json.loads, gzip.open(f'out/open-field/all/{label}.jsonl.gz', 'rt')) if 'error' not in r]
    long = [r for r in rows if r['gain'] >= 40]
    cats = collections.Counter(); closest = collections.Counter(); stats = collections.defaultdict(list); evs = collections.Counter()
    for r in long:
        ap = r.get('approach') or []
        near = [a for a in ap if a['min'] <= 1.5]
        att = sum(a.get('attempts', 0) for a in ap)
        for e in r.get('events') or []: evs[e['type']] += 1
        cats['attempt failed' if att else 'near, no attempt' if near else 'nobody near'] += 1
        if ap:
            b = min(ap, key=lambda a: a['min'])
            g = grp(b['d']); closest[g] += 1
            for k in ('min', 'ds', 'cs', 'ahead', 'closing'): stats[(g, k)].append(b[k])
            stats[(g, 'eng')].append(1 if b.get('eng') else 0)
    n = len(long)
    print(f"== {label}: {len(rows)} runs, 40+ {n} ({100 * n / max(1, len(rows)):.1f}%)")
    print('  ' + ', '.join(f"{k} {v} ({100 * v / max(1, n):.0f}%)" for k, v in cats.most_common()))
    print('  events on 40+ runs: ' + ', '.join(f"{k} {v}" for k, v in evs.most_common(6)))
    for g, c in closest.most_common():
        s = lambda k: q(stats[(g, k)])
        print(f"  closest defender {g}: {c} runs | min {s('min'):.2f} yd, his speed {s('ds'):.1f}, carrier {s('cs'):.1f}, ahead {s('ahead'):+.2f}, closing {s('closing'):+.1f}, engaged {100 * sum(stats[(g, 'eng')]) / len(stats[(g, 'eng')]):.0f}%")
