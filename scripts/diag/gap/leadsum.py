"""Summarize leadprobe.ts outputs (every play finished).
usage: python3 scripts/diag/gap/leadsum.py label=file.jsonl ...
Per cell: the lead's work (bkr: backer blocked before the cross; sw: man
switches per play; aba: plays with a return to a man he had left; dbT/dbB:
plays where a DB was his man / was engaged by him), where he is relative to
the kick (out c/u/x: plays whose corner / turn-up at the line / position at
the cross end outside the kicker, of those measured; bk: back outside the
kicker at the cross) and the back (lat: lead minus carrier at the cross, + =
lead outside, p50), and outcomes (gain p50/mean, losses, <=2, 10+). Then the
same split by kick geometry (log / kick-out / no contact), measured by the
probe from true positions at the kicker's first contact with his man (geo)
and by the settled relation .3 s later (geo3)."""
import json, sys, statistics as st

CELLS = [('all', None), ('power/i_pro/strong', ('power', 'i_pro_21', 'strong')), ('power/i_pro/weak', ('power', 'i_pro_21', 'weak')),
         ('counter/i_pro/strong', ('counter', 'i_pro_21', 'strong')), ('counter/i_pro/weak', ('counter', 'i_pro_21', 'weak')),
         ('counter/ace/strong', ('counter', 'ace_12', 'strong')), ('counter/ace/weak', ('counter', 'ace_12', 'weak')), ('counter', ('counter',))]
HEAD = (f"{'arm':5s} {'cell':20s} {'n':>4s} {'bkr':>4s} {'sw/p':>5s} {'aba':>4s} {'dbT':>4s} {'dbB':>4s} {'out c/u/x':>16s} {'bk':>4s}"
        f" {'lat':>6s} {'p50':>6s} {'mean':>6s} {'<0':>4s} {'<=2':>4s} {'10+':>4s}")


def med(xs):
    return st.median(xs) if xs else float('nan')


def line(label, name, rs):
    g = [r['gain'] for r in rs]
    lat = [r['leadAtCross'] for r in rs if r['leadAtCross'] is not None]
    sw = [r['switches'] for r in rs]
    out = lambda k: sum(1 for r in rs if r[k] is not None and r[k] > 0)
    has = lambda k: sum(1 for r in rs if r[k] is not None)
    ox = f"{out('cornerVsKick')}/{out('upVsKick')}/{out('leadVsKick')}:{has('leadVsKick')}"
    return (f"{label:5s} {name:20s} {len(rs):4d} {sum(r['backerBeforeCross'] for r in rs):4d} {sum(sw)/max(1,len(rs)):5.2f}"
            f" {sum(1 for r in rs if r['aba']):4d} {sum(r['dbTargeted'] for r in rs):4d} {sum(r['dbBlocked'] for r in rs):4d} {ox:>16s} {out('backVsKick'):4d}"
            f" {med(lat):6.2f} {med(g):6.2f} {st.mean(g) if g else float('nan'):6.2f} {sum(x < 0 for x in g):4d} {sum(x <= 2 for x in g):4d} {sum(x >= 10 for x in g):4d}")


print(HEAD)
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = [json.loads(l) for l in open(path) if l.strip()]
    cells = [c for c in (sys.argv and CELLS)]
    for name, key in CELLS:
        rs = rows if key is None else [r for r in rows if (r['concept'], r['formation'], r['dir'])[:len(key)] == key]
        if rs: print(line(label, name, rs))
    for field, tag in (('geo', ''), ('geo3', '.3s ')):
        for geo in ('log', 'out', 'none'):
            for name, key in (('power', ('power',)), ('counter', ('counter',))):
                rs = [r for r in rows if r[field] == geo and r['concept'] == key[0]]
                if rs: print(line(label, f'{tag}{geo}:{name}', rs))
    print(f"{label:5s} live at 8 s (the old probe's 0-yd plays): {sum(r['live8'] for r in rows)}/{len(rows)}; switches total {sum(r['switches'] for r in rows)}, A-B-A returns {sum(r['aba'] for r in rows)}")
    print()
