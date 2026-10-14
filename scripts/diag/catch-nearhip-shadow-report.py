"""Reduce saved shadow forecasts; runs no new simulation."""
import hashlib
import json
from pathlib import Path

root=Path('out/catch-nearhip-shadow')
read=lambda p:json.loads(Path(p).read_text())
digest=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
study=read(root/'revised/summary.json')
receipt=read(root/'revised-receipt.json')
invalid=read(root/'initial-invalidated.json')
assert study['failure'] is None and not study['unrun']
assert receipt['exitCode']==0 and receipt['inputsUnchanged']


def geometry(p):
    if p is None:
        return None
    return {k:p[k] for k in ('t','distance','quality','closing','transverse','rearCos','headingDifference','support')}


cases=[]
active=unchanged=skipped=0
for c in study['cases']:
    rows=[]
    for r in c['rows']:
        s=r['shadow']
        assert s is not None and r['prefixVerified']
        m={'t':r['t'],'behavior':r['behavior'],'phaseBefore':r['phaseBefore'],'existingReason':r['decision']['reason']}
        if 'skipped' in s:
            skipped+=1
            m['skipped']=s
        else:
            active+=1
            assert s['previewOrderInvariant']
            same=s['original']['samples']==s['alternative']['samples']
            unchanged+=same
            m.update({'observedTarget':s['target'],'picture':s['picture'],'hip':s['hip'],'offset':s['offset'],
                      'intercept':s['intercept'],'sameForecast':same})
            for arm in ('original','alternative'):
                f=s[arm]
                m[arm]={'command':f['command'],'closest':geometry(f['closest']),
                        'firstStandingReach':geometry(f['firstStandingReach']),'fallAt':f['fallAt']}
        rows.append(m)
    cases.append({k:c[k] for k in ('id','geometry','role','selectedDefender','ticksReplayed','stopAt','censored','wallMs','cachedCompletedOutcome')}|{'rows':rows})
report={'schema':'nearhip-shadow-diagnosis-v1','question':study['question'],
        'provenance':study['provenance'],'analysisSource':{'path':__file__,'sha256':digest(__file__)},
        'newEvidence':{'artifact':{'path':str(root/'revised/summary.json'),'sha256':digest(root/'revised/summary.json')},
                       'prefixTicks':sum(c['ticksReplayed'] for c in study['cases']),'sampledRows':active+skipped,
                       'evaluatedForecastPairs':active,'identicalPairs':unchanged,'skippedRows':skipped,
                       'newFullPlays':0,'newGames':0,'prefixAndForecastWallMs':study['wallMs'],
                       'commandElapsedSeconds':receipt['commands'][0]['elapsedSeconds']},
        'launcherReceipt':{'path':str(root/'revised-receipt.json'),'sha256':digest(root/'revised-receipt.json'),'receipt':receipt},
        'invalidInitialRun':{'path':str(root/'initial-invalidated.json'),'sha256':digest(root/'initial-invalidated.json'),
                             'commit':invalid['provenance']['commit'],'reason':invalid['reason'],
                             'prefixWallMs':invalid['wallMs'],'commandElapsedSeconds':read(root/'prefix-receipt.json')['commands'][0]['elapsedSeconds'],
                             'scope':'Native prefixes match; selected flight sampling was incomplete. Excluded from all shadow conclusions.'},
        'reusedCompleteEvidence':{'path':'data/reviews/current/catch-transition-diagnosis.json',
                                  'sha256':digest('data/reviews/current/catch-transition-diagnosis.json'),
                                  'scope':'Four inspected inputs, two existing native command histories each; completed outcomes, actual P4 execution factorial and controls reused without replaying full plays.'},
        'cases':cases,
        'verdict':'No general catch-to-pursuit objective repair is supported. The same near-hip request already appears at several post-catch ticks. Flight-only anchoring sometimes improves forecasts; P4 later requests trade distance/closing for lower crossing. P16 closest-distance improvement remains far outside reach. No live request, arrival gate, capability, helper or physics change.',
        'limits':'New native prefixes are censored, and alternative trajectories are free held-command forecasts against observed constant receiver velocity. No new candidate achieved contact, grip survival, outcome or fresh transfer is measured.',
        'nextQuestion':'If pursuing the remaining pre-catch hypothesis, isolate current observed receiver hip versus moving ball-window anchor on P58/P4 with existing eligibility, native physical playback and both actual execution values; retain opposing ball-contest evidence. Do not turn closer free forecasts into a policy or expand rosters yet.'}
destination=Path('data/reviews/current/catch-nearhip-shadow-diagnosis.json')
destination.write_text(json.dumps(report,separators=(',',':'))+'\n')
print(json.dumps(report['newEvidence']))
