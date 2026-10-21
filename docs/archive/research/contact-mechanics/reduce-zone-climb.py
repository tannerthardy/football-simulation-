"""Source-pinned classification of forwarding-only native climb traces."""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path('out/zone-climb')
raw = json.load(gzip.open(ROOT / 'native-witnesses.json.gz'))

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def dist(a, b):
    return math.hypot(a['x']-b['x'], a['y']-b['y'])

def responsibilities(assignment):
    owners = collections.defaultdict(list)
    for a in assignment:
        p = a['plan']
        if p['target']:
            owners[p['target']].append({'owner': a['slot'], 'kind': p['kind']})
        if p['combo'] and a['slot'] == p['combo']['members'][0] and p['combo']['backer']:
            owners[p['combo']['backer']].append({'owner': '/'.join(p['combo']['members']), 'kind': 'combination-backer'})
    return dict(owners)

def scheduled_reads(p):
    out = []
    for t in p['ticks']:
        for c in t['comboBefore']:
            if c['released'] or not c['joined']:
                continue
            ca = next(x for x in t['comboAfter'] if x['members'] == c['members'])
            for ix, g in enumerate(c['gates']):
                r = ca['reads'][ix] if ca['reads'] else None
                if not r or abs(r['readAt']-t['t']) > 1e-9:
                    continue
                calls = [z for z in t['reads'] if z['stage'] == 'joined-prepare' and z['a'] == g['climber']]
                if g['fail']:
                    reason = 'keeper:'+','.join(g['fail'])
                elif r['secureSince'] < 0:
                    reason = 'delayed_surface'
                elif t['t']-r['secureSince'] < .15-1e-9:
                    reason = 'confirmation'
                elif r['proposal']:
                    reason = 'proposal'
                else:
                    rb = next((z for z in calls if z['b'] == 'RB'), None)
                    bk = next((z for z in calls if z['b'] == c['backer']), None)
                    if not bk:
                        reason = 'unclassified'
                    else:
                        filling = dist(bk['seen']['pos'], bk['observer']) < 4.2
                        arriving = rb and rb['seen']['pos']['x'] > 40-2.8
                        reason = 'path' if filling or arriving else 'backer_or_runner_urgency'
                out.append({'t': t['t'], 'combo': c['members'], 'backer': c['backer'],
                            'climber': g['climber'], 'reason': reason, 'keeper': g,
                            'secureSince': r['secureSince'], 'readTargets': [x['b'] for x in calls],
                            'proposal': r['proposal']})
    return out

summary = []
for p in raw['plays']:
    first = next((e for e in p['events'] if e['type'] == 'carrier_contact'), None)
    scheduled = scheduled_reads(p)
    climbs = [e for e in p['events'] if e['type'] == 'block_climb']
    owner = responsibilities(p['assignment'])
    approach = []
    jobs = {(a['slot'], a['plan']['target']) for a in p['assignment'] if a['plan']['target'] and a['plan']['target'].startswith('LB_')}
    jobs.update((e['aSlot'], e['bSlot']) for e in climbs)
    for slot, target in sorted(jobs):
        start = next((e['t'] for e in climbs if e['aSlot'] == slot and e['bSlot'] == target), 0)
        rows = [t for t in p['ticks'] if t['t'] >= start-1e-9 and (not first or t['t'] <= first['t']+1e-9)]
        actual = []
        for t in rows:
            a = next(a for a in t['before'] if a['slot'] == slot)
            d = next(a for a in t['before'] if a['slot'] == target)
            if a['plan']['target'] == target:
                actual.append({'t': t['t'], 'distance': dist(a['pos'], d['pos']), 'a': a, 'b': d,
                               'engaged': a['engagement'] and a['engagement']['defender'] == target,
                               'cmd': t['cmds'][a['idx']], 'intent': t['intents'][a['idx']],
                               'bodyContacts': [c for c in t['contacts'] if c['a'] == slot or c['b'] == slot]})
        attempts = [a for a in p['attempts'] if a['a'] == slot and a['b'] == target]
        touches = [e for e in p['events'] if e['type'] == 'block_contact' and e.get('aSlot') == slot and e.get('bSlot') == target]
        target_reads = [r for r in p['reads'] if r['a'] == slot and r['b'] == target and r['stage'] == slot+':attack']
        error = [dist(r['seen']['pos'], r['actual']['pos']) for r in target_reads]
        changes = [dist(r['seen']['vel'], r['actual']['vel']) for r in target_reads]
        if actual:
            approach.append({'blocker': slot, 'backer': target, 'releaseAt': start or None,
                             'minDistanceBeforeFirst': min(actual, key=lambda r:r['distance']),
                             'atFirst': actual[-1], 'attempts': attempts, 'loadedContacts': touches,
                             'readSamples': len(error), 'meanReadPositionError': sum(error)/len(error) if error else None,
                             'maxReadPositionError': max(error) if error else None,
                             'maxReadVelocityError': max(changes) if changes else None,
                             'trafficContactTicks': sum(bool(r['bodyContacts']) for r in actual)})
    summary.append({'input': p['input'], 'endTime': p['endTime'], 'initial':p['initial'],
                    'final':p['final'], 'responsibilities':owner, 'firstCarrierContact':first,
                    'climbs':climbs, 'scheduledReadCounts':dict(collections.Counter(r['reason'] for r in scheduled)),
                    'scheduledReads':scheduled, 'approaches':approach,
                    'firstJoined': [{'members':c['members'], 't':t['t']} for t in p['ticks'] for c in t['comboBefore'] if c['joined'] and not any(x['joined'] and x['members']==c['members'] for earlier in p['ticks'] if earlier['t']<t['t'] for x in earlier['comboBefore'])]})

snap = [{'input':p['input'], 'initial':p['initial'], 'responsibilities':responsibilities(p['assignment']),
         'backers':[a['slot'] for a in p['agents'] if a['slot'].startswith('LB_')]} for p in raw['snapPlans']]
ROOT.joinpath('compact-witnesses.json').write_text(json.dumps({'plays':summary,'snapPlans':snap},indent=2)+'\n')
receipt = dict(raw['receipt'])
receipt.update({'reducerSha256':digest(__file__), 'artifacts':{str(p):digest(p) for p in [ROOT/'native-climb-observer.ts',ROOT/'native-witnesses.json.gz',ROOT/'compact-witnesses.json']},
                'classificationLimits':'Scheduled-read counts include only actual joined personal read attempts before transfer; physical formulas identify eligibility, not independently verified football security. Zero route/read urgency failures is selected-witness evidence, not a population claim. Body-contact ticks demonstrate traffic encounters; they do not isolate traffic-caused time loss. Snap-only examples establish responsibility labels, not attainable blocks.'})
ROOT.joinpath('receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'source':receipt['sourceBefore'], 'nativePlays':len(summary), 'snapPlans':len(snap),
                  'priorParity':len(receipt['parity']['existing180']), 'extendedPlainParity':receipt['parity']['extendedPlainFirst']['exact'],
                  'readCounts':dict(sum((collections.Counter(p['scheduledReadCounts']) for p in summary[:8]),collections.Counter()))},indent=2))
