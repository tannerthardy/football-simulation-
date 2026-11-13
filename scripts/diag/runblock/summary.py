"""One line per variant and seed: run outcomes, key mechanisms vs NFL, line
flow, stuff attribution, points and guard status.
python3 -I scripts/diag/runblock/summary.py LABEL [LABEL ...]  (reads out/rb/LABEL-*)"""
import gzip, json, re, subprocess, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def flow(path):
    out = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if fam not in ('outside_zone', 'inside_zone', 'gap_pull'): continue
        p = Play(raw)
        if p.frames < 16: continue
        ol = [i for i in p.who('O', 'OL') if p.pos(i, 15)[0] is not None]
        box = [i for i in p.box_defenders() if p.pos(i, 15)[0] is not None]
        if len(ol) < 5 or not box: continue
        o = out.setdefault(fam, ([], []))
        o[0].append(abs(sum(p.pos(i, 15)[1] - p.pos(i, 0)[1] for i in ol) / len(ol)))
        o[1].append(abs(sum(p.pos(i, 15)[1] - p.pos(i, 0)[1] for i in box) / len(box)))
    return {k: (q(v[0], .5), q(v[1], .5)) for k, v in out.items()}
nfl = json.load(open('data/reviews/mechanics/nfl-bdb2022.json'))['metrics']
def row(m, label, fl, extra=''):
    g = lambda k, f: m[k][f] if k in m else float('nan')
    print(f"{label:16} yds p25/50/90 {g('run.yards','p25'):5.2f}/{g('run.yards','p50'):4.2f}/{g('run.yards','p90'):5.2f} | YBC p25/50 {g('run.yards_before_contact','p25'):+.1f}/{g('run.yards_before_contact','p50'):+.1f} | YAC p50 {g('run.yards_after_contact','p50'):.2f} | DL@3s p50 {g('run.engaged_dl_driven_back_3s','p50'):+.1f} | OZ/IZ/gap OL flow {fl.get('outside_zone',(float('nan'),))[0]:.2f}/{fl.get('inside_zone',(float('nan'),))[0]:.2f}/{fl.get('gap_pull',(float('nan'),))[0]:.2f} DL {fl.get('outside_zone',(0,float('nan')))[1]:.2f}/{fl.get('inside_zone',(0,float('nan')))[1]:.2f}/{fl.get('gap_pull',(0,float('nan')))[1]:.2f}{extra}")
row(nfl, 'NFL 2022', flow('out/mechanics/nfl-plays.jsonl.gz'))
for label in sys.argv[1:]:
    for seed in (101, 202):
        m = json.load(open(f'out/rb/{label}-{seed}.json'))['metrics']
        att = json.load(open(f'out/rb/{label}-attrib-{seed}.json'))
        stuff = sum(r['yards'] <= 1 for r in att) / len(att)
        shed = sum(r['yards'] <= 1 and r.get('contact', {}).get('cls') == 'shed before contact' for r in att) / max(1, sum(r['yards'] <= 1 for r in att))
        big = sum(r['yards'] >= 10 for r in att) / len(att)
        scores = [int(x) for l in open(f'out/rb/{label}-{seed}.log') for m2 in re.findall(r': (\d+)-(\d+)$', l.strip()) for x in m2]
        pts = sum(scores) / max(1, len(scores))
        g = subprocess.run(['python3', '-I', 'scripts/mechanics/compare.py', '--sim', f'out/rb/{label}-{seed}.json', '--out', f'out/rb/report-{label}-{seed}.md', '--guard', 'data/reviews/mechanics/guard.json'], capture_output=True, text=True)
        row(m, f'{label}-{seed}', flow(f'out/rb/{label}-{seed}.jsonl.gz'), f" | stuff {stuff:.2f} (shed {shed:.2f}) 10+ {big:.2f} | pts {pts:.1f} | guard {'ok' if g.returncode == 0 else 'BROKEN'}")
