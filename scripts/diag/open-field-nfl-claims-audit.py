"""Saved aggregate/definition audit of open-field research; zero simulations/downloads.

python3 -I scripts/diag/open-field-nfl-claims-audit.py SOURCE_CHECKOUT OUTPUT.json
SOURCE_CHECKOUT must be the frozen 943f1d3 research tree. Synthetic recordings
below are counterexamples to measurement definitions, never NFL observations.
"""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

source = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
os.chdir(source)
research_head = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
if research_head != '943f1d33c181325d9ba839da4a7b195d60c658b7':
    raise ValueError('Use the explicitly reviewed 943f1d3 source checkout')
reference_path = source / 'data/reviews/mechanics/nfl-bdb2022.json'
reference = json.loads(reference_path.read_text())
selected = {k: reference['metrics'][k] for k in [
    'run.yards', 'run.yards_before_contact', 'run.yards@inside_zone',
    'run.yards@outside_zone', 'run.yards_before_contact@inside_zone',
    'run.yards_before_contact@outside_zone', 'contact.run.carrier_speed_at_contact',
    'contact.run.tackler_speed_at_contact', 'contact.run.broke_contact']}
assert selected['run.yards']['n'] == 5462
assert selected['run.yards']['mean'] == 4.447
assert selected['run.yards_before_contact']['n'] == 5262
assert selected['run.yards_before_contact']['p50'] == .6
assert selected['contact.run.carrier_speed_at_contact']['p50'] == 4.507
assert selected['contact.run.tackler_speed_at_contact']['p50'] == 2.85
assert selected['contact.run.broke_contact']['mean'] == .125

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, source / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

metrics = load_module('review_metrics', 'scripts/mechanics/metrics.py')
recording = {
    'id': 'SYNTHETIC-POST-WHISTLE-COUNTEREXAMPLE', 'source': 'synthetic',
    'kind': 'run', 'yards': 0, 'dt': .1, 'ball_y': 26,
    'players': [{'side':'O','group':'RB'}, {'side':'O','group':'OL'},
                {'side':'D','group':'LB'}, {'side':'D','group':'DB'}],
    'carrier': 0, 'events': {'end': 1.0},
    # Runner never crosses while live. Both post-whistle motion and static
    # dead-ball poses are retained, as an adapter can retain actual recordings.
    'xy': [[-1 if k < 20 else 4, 26, 3, 26, 3, 26, 12, 26] for k in range(41)]}
with tempfile.TemporaryDirectory(prefix='nfl-claims-') as scratch:
    packet = Path(scratch) / 'synthetic.jsonl.gz'
    with gzip.open(packet, 'wt') as handle:
        handle.write(json.dumps(recording) + '\n')
    counterexamples = {}
    for script in ['timing.py', 'lbpass.py']:
        result = subprocess.run([sys.executable, '-I', str(source/'scripts/diag/open-field'/script), str(packet)],
                                check=True, capture_output=True, text=True)
        counterexamples[script] = result.stdout.replace(str(packet), '<synthetic recording>')
    assert 't=3.0s' in counterexamples['timing.py']
    assert 'all  passes 1' in counterexamples['lbpass.py']

# Demonstrate centered entry speed's dependence on later samples. These two
# made-up paths have identical 10 yd/s motion through first_contact=1.0s.
speeds = []
for stops_after_contact in [False, True]:
    raw = {'id':'SYNTHETIC-CONTACT-WINDOW', 'source':'synthetic', 'kind':'run',
           'players':[{'side':'O','group':'RB'}, {'side':'D','group':'DL'}],
           'dt': .1, 'ball_y': 26, 'carrier': 0,
           'events': {'first_contact':1.,'end':2.}, 'yards':20,
           'xy': [[min(k,10) if stops_after_contact else k,26,10,26] for k in range(21)]}
    p = metrics.Play(raw)
    speeds.append(p.speed(0,p.k(1.)))
assert speeds == [10., 5.]

tracked_files = ['docs/reviews/open-field-tackling.md', 'docs/reviews/trench-deep-dive.md',
    'scripts/mechanics/nfl_bdb2025.py', 'scripts/mechanics/metrics.py',
    'scripts/diag/trench/timeline.py', 'scripts/diag/open-field/firsttackler.py',
    'scripts/diag/open-field/getoff.py', 'scripts/diag/open-field/lbpass.py',
    'scripts/diag/open-field/second.py', 'scripts/diag/open-field/timing.py',
    'scripts/diag/open-field/geometry.py', 'scripts/diag/open-field/trace.ts',
    'data/reviews/mechanics/nfl-bdb2022.json']
result = {
    'schema':'open-field-nfl-claims-audit-v1',
    'researchHead':research_head,
    'newSimulations':0, 'newNflQueries':0, 'newProviderDownloads':0,
    'aggregateVerification':'Confirms committed aggregate values, not independent raw tracking recomputation',
    'referencePlays':reference['plays'], 'referenceArchiveProvenance':reference['provenance'],
    'confirmedAggregateValues':selected,
    'syntheticCounterexamples':counterexamples,
    'syntheticContactSpeedWindow':{'sameIncomingSpeed':10., 'centeredWithContinuedMotion':speeds[0],
                                  'centeredWithPostContactStop':speeds[1]},
    'sourceHashes':{name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in tracked_files},
    'missingEvidence':['original out/mechanics/nfl-plays.jsonl.gz and its identity/validity manifest',
                       'saved NFL firsttackler/getoff/timeline/lbpass/geometry outputs and per-metric exposure counts',
                       'original out/trench/mass_nfl.py and mass_nfl2.py, player-weight join and cell counts'],
}
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['researchHead','newSimulations','newNflQueries','referencePlays','syntheticCounterexamples','syntheticContactSpeedWindow']},indent=2))
