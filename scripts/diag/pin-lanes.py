# Per-lane lists from a pin-bisect result: which test files still need which promoted flags pinned to 0, by the lane that owns what the file exercises.
#   python3 -I scripts/diag/pin-lanes.py BY_FILE.json OUT.md [extra pending file names ...]
# Lane = the owner of the source a test imports (first matching rule, most specific first), else of the flags it needs (docs/FLAGS.md 'files' column), else 'Integration'.
import json, re, sys, collections as C, os
byfile = json.load(open(sys.argv[1])); out = sys.argv[2]; pending = sys.argv[3:]
RULES = [  # (path regex, lane)
  (r'src/sim/behaviors/(blocking|block-|engagement|pass-set|rep-)|src/sim/(engagement|assign|climb|pass-rush|pocket)', 'Flex'),
  (r'src/sim/(behaviors/qb|qbmind|qb-|throw|read-|release-|ball-estimate)|src/playbook/read-compiler', 'QB'),
  (r'src/sim/(behaviors/defense|tackle|pursuit|shed|run-fits|gap|coverage/(pursuit|tackle))', 'Defense'),
  (r'src/sim/coverage/|src/sim/(zone-|man-|cover-|called-)', 'Coverage'),
  (r'src/sim/(behaviors/carrier|run-|carrier|counter|ball-carrier)', 'Run Game'),
  (r'src/sim/(behaviors/receiver|route-|receiver-|catch|release-seen)', 'Rules+Coaching'),
]
WEAK = [(r'src/physics/', 'Flex'), (r'src/playbook/', 'Rules+Coaching')]   # a test that only builds a concept is about the play call, not the mechanism: used last
def lane_of_src(p):
    for rx, lane in RULES:
        if re.search(rx, p): return lane
def imports(f):
    try: s = open(f).read()
    except OSError: return []
    return re.findall(r"from '\.\./(src/[^']+?)(?:\.js)?'", s)
flagfiles = {}
if os.path.exists('docs/FLAGS.md'):
    for l in open('docs/FLAGS.md'):
        m = re.match(r"\| `([A-Z0-9_]+)` \|", l)
        if m: flagfiles[m.group(1)] = ' '.join(re.findall(r'`(src/[^`:]+)', l))
# Files no import or flag places (read by name and by what the flags are): proposed owners, Integration to reassign.
OVERRIDE = {'test/db-slots.test.ts': 'Coverage', 'test/quarters-trips-rules.test.ts': 'Coverage', 'test/directional-brace.test.ts': 'Flex', 'test/open-hands.test.ts': 'Flex',
            'test/draw-read.test.ts': 'Run Game', 'test/long-yardage-run.test.ts': 'Run Game', 'test/short-package.test.ts': 'Defense', 'test/schematic-stress.test.ts': 'Integration'}
lanes = C.defaultdict(list); how = {}
for f, r in sorted(byfile.items()):
    votes = C.Counter()
    for p in imports(f):
        l = lane_of_src(p)
        if l: votes[l] += 1
    why = 'imports'
    if not votes:
        for fl in r['pinned']:
            for p in flagfiles.get(fl, '').split():
                l = lane_of_src(p)
                if l: votes[l] += 1
        why = 'flags'
    if not votes:
        l = lane_of_src('src/sim/' + os.path.basename(f).replace('.test.ts', '')) 
        if l: votes[l] += 1; why = 'name'
    if not votes:
        for p in imports(f):
            for rx, l in WEAK:
                if re.search(rx, p): votes[l] += 1; why = 'playbook'
    lane = votes.most_common(1)[0][0] if votes else 'Integration'
    if not votes: why = 'unassigned'
    if f in OVERRIDE: lane, why = OVERRIDE[f], 'by name'
    lanes[lane].append((f, r['pinned'], r['probes'], why)); how[f] = why
lines = ['# Pin bisect: which tests still need the legacy engine, by lane', '',
         f'{len(byfile)} files bisected ({len(pending)} pending: {", ".join(pending) or "none"}). For each: the minimal set of promoted flags that, pinned to 0 alone, makes the file pass (`TEST_PIN_FLAGS=A,B`). '
         'Re-record the file on the real engine and the flags leave its list; when a flag has no file left, it can be deleted from the pin.', '']
for lane in sorted(lanes):
    lines += [f'## {lane} ({len(lanes[lane])} files)', '']
    for f, flags, probes, why in lanes[lane]:
        lines.append(f'- `{f}` ← {", ".join(flags) or "(nothing)"}  _({why})_')
    lines.append('')
byflag = C.defaultdict(list)
for f, r in byfile.items():
    for x in r['pinned']: byflag[x].append(f)
lines += ['## By flag (files blocking its deletion)', '']
for fl, fs in sorted(byflag.items(), key=lambda kv: -len(kv[1])): lines.append(f'- `{fl}` ({len(fs)}): ' + ', '.join(os.path.basename(x).replace('.test.ts', '') for x in sorted(fs)))
open(out, 'w').write('\n'.join(lines) + '\n')
print({k: len(v) for k, v in lanes.items()}, 'unassigned by rules:', sum(1 for v in how.values() if v == 'unassigned'))
