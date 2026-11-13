"""Safeties and the deep catch (same code on NFL and sim common-format plays). Observation only.
Drop-backs: kind 'pass', not play-action (as ypd_split.py). Shell: the coverage call (cover 0 / 1 / 2 / 2-man / 3 / 4 /
6 / other). Safeties: defenders 9+ yd past the line at the snap (pa_levels' definition).
 A. Per shell: safeties' depth at the snap, at 1.0 s and at the throw (pass_forward; sacks/scrambles excluded); downhill
    in the first second = his shallowest depth over 0-1.0 s at least 0.3 yd (and 1.0 yd) shallower than at the snap.
 B. Zone completions caught 10-20 and 20+ yd past the line, per shell: at the catch, how many defenders are deeper than
    the catcher; the nearest of them (distance, how much deeper, his closing speed on the catcher); the nearest defender
    of any depth; whether a safety who came downhill in the first second is now at or under the catch point; YAC.
usage: python3 -I scripts/diag/pass-operators/safety_deep.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, re, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa


def shell(label):
    t = re.sub(r'[^a-z0-9]', '', (label or '').lower())
    if '2man' in t or 'twoman' in t: return 'cover2-man'
    for k, v in (('cover0', 'cover0'), ('cover1', 'cover1'), ('cover2', 'cover2'), ('tampa', 'cover2'), ('cover3', 'cover3'),
                 ('quarters', 'cover4'), ('cover4', 'cover4'), ('cover6', 'cover6')):
        if k in t: return v
    return 'other'


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else f'{v[int(f * (len(v) - 1))]:.1f}'


def pct(n, d): return f'{100 * n / d:.0f}%' if d else '-'


SH = ('cover0', 'cover1', 'cover2-man', 'cover2', 'cover3', 'cover4', 'cover6', 'other')
if __name__ == '__main__':
  for arg in sys.argv[1:]:
      name, paths = arg.split('=')
      A = C.defaultdict(list); B = C.defaultdict(list)
      for path in paths.split(','):
          for line in gzip.open(path, 'rt'):
              r = json.loads(line); r = r.get('common', r)
              if r['kind'] != 'pass': continue
              concept = str((r.get('cell') or {}).get('concept') or 'NA')
              if (r.get('source') == 'sim' and concept.startswith('pa_')) or (r.get('source') != 'sim' and concept not in ('NA', 'UNDEFINED')): continue
              ev = r['events']
              if 'pass_forward' not in ev: continue
              p = Play(r); sh = shell((r.get('cell') or {}).get('coverage')); kt = p.k(ev['pass_forward']); k1 = p.k(1.0)
              saf = {}
              for d in p.who('D'):
                  x0 = p.pos(d, 0)[0]
                  if x0 is None or x0 < 9: continue
                  xs = [p.pos(d, k)[0] for k in range(0, k1 + 1) if p.pos(d, k)[0] is not None]
                  bite = x0 - min(xs) if xs else 0
                  saf[d] = bite
                  A[sh].append(dict(snap=x0, at1=p.pos(d, k1)[0], thr=p.pos(d, kt)[0], bite=bite))
              t = r.get('target')
              if 'catch' not in ev or t is None or coverage_family((r.get('cell') or {}).get('coverage')) != 'zone': continue
              car = r.get('carrier')
              if car is not None and p.players[car]['side'] == 'D': continue
              kc = p.k(ev['catch']); cx, cy = p.pos(t, kc)
              if cx is None or cx < 10: continue
              band = '10-20' if cx < 20 else '20+'
              Ds = [d for d in p.who('D') if p.pos(d, kc)[0] is not None]
              deeper = [d for d in Ds if p.pos(d, kc)[0] > cx]
              def dist(d): return math.hypot(p.pos(d, kc)[0] - cx, p.pos(d, kc)[1] - cy)
              def closing(d):
                  a, b = kc - 1, min(kc + 1, p.frames - 1)
                  (x0, y0), (x1, y1), (tx0, ty0), (tx1, ty1) = p.pos(d, a), p.pos(d, b), p.pos(t, a), p.pos(t, b)
                  if None in (x0, x1, tx0, tx1): return None
                  return -(math.hypot(x1 - tx1, y1 - ty1) - math.hypot(x0 - tx0, y0 - ty0)) / ((b - a) * p.dt)
              nd = min(deeper, key=dist) if deeper else None
              na = min(Ds, key=dist) if Ds else None
              bit = [d for d, b in saf.items() if b >= 0.3]
              under = any(p.pos(d, kc)[0] is not None and p.pos(d, kc)[0] <= cx + 1 for d in bit)
              y = r.get('yards') or 0
              # After the catch: his speed at the catch; time to the first defender within 1.0 yd; yards gained after it.
              ke = min(p.k(ev['end']), p.frames - 1); kfc = None
              for k in range(kc, ke + 1):
                  tx, ty = p.pos(t, k)
                  if tx is None: continue
                  if any(p.pos(d, k)[0] is not None and math.hypot(p.pos(d, k)[0] - tx, p.pos(d, k)[1] - ty) <= 1.0 for d in p.who('D')): kfc = k; break
              xfc = p.pos(t, kfc)[0] if kfc is not None else None
              B[(sh, band)].append(dict(ndeep=len(deeper), dd=dist(nd) if nd is not None else None, ddep=(p.pos(nd, kc)[0] - cx) if nd is not None else None,
                                        dclose=closing(nd) if nd is not None else None, da=dist(na) if na is not None else None,
                                        under=under, anybite=bool(bit), yac=y - cx, rs=p.speed(t, kc),
                                        tfc=(kfc - kc) * p.dt if kfc is not None else None, pre=(xfc - cx) if xfc is not None else None, post=(y - xfc) if xfc is not None else None))
      print(f'== {name}')
      print('  A. safeties (9+ yd at the snap) on thrown non-PA drop-backs: depth at the snap / 1.0 s / throw (p50); downhill >= 0.3 / >= 1.0 yd in the first second')
      for sh in SH:
          v = A.get(sh, [])
          if not v: continue
          print(f'     {sh:<10} n {len(v):5d} | {q([o["snap"] for o in v])} / {q([o["at1"] for o in v])} / {q([o["thr"] for o in v])} yd | downhill {pct(sum(o["bite"] >= .3 for o in v), len(v))} / {pct(sum(o["bite"] >= 1 for o in v), len(v))}')
      v = [o for s in A.values() for o in s]
      print(f'     {"all":<10} n {len(v):5d} | {q([o["snap"] for o in v])} / {q([o["at1"] for o in v])} / {q([o["thr"] for o in v])} yd | downhill {pct(sum(o["bite"] >= .3 for o in v), len(v))} / {pct(sum(o["bite"] >= 1 for o in v), len(v))}')
      print('  B. zone completions by catch depth: defenders deeper than the catcher (0 / 1 / 2+); nearest deeper one: distance, how much deeper, closing (p50); nearest defender of any depth (p50); a safety who came downhill now at or under the catch; YAC mean / p50')
      for band in ('10-20', '20+'):
          for sh in SH + ('all',):
              v = [o for (s, b), L in B.items() if b == band and (sh == 'all' or s == sh) for o in L]
              if not v or (sh != 'all' and len(v) < 5): continue
              print(f'     {band:<5} {sh:<10} n {len(v):4d} | deeper 0 {pct(sum(o["ndeep"] == 0 for o in v), len(v))} / 1 {pct(sum(o["ndeep"] == 1 for o in v), len(v))} / 2+ {pct(sum(o["ndeep"] >= 2 for o in v), len(v))}'
                    f' | nearest deeper {q([o["dd"] for o in v])} yd, +{q([o["ddep"] for o in v])} deep, closing {q([o["dclose"] for o in v])} | nearest any {q([o["da"] for o in v])} yd'
                    f' | downhill safety at/under the catch {pct(sum(o["under"] for o in v), len(v))} (any downhill {pct(sum(o["anybite"] for o in v), len(v))}) | YAC {sum(o["yac"] for o in v) / len(v):.1f} / {q([o["yac"] for o in v])}')
              print(f'           after the catch: his speed {q([o["rs"] for o in v])} yd/s | first defender within 1 yd after {q([o["tfc"] for o in v])} s (none {pct(sum(o["tfc"] is None for o in v), len(v))}) | YAC with contact {(lambda w: f"{sum(w) / len(w):.1f}" if w else "-")([o["yac"] for o in v if o["tfc"] is not None])}, never contacted {(lambda w: f"{sum(w) / len(w):.1f}" if w else "-")([o["yac"] for o in v if o["tfc"] is None])} | yards before it {q([o["pre"] for o in v])}, after it mean {(lambda w: f"{sum(w) / len(w):.1f}" if w else "-")([o["post"] for o in v if o["post"] is not None])} / p50 {q([o["post"] for o in v])}')
