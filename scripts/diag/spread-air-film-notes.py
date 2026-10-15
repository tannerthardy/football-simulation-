#!/usr/bin/env python3
"""Package the user's 21 notes with original native clips; runs zero simulations."""
import base64
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path('data/reviews/current/experimental-game-checkpoint')
OUT = Path('data/reviews/current/spread-air-film-notes')
# User observations are paraphrases, explicitly separated from measured facts.
NOTES = [
 (2,'coverage',2.9,['Z','CB_S','SS','Y','LB_W','LB_S'],
  'Corner technique looks poor; defensive alignment looks bunched; a man defender covering a blocker should have an appropriate secondary job.',
  'Cover 1 Off; SS is man:Y (TE), LB_S is man:RB. At the snap LB_W/LB_S centers are 0.57 yd apart and LB_M/SS 0.90 yd apart. Z catches with 1.9-yd native separation. No green-dog rule is installed in ManCoverage. Crowding and technique still need football adjudication.'),
 (3,'coverage',1.1,['H','NB','SS'],
  'Apex defender bites on PA and loses the slot; plausible football, but does it happen too reliably?',
  'Cover 2 Match; pass to H gains 25.65 yd, 10.66 YAC. No defender declares run in recorded read events; NB declares pass at 1.10 s, SS at .85 s. Hesitation and a hard run commitment are different. One snap cannot establish that PA always works.'),
 (4,'catching',2.35,['QB','Y','Z'],
  'At the opponent 12, TE appears to block and then receive a desperation pass; investigate route, check-release and readiness.',
  'Throw targets Z at 2.25 s. Y, a permanent pass protector with passOption=false and no release installed, incidentally catches it at 2.35 s. First candidate chance .86817 succeeds. This is not a QB-selected TE outlet. Actual play gain -6.24 yd; native airYards=16.51 describes intended target and is not actual credited air gain.'),
 (5,'protection',1.7,['QB','LT','DE_W'],
  'LT seems beaten immediately by a wide speed rush; a quick release hides whether he could protect the QB.',
  'Drive; DE_W/LT pass-turned-corner shed at 1.70 s, throw at 1.90 s, 6.16-yd completion. Keep the ordinary completed play while investigating the protection sequence.'),
 (6,'control',1.75,['QB','H','Y'],
  'Believable Slant-Flat; perhaps the slant should attract QB attention, but overall normal football.',
  '3rd-and-10, completion to H for 1.74 yd, nearly zero YAC; retain as a believable control. No demonstrated alternative read or illegal throw decision.'),
 (9,'run-lanes',2.0,['RB','C','LG','LB_W'],
  'RB may choose a bad path into two cutback defenders; check the center assignment.',
  'Outside Zone gains -.19 yd. C starts reach on DT_W, LG combo on DT_W; C climbs toward LB_M at 1.80 s, after the 1.00-s handoff. Need acquired lane picture, keeper and runner arrival; a loss alone does not establish the wrong read.'),
 (10,'control',3.45,['QB','Z','CB_S'],
  'Convincing corner interception; overall INT frequency is too high, but this play itself looks defensible.',
  'Levels, 0.5-yd native separation, CB_S interception at 3.45 s. Keep this positive defensive control; aggregate INT excess does not make every interception a defect.'),
 (11,'run-lanes',2.4,['RB','LG','RG','LB_W','LB_M'],
  'RB undercuts his guard toward the Will rather than squeezing away; second-level blocking also appears slow.',
  'Trap gains .63 yd. RG is the installed pulling trap blocker on DT_S; LG starts combo on DT_W and climbs toward LB_W at 2.40 s. LB_M sheds LG at 3.65 s. Trace which guard/job the film refers to and whether collection exists before crediting the Will as blocked.'),
 (12,'control',2.6,['QB','LT','RT','DE_W'],
  'Covered Levels, hit and fumble looks normal; concept fit and a possible earlier throwaway are worth examining.',
  'QB fumbles at 2.60 s after pressure at 2.40 s, recovery lost; not an attempted pass. Retain the hit/fumble as plausible. A proposed throwaway needs a legal, attainable opportunity, not automatic pressure immunity.'),
 (18,'protection',1.7,['QB','RT','LT','DE_W'],
  'Another apparent Y-Cross speed-rush loss; recurrence seems too high.',
  'P018 is Drive, with pass-turned-corner sheds at 1.70 and 2.15 s; throw at 2.30 s. Adjacent P019 is Y-Cross, so include both when locating the observation. A blocker loss can coexist with an ordinary incompletion.'),
 (22,'rules',2.9,['QB','RT','DE_W'],
  'Holding accepted after an eight-yard sack looks like a questionable penalty decision.',
  '1st-and-10 at own 35; holding accepted, sack nullified. Next snap is 1st-and-24 at own 20.95, not an automatic 18-yard stacked loss. Compare declining for roughly 2nd-and-18 and verify enforcement; the current attempted-pass predicate differs on sacks.'),
 (23,'catching',2.05,['QB','RB','DT_W','X'],
  'Pass seems batted into an interception; investigate tipped-ball frequency and hands.',
  'QB targets X at 1.85 s. RB has check-released, fails an incidental catch at 2.05 s (chance .43975), and the resulting unlogged drop/deflection changes the flight. DT_W intercepts at 2.10 s from the deflected-ball branch (chance .18265). This is not a recorded line bat by a defender.'),
 (24,'catching',1.7,['QB','RB','X'],
  'RB appears to protect and immediately receive a dump-off with plausible YAC; worry about readiness of protection-only players.',
  'QB targets X at 1.55 s. Permanent pass-pro RB, passOption=false and no release installed, incidentally catches at 1.70 s (first chance .67099). Gain 10.74 yd, 15.45 YAC. Legal eligibility does not establish acquired ball readiness.'),
 (33,'run-lanes',2.0,['RB','C','RG','DE_W'],
  'RB bounces outside despite an apparent inside seal; path looks wrong.',
  'Inside Zone Weak gains -1.17 yd. C/RG share DT_S, C climbs at 2.00 s. Need the runner acquired picture, live gap and final spacing request; an apparent seal in true-state film is not automatically known or durable.'),
 (34,'catching',1.3,['QB','RB'],
  'RB labeled pass-pro should not be selected as a receiver while still blocking.',
  'The installed back assignment is check. RB transitions pass-pro to route at 1.30 s, then track at the 2.20-s targeted throw. This is a legitimate check-release, unlike P004/P024; subsequent catch attempts fail. Preserve this opposing control.'),
 (37,'run-lanes',2.0,['RB','LG','NB'],
  'The successful Power run masks a guard who looks lost.',
  'Gain 45.51 yd, one broken tackle. LG is the installed puller targeting NB; RT/Y share DE_S until RT climbs to SS at 1.20 s. Evaluate the pull path/acquired target/achieved fit, not the favorable yardage.'),
 (38,'exchange',1.0,['QB','RB','LB_W'],
  'QB never hands off and players do not recover awareness; clearly broken.',
  'Confirmed no exchange, no rusher credit, QB remains holder, 25-s cap at -5 yd. Same failure family already traced by Run Game in PR57 and the shared film audit. Reuse those receipts rather than rerunning their games.'),
 (39,'run-lanes',2.0,['RB','LG','DT_W'],
  'Unsuccessful Inside Zone with a plausible DT win; investigate shedding logic and guard execution rather than assuming every loss is wrong.',
  'Gain -1.50 yd, DT tackle; no explicit shed event is recorded. Separate penetration/contact while engaged from an actual recorded release/shed. Preserve legitimate defensive wins.'),
 (40,'protection',1.75,['QB','LT','DE_W'],
  'Another wide-rush protection failure.',
  'Y-Cross: DE_W sheds LT at 1.75 s, pressure at 2.40 s, sack at 3.00 s for -7.36 yd. Compare with P005 where the release arrives before the hit.'),
 (43,'catching',3.45,['QB','Z','CB_S'],
  'Apparently easy Speed Outs completion fails; could be hands or an overly high throw, lower priority.',
  'Receiver Z gets an actual catch opportunity at 3.45 s and fails a .57542 chance; no explicit drop event is emitted. Segment endpoint height is 2.96 yd; exact contact height/stretch must be reconstructed before calling this an easy drop or changing hands globally.'),
 (45,'coverage',3.75,['X','CB_W','FS'],
  'Corner loses top leverage; might be legitimate Cover 0, but man technique remains concerning.',
  'Actual call is Quarters MOD match, not Cover 0. X catches at 3.75 s with 2.5-yd native separation, then gains 49.52 YAC in a 72-yd TD with no recorded carrier contact/attempt. Review both the quarter/match responsibility and post-catch containment.'),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = (ROOT/'experimental/spread-air/game.json.gz').read_bytes()
    g = json.loads(gzip.decompress(raw))
    ps = [p for p in g['log'] if p.get('replay')]
    obs = [o for o in g['observations'] if o['kind']=='scrimmage']
    byno = {p['index']+1: (p, o) for p, o in zip(ps, obs)}
    rows, witnesses = [], []
    for no, owner, at, actors, observation, facts in NOTES:
        p, o = byno[no]
        assert p['call']==o['call']['label']
        rows.append({'play':no,'id':f'G1-P{no:03}','primaryTopic':owner,
          'userObservationParaphrase':observation,'verifiedContextAndLimits':facts,
          'call':p['call'],'defense':p['defense'],'outcome':p['outcome'],
          'yards':p['yards'],'nativeLogIndex':p['index'],
          'reviewLink':f'index.html#w=p{no:03}&t={at}'})
        witnesses.append({'id':f'p{no:03}','arm':'experimental','fixture':'spread-air','at':at,
          'actors':actors,'title':f'P{no:03} — {p["call"]}',
          'note':f'User observation (paraphrased): {observation} Verified context: {facts}',
          'sourceSha256':g['provenance']['sourceSha256'],'play':p,
          'initialPlayers':o['initialPlayers'],'teammateContacts':o['teammateContacts']})
    spec=importlib.util.spec_from_file_location('shared_audit_film',Path(__file__).with_name('checkpoint-audit-film.py'))
    shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
    totals=json.loads(Path('data/reviews/current/experimental-film-audit/scan.json').read_text())['totals']
    packet={'schema':'spread-air-user-notes-film-v1','totals':totals,'witnesses':witnesses}
    packed=gzip.compress(json.dumps(packet,separators=(',',':')).encode(),mtime=0)
    html=shared.HTML.replace('Checkpoint film audit','Spread versus air raid: user film notes')
    html=html.replace('Saved checkpoint: failure witnesses and opposing controls','Spread versus air raid: your 21 film notes')
    html=html.replace('<strong>Zero new simulations.</strong>', '<strong>Original recorded film.</strong> A separate diagnostic prefix replay captures missing catch/readiness state; see its receipt.')
    html=html.replace('These are nominated diagnostic clips, not a random sample or a defect-rate estimate.', 'These are the user-nominated clips and normal controls, not a defect-rate estimate.')
    html=html.replace('experimental-film-audit-2026-10-15.md','spread-air-film-notes-2026-10-14.md')
    html=html.replace('href="scan.json"','href="../experimental-film-audit/scan.json"')
    html=html.replace('Review counts: accepted / experimental','Existing checkpoint counts: accepted / experimental')
    (OUT/'index.html').write_text(html.replace('__PACKET__',base64.b64encode(packed).decode()))
    (OUT/'witnesses.json.gz').write_bytes(packed)
    review={'schema':'spread-air-user-notes-v1','userDate':'2026-10-14 America/Phoenix',
      'sourceSha256':g['provenance']['sourceSha256'],'nativeGameSha256':hashlib.sha256(raw).hexdigest(),
      'fixture':'spread-air','gameSeed':702,'notes':rows}
    (OUT/'review.json').write_text(json.dumps(review,indent=2)+'\n')
    print(json.dumps({'notes':len(rows),'filmBytes':len(packed),'simulationRuns':0}))


if __name__=='__main__':
    main()
