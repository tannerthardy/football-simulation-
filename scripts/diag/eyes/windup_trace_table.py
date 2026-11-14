"""Summarise scripts/diag/eyes/windup-trace.ts rows: contact (a defender's centre within 1.0 yd, ball in hand), what he
did after it, and what started the throws that came after contact.
   python3 -I scripts/diag/eyes/windup_trace_table.py off=rows-off.jsonl on=rows-on.jsonl"""
import json, sys
def q(v, p=.5):
    v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    name, path = arg.split('=', 1); R = [json.loads(l) for l in open(path)]; n = len(R)
    C = [r for r in R if r['contactAt'] is not None]; thr = [r for r in C if r['thrown'] is not None]
    pc = lambda a, b: f"{100 * a / max(1, b):.0f}%"
    print(f"== {name}: dropbacks {n}; alarmed {100 * sum(r['alarmAt'] is not None for r in R) / n:.1f}%; a defender within 2 yd {100 * sum(r['c2At'] is not None for r in R) / n:.1f}%, within 1 yd (contact) {100 * len(C) / n:.1f}%; sacked {100 * sum(r['sacked'] for r in R) / n:.1f}%")
    print(f"   after contact (n {len(C)}): threw {pc(len(thr), len(C))} sacked {pc(sum(r['sacked'] for r in C), len(C))} scramble {pc(sum(r['scramble'] for r in C), len(C))}")
    W = []
    for r in thr:
        if r['windups']: w = r['windups'][-1]; W.append((r['thrown'] - r['contactAt'], w['t'] < r['contactAt'], r['contactAt'] - w['t'], w['hot'], w['feltTime'], w['trueNear'], w['u'], w['clearsNormal']))
    if W:
        print(f"   post-contact throws (n {len(W)}): released {q([w[0] for w in W]):.2f} s after contact; windup already under way {pc(sum(w[1] for w in W), len(W))}, started {q([w[2] for w in W if w[1]]):.2f} s before it; hot {pc(sum(w[3] for w in W), len(W))}; cleared his normal bar {pc(sum(bool(w[7]) for w in W), len(W))}")
        print(f"   at that windup's start: nearest defender truly {q([w[5] for w in W], .25):.1f}/{q([w[5] for w in W]):.1f}/{q([w[5] for w in W], .75):.1f} yd; his felt time to contact {q([w[4] for w in W], .25):.2f}/{q([w[4] for w in W]):.2f}/{q([w[4] for w in W], .75):.2f} s")
    A = [r['windups'][-1] for r in R if r['thrown'] is not None and r['windups']]
    print(f"   all throws (n {len(A)}): felt time at the windup's start p10/25/50 {q([w['feltTime'] for w in A], .1):.2f}/{q([w['feltTime'] for w in A], .25):.2f}/{q([w['feltTime'] for w in A]):.2f}; true nearest p10/25/50 {q([w['trueNear'] for w in A], .1):.1f}/{q([w['trueNear'] for w in A], .25):.1f}/{q([w['trueNear'] for w in A]):.1f} yd")
