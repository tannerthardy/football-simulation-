"""QB lane, 2026-11-14: is the crossing man as open as the NFL's? One operator on NFL tracking and sim exports.
Non-designed dropbacks. Route labels: NFL from player_play.csv routeRan (CROSS, IN); sim from the export's route id (the part after the family prefix)
(CROSS = cross, shallow, shallow_high, under; IN = dig, short_in). For each such route, the distance from the runner to
the nearest defender at 1.5 / 2.0 / 2.5 / 3.0 s, while the ball is still in the quarterback's hand, split by man and
zone coverage (NFL pff_manZone; sim the called coverage: cover0 / cover1 / man names are man). Separation from tracking
is a direct measurement; "open" is not claimed. Also how often the route is run at all and how often it is targeted.
usage: python3 -I crosser-sep.py --data <bdb2025 dir> name=a.jsonl.gz,... """
import sys, os, json, gzip, csv, math, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
args = sys.argv[1:]; i = args.index('--data'); D = args[i + 1]; del args[i:i + 2]
PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(f'{D}/plays.csv'))}
RR = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    if r['routeRan'] not in ('NA', ''): RR[(f"{r['gameId']}-{r['playId']}", r['nflId'])] = r['routeRan']
SIM = {'CROSS': {'cross', 'shallow', 'shallow_high', 'under'}, 'IN': {'dig', 'short_in'}}
def q(v, p=.5):
    v = sorted(v); return v[int(p * (len(v) - 1))] if v else float('nan')
DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen', re.I)
MARKS = (1.5, 2.0, 2.5, 3.0)
for arg in args:
    name, paths = arg.split('=', 1); n = 0; routes = 0; cnt = collections.Counter(); plays_with = collections.Counter(); tg = collections.Counter(); targets = 0
    S = collections.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') != 'pass' or not raw.get('xy'): continue
            pf = PFF.get(raw['id'])
            if pf is not None and (pf['dropbackType'].startswith('DESIGNED') or pf['qbSpike'] == 'TRUE' or pf['isDropback'] != 'TRUE'): continue
            cov = str((raw.get('cell') or {}).get('coverage') or '')
            if raw.get('source') == 'sim' and DES.search(str((raw.get('cell') or {}).get('concept') or '')): continue
            p = Play(raw); n += 1; ev = raw['events']; fw = ev.get('pass_forward')
            kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
            mz = (pf['pff_manZone'] if pf is not None else ('Man' if re.search(r'cover0|cover1|man', cov, re.I) else 'Zone'))
            labs = {}
            for j, pl in enumerate(p.players):
                if pl['side'] != 'O': continue
                if pf is not None: lab = RR.get((raw['id'], str(pl.get('id'))))
                else:
                    rt = pl.get('route'); rid = rt.split(':')[-1] if rt else None; lab = next((k for k, v in SIM.items() if rid in v), ('OTHER' if rt else None))
                if lab: labs[j] = lab
            routes += len(labs); seen = set()
            t = raw.get('target')
            if fw is not None and t is not None and not (raw.get('labels') or {}).get('throwaway'):
                targets += 1
                if labs.get(t) in ('CROSS', 'IN'): tg[labs[t]] += 1
            Dd = [d for d in p.who('D')]
            for j, lab in labs.items():
                if lab not in ('CROSS', 'IN'): continue
                cnt[lab] += 1; seen.add(lab)
                for m in MARKS:
                    k = int(round(m / p.dt))
                    if k > kend: continue
                    x, y = p.pos(j, k)
                    if x is None: continue
                    v = [math.hypot(p.pos(d, k)[0] - x, p.pos(d, k)[1] - y) for d in Dd if p.pos(d, k)[0] is not None]
                    if v: S[(lab, mz, m)].append(min(v)); S[(lab, 'all', m)].append(min(v)); S[(lab, 'depth', m)].append(x)
            for lab in seen: plays_with[lab] += 1
    print(f"== {name}: dropbacks {n}; routes run {routes}")
    for lab in ('CROSS', 'IN'):
        print(f"   {lab}: {100 * cnt[lab] / max(1, routes):.1f}% of routes run; on {100 * plays_with[lab] / max(1, n):.0f}% of dropbacks; targeted on {100 * tg[lab] / max(1, targets):.1f}% of throws = {100 * tg[lab] / max(1, cnt[lab]):.0f}% of the times it is run")
        for mz in ('all', 'Man', 'Zone'):
            print(f"      nearest defender ({mz:4s}) " + '  '.join(f"{m:.1f} s: {q(S[(lab, mz, m)], .25):.1f}/{q(S[(lab, mz, m)]):.1f}/{q(S[(lab, mz, m)], .75):.1f} yd (n {len(S[(lab, mz, m)])})" for m in MARKS))
        print(f"      his depth past the line        " + '  '.join(f"{m:.1f} s: {q(S[(lab, 'depth', m)]):.1f} yd" for m in MARKS))
