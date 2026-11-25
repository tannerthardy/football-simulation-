"""Route combinations on the open census, NFL against ours (Rules, 2026-11-24; for the QB gates and the concept inventory).
Count route combinations per side (receivers ordered outside-in at the snap) on the open census, NFL vs ours.
Non-PA dropbacks. Planted routes get their break depth from route_chart's rule (full track to rel+1.5)."""
import sys, gzip, json, collections
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from route_chart import SIM, analyse
OL = {'T','G','C','OT','OG'}; BACKS = {'RB','FB','HB'}
SIMX = dict(SIM, bubble='SCREEN', now_screen='SCREEN', tunnel='SCREEN', te_screen='SCREEN', slip_screen='SCREEN', checkdown='FLAT')
def plays(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('qb') is None: continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); pl = p['players']; qb = p['qb']
        rel = p.get('rel'); cut = min((rel + 15) if rel is not None else 45, X.shape[1]-1)
        ball = Y[qb, 0]; runners = []
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == qb or r.get('pos') in OL or r.get('pos') == 'QB': continue
            if nfl: lab = r.get('routeRan') if r.get('route') else None
            else:
                rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = SIMX.get(rid) if rid else None
            if not lab or lab == 'NA': continue
            d = None
            if lab in ('HITCH','OUT','IN','SLANT','POST','CORNER'):
                res = analyse(dict(src='x', lab=lab, rid=lab, pos=r.get('pos'), x=X[i,:cut+1], y=Y[i,:cut+1], out=1.0, tgt=False, rel=None, catch=None, Xf=X[i], Yf=Y[i], dx0=[]))
                d = res.get('depth')
                if d is None: d = float(X[i, :cut+1].max())
            runners.append(dict(lab=lab, pos=r.get('pos'), y=Y[i,0], back=r.get('pos') in BACKS and X[i,0] < -2.5, d=d, tgt=bool(r.get('target'))))
        yield p, ball, runners
def q(r, lab, lo=None, hi=None):
    return r['lab'] == lab and (lo is None or (r['d'] is not None and r['d'] >= lo)) and (hi is None or (r['d'] is not None and r['d'] < hi))
def combos(ball, runners):
    found = set()
    sides = {}
    for s in (1, -1):
        R = sorted([r for r in runners if not r['back'] and (r['y'] - ball) * s > 0], key=lambda r: -(r['y'] - ball) * s)
        B = [r for r in runners if r['back'] and (r['y'] - ball) * s >= 0]
        sides[s] = (R, B)
    allR = [r for r in runners if not r['back']]
    for s, (R, B) in sides.items():
        n1 = R[0] if len(R) > 0 else None; n2 = R[1] if len(R) > 1 else None; n3 = R[2] if len(R) > 2 else None
        labs = [r['lab'] for r in R]
        if n1 and n2:
            if q(n1,'SLANT') and q(n2,'FLAT'): found.add('slant-flat')
            if q(n1,'SLANT') and q(n2,'SLANT'): found.add('double slants')
            if q(n1,'SLANT') and q(n2,'SCREEN'): found.add('slant-bubble')
            if q(n1,'HITCH',None,7.5) and q(n2,'CORNER'): found.add('snag' if (n3 and q(n3,'FLAT')) else 'smash')
            if q(n1,'HITCH',7.5) and q(n2,'FLAT'): found.add('curl-flat')
            if q(n1,'OUT',None,7.5): found.add('quick out (#1)')
            if q(n1,'POST') and q(n2,'IN',8): found.add('mills (post-dig)')
            if q(n1,'POST') and q(n2,'CORNER'): found.add('scissors')
            if q(n1,'GO') and q(n2,'OUT',8) and n3 and q(n3,'FLAT'): found.add('flood (go/out/flat)')
            if q(n1,'IN',8) and q(n2,'GO'): found.add('dagger (seam/dig)')
            if q(n1,'IN',None,7.5) and q(n2,'IN',7.5): found.add('levels (in under dig)')
            if q(n1,'GO') and q(n2,'FLAT'): found.add('fade-flat')
        st = [r for r in R if q(r,'HITCH',None,7.5)]
        if st and any(r['lab']=='FLAT' for r in R+B) and len(R) >= 2: found.add('stick (hitch + flat)')
        if len(R) >= 2 and all(q(r,'HITCH',None,7.5) for r in R): found.add('all hitches (side)')
        if len(R) >= 3 and sum(q(r,'HITCH',None,7.5) for r in R) >= 2 and any(r['lab'] in ('FLAT','OUT') for r in R): found.add('spacing (trips: hitches + flat/out)')
        for b in B:
            if b['lab'] == 'ANGLE': found.add("back's angle / Texas")
    cr = [r for r in allR if r['lab'] == 'CROSS']
    if len(cr) >= 2: found.add('mesh / two crossers')
    if cr and any(q(r,'IN',8) for r in allR): found.add('drive (shallow + dig)')
    if cr and any(r['lab']=='POST' for r in allR): found.add('y-cross / yankee (cross + post)')
    if sum(r['lab'] == 'GO' for r in allR) >= 4: found.add('four verts')
    if any(r['lab'] == 'WHEEL' for r in runners): found.add('wheel')
    if all(r['lab'] in ('SLANT','FLAT','SCREEN','ANGLE') or (r['lab'] in ('HITCH','OUT','IN') and r['d'] is not None and r['d'] < 7.5) for r in allR) and allR: found.add('ALL-QUICK (every WR/TE route quick)')
    if any(r['lab']=='SCREEN' for r in runners): found.add('SCREEN on the play')
    return found
if __name__ == '__main__':
  for path in sys.argv[1:]:
      nfl = 'nfl' in path; C = collections.Counter(); n = 0; ex = collections.defaultdict(list)
      for p, ball, runners in plays(path, nfl):
          n += 1; f = combos(ball, runners)
          for k in f:
              C[k] += 1
              if len(ex[k]) < 3: ex[k].append(p.get('id'))
      print(f"== {'NFL' if nfl else 'ours'} non-PA dropbacks {n}")
      for k, v in C.most_common(): print(f"  {k:38} {100*v/n:5.1f}%  ({v})  e.g. {ex[k]}")
