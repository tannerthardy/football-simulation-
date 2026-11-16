# Alignment over an attached end at the snap, NFL tracking vs sim exports, one operator (#35 item 2; Integration: is the
# collision angle alignment?). Common format (offense +x, line at x = 0). Attached end as attached-release.py (a TE <= 1.5
# yd off the line, 0.5-2.5 yd outside the last lineman), every pass play (on a route or not). His man: the defender (DL or
# LB) at the snap 0-3 yd ahead of him whose lateral offset from him (+ = outside the end) is the outermost within -1.5 ..
# +3.5 yd, i.e. the man on the edge of the attached side. Reported: that man's offset and depth (p10/25/50/75/90), the
# share with nobody there, his group (DL / LB), and the same split by the defense's front where the export has one (sim
# rows carry 'front' in cell when present; NFL rows by the number of DL at the snap: 3, 4, 5+).
# usage: python3 scripts/diag/pass-operators/attached-align.py <plays.jsonl.gz> ...
import sys, os, json, gzip, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r)
        if r.get('kind') != 'pass' or not r.get('xy'): continue
        p = Play(r)
        OL = [i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [p.pos(i, 0)[1] for i in OL]
        D = [i for i in p.who('D') if r['players'][i]['group'] in ('DL', 'LB') and p.pos(i, 0)[0] is not None]
        ndl = sum(1 for i in D if r['players'][i]['group'] == 'DL')
        for i in p.who('O', 'TE'):
            x0, y0 = p.pos(i, 0)
            if x0 is None or x0 < -1.5: continue
            out = 1 if y0 > (min(ys) + max(ys)) / 2 else -1
            w = (y0 - (max(ys) if out > 0 else min(ys))) * out
            if not (0.5 <= w <= 2.5): continue
            C = [(d, (p.pos(d, 0)[1] - y0) * out, p.pos(d, 0)[0] - x0) for d in D]
            C = [c for c in C if 0 <= c[2] <= 3 and -1.5 <= c[1] <= 3.5]
            man = max(C, key=lambda c: c[1]) if C else None
            rows.append({'off': man[1] if man else None, 'depth': man[2] if man else None, 'grp': r['players'][man[0]]['group'] if man else None,
                         'front': (r.get('cell') or {}).get('front') or f'{min(ndl, 5)}DL'})
    def line(lab, S):
        M = [x for x in S if x['off'] is not None]
        if not S: return f'  {lab}: none'
        g = collections.Counter(x['grp'] for x in M)
        return (f"  {lab} n {len(S)}: nobody {100*(len(S)-len(M))/len(S):.0f}% | outside the end p10/25/50/75/90 " + '/'.join(f"{q([x['off'] for x in M], f):.2f}" for f in (.1, .25, .5, .75, .9))
                + f" yd | depth p25/50/75 " + '/'.join(f"{q([x['depth'] for x in M], f):.2f}" for f in (.25, .5, .75)) + f" | DL {100*g['DL']/max(1,len(M)):.0f}% LB {100*g['LB']/max(1,len(M)):.0f}%")
    print(f'{os.path.basename(path)}: attached ends on pass plays {len(rows)}')
    print(line('all', rows))
    for fr, n in collections.Counter(x['front'] for x in rows).most_common(6):
        if n >= 20: print(line(f'front {fr}', [x for x in rows if x['front'] == fr]))
