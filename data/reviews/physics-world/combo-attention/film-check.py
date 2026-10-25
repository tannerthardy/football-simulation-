"""Verify twelve saved attention witnesses and their film-room controls.

python3 film-check.py BEFORE.json.gz AFTER.json.gz VIEWER.html OUTPUT_DIR
No simulation; browser serves local files and blocks external HTTPS.
"""
import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

before_path,after_path,html_path,output_dir=map(Path,sys.argv[1:5]);output_dir.mkdir(parents=True,exist_ok=True)
fixed=[f'CA-R1-{run}-{front}-{side}-S{seed}' for run,front,seed in
       [('iz_strong','over',3),('duo','odd',11),('power','under',3)] for side in ['R','L']]
packed=json.loads(re.search(r'const REPLAY = (\{[^\n]*\});',html_path.read_text()).group(1).replace('<\\/','</'))
assert packed['meta']['filmSchema']=='combo-attention-comparison-v1' and packed['meta']['predeterminedInputs']==fixed
assert len(packed['plays'])==12
digest=lambda data:hashlib.sha256(data).hexdigest()
jhash=lambda value:digest(json.dumps(value,separators=(',',':'),ensure_ascii=False).encode())
saved_clips=[];films=[];max_error=0;native_choices=[]

def initial_combinations(play):
    rows={}
    for s in play['initialProjection']['ownership']:
        c=(s['plan'] or {}).get('combination')
        if c:rows.setdefault(c['id'],c)
    assert rows,play['id']
    return list(rows.values())

def attention_boundaries(play):
    rows=[]
    for tick in play['ticks']:
        pre=tick['prepass']
        if pre:
            for before in pre['beforeCombinations']:
                after=next((c for c in pre['afterCombinations'] if c['id']==before['id']),None)
                if not after or not before['genuinelyJoined']:continue
                cues=[c for c in tick['consumedImages'] if pre['firstImageOrdinal']<=c['ordinal']<pre['endImageOrdinal'] and c['observer'] in before['members']]
                if not cues and before['personalReads']==after['personalReads'] and before['released']==after['released']:continue
                rows.append({'t':tick['t'],'phase':'joined-prepass','initiatingObserver':None,
                             'beforeCombination':before,'afterCombination':after,'consumedImages':cues})
        for command in tick['commands']:
            for before in command['beforeCombinations']:
                after=next((c for c in command['afterCombinations'] if c['id']==before['id']),None)
                if not after or not before['genuinelyJoined'] or command['observer'] not in before['members']:continue
                if before['legacySchedule']==after['legacySchedule'] and before['personalReads']==after['personalReads'] and before['released']==after['released']:continue
                rows.append({'t':tick['t'],'phase':'run-block-command','initiatingObserver':command['observer'],
                             'beforeCombination':before,'afterCombination':after,'consumedImages':[
                                 c for c in tick['consumedImages'] if command['firstImageOrdinal']<=c['ordinal']<command['endImageOrdinal']]})
    return rows

for group,path in enumerate([before_path,after_path]):
    film=json.loads(gzip.decompress(path.read_bytes()));films.append(film)
    assert film['schema']=='combo-attention-native-witness-v1' and film['sourceBefore']==film['sourceAfter']
    assert re.fullmatch('[a-f0-9]{64}',film['sourceBefore']) and [p['id'] for p in film['plays']]==fixed
    comparison=packed['meta']['sourceComparison'][group]
    assert comparison['sourceSha256']==film['sourceBefore'] and comparison['inputRawSha256']==digest(path.read_bytes())
    assert comparison['collectorSha256']==film['collectorSha256'] and comparison['cohortSha256']==jhash(film['cohort'])
    assert comparison['moduleSha256']==film['moduleSha256']
    assert comparison['observerChecks']==[{k:p[k] for k in ['id','initialSha256','profileSha256','observedSignature','plainSignature']} for p in film['plays']]
    for index,saved in enumerate(film['plays']):
        replay=packed['plays'][group*6+index];saved_clips.append(saved);result=saved['result'];frames=result['frames']
        assert saved['observerVerified'] and saved['observedSignature']==saved['plainSignature'] and saved['naturalEnd']
        assert result['outcome']!='timeout' and result['telemetry']['level']=='full' and len(saved['players'])==22
        assert saved['selection']==replay['filmSelection']=='fixed-before-outcomes' and saved['formation']=='ace_11'
        assert replay['id']==('BEFORE-' if group==0 else 'FINAL-')+saved['id'] and replay['fixtureId']==saved['id']
        assert replay['fixtureRun']==saved['run'] and replay['fixtureSeed']==saved['seed'] and replay['fixtureFlip']==saved['flip']
        assert replay['sourceSha256']==film['sourceBefore'] and replay['recordingVerified']
        for key,raw in [('initialSha256','initialSha256'),('profileSha256','profileSha256'),('physicalSha256','observedSignature')]:assert replay[key]==saved[raw]
        assert replay['naturalResult']=={k:v for k,v in result.items() if k not in ['frames','telemetry']}
        assert replay['eventDetails']==result['events'] and replay['recordedPlayers']==saved['players']
        assert replay['roster']==[[p['team'],p['slot'],p['name'],p['jersey']] for p in saved['players']]
        assert replay['profiles']==[{k:p[k] for k in ['position','heightIn','weightLb','ratings']} for p in saved['players']]
        assert replay['weights']==[p['weightLb'] for p in saved['players']]
        assert replay['plan']['formation']=='ace_11' and replay['plan']['front']==saved['front'] and replay['plan']['coverage']=='cover3'
        assert 'rushers' not in replay['plan'] and replay['prepassAvailable']==saved['prepassAvailable']
        assert replay['personalReadSchemaAvailable']==saved['personalReadSchemaAvailable']
        assert replay['frames']['t']==[f['t'] for f in frames] and replay['frames']['c']==[f['carrier'] for f in frames]
        for axis,field in [('p','agents'),('b','ball'),('s','carrierPosture')]:
            original=[x for frame in frames for x in frame[field]];assert len(original)==len(replay['frames'][axis])
            max_error=max(max_error,max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
        assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data'])))==result['telemetry']
        combos=initial_combinations(saved)
        assert replay['initialCombinations']==combos and replay['attentionBoundaries']==attention_boundaries(saved)
        assert replay['climbs']==saved['climbs'] and replay['backerContacts']==saved['backerContacts']
        focus=next((c['members'][1] for c in combos if 'C' in c['members']),combos[0]['members'][1])
        assert saved['players'][replay['inspectedLineman']]['slot']==focus
        assert len(saved['climbs'])==sum(e['type']=='block_climb' for e in result['events'])
        for climb in saved['climbs']:
            assert climb['event'] in result['events'] and climb['physicsStepRecorded']
            assert abs(climb['completedAt']-climb['t']-.05)<1e-8
            before=climb['beforeCombination'];decision=climb['eventBoundaryCombination'];native=climb['afterWholeTickCombination']
            assert before['id']==decision['id']==native['id'] and climb['climber'] in before['members']
            assert climb['backer']==before['backer'] and decision['released'] and native['released']
            assert [l['slot'] for l in climb['loads']]==before['members']
            assert saved['players'][climb['event']['a']]['slot']==climb['climber']
            assert saved['players'][climb['event']['b']]['slot']==climb['backer']
            assert climb['physicalBodiesUnchangedAtDecision']==([s['physical'] for s in before['memberState']]==[s['physical'] for s in decision['memberState']])
            cues=[c for c in climb['consumedImages'] if climb['decisionImageOrdinalRange']['first']<=c['ordinal']<climb['decisionImageOrdinalRange']['end']]
            for cue in cues:assert cue['observer'] in [p['slot'] for p in saved['players']]
            own=next((r for r in (decision['personalReads'] or []) if r['observer']==climb['climber']),None)
            current_own=bool(own and own['readAt']==climb['t'] and own['proposal'] and own['proposal']['t']==climb['t'] and own['proposal']['climber']==climb['climber'])
            if climb['phase']=='joined-prepass':
                assert current_own and climb['initiatingObserver'] is None
                proposal=own['proposal'];assert proposal['keeper']!=climb['climber'] and proposal['defender']==before['defender']
                assert proposal['hands']['a']==proposal['keeper'] and proposal['hands']['b']==before['defender']
            before_e=next((s['engagement'] for s in before['memberState'] if s['engagement'] and s['engagement']['defender']==before['defender']),None)
            decision_e=next((s['engagement'] for s in decision['memberState'] if s['engagement'] and s['engagement']['defender']==before['defender'] and s['engagement']['blocker']!=climb['climber']),None)
            assert before_e and decision_e
            keeper=decision_e['blocker'];before_member=next(s for s in before_e['members'] if s['slot']==keeper)
            assert before_member['hands']['id']==decision_e['hands']['id']
            assert decision_e['hands']['a']==keeper and decision_e['hands']['b']==before['defender']
            native_e=next((s['engagement'] for s in native['memberState'] if s['engagement'] and s['engagement']['defender']==before['defender'] and s['engagement']['blocker']==keeper),None)
            keeper_loaded=bool(native_e and native_e['hands'] and native_e['hands']['live'] and
                abs(native_e['hands']['state'].get('normalForce',0))+abs(native_e['hands']['state'].get('tangentForce',0))>1e-6)
            native_choices.append({'source':group,'fixture':saved['id'],'t':climb['t'],'phase':climb['phase'],
                'climber':climb['climber'],'backer':climb['backer'],'initiatingObserver':climb['initiatingObserver'],
                'actualDecisionObservers':sorted({c['observer'] for c in cues}),'ownCurrentNativeProposal':current_own,
                'keeper':keeper,'existingKeeperHandPreservedAtDecision':True,
                'sameKeeperHandAfterNative':bool(native_e and native_e['hands']['id']==before_member['hands']['id']),
                'keeperHandsLoadedAfterNative':keeper_loaded,
                'laterLoadedBackerContactRecorded':any(c['climbT']==climb['t'] and c['climber']==climb['climber'] and c['backer']==climb['backer'] for c in saved['backerContacts'])})
        for contact in saved['backerContacts']:
            assert contact['hands'] or contact['bodyContacts']
            assert all(c['impulse']>1e-6 for c in contact['bodyContacts'])
            assert all(abs(j['state'].get('normalForce',0))+abs(j['state'].get('tangentForce',0))>1e-6 for j in contact['hands'])
assert max_error<=.050000001 and films[0]['sourceBefore']!=films[1]['sourceBefore']
assert films[0]['collectorSha256']==films[1]['collectorSha256'] and films[0]['cohort']==films[1]['cohort']
for key in ['src/physics/world.ts','src/players/physical.ts','src/sim/engagement.ts']:assert films[0]['moduleSha256'][key]==films[1]['moduleSha256'][key]
for a,b in zip(films[0]['plays'],films[1]['plays']):
    for k in ['id','run','front','flip','seed','formation','selection','offCall','defCall','los','firstDownX','initialProjection','initialSha256','profileSha256','players']:assert a[k]==b[k],(a['id'],k)
zip_path=html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:assert z.namelist()==[html_path.name] and z.read(html_path.name)==html_path.read_bytes() and z.testzip() is None

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];clips=[];videos=[];inspections=[];screenshots=output_dir
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1080})
        page.add_init_script("""window.__filmStamps=[];const old=CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));return old.call(this,text,...args);};""")
        page.route('https://**',lambda route:route.abort());page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
        assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
        assert page.locator('.play').count()==12 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        for i,saved in enumerate(saved_clips):
            replay=packed['plays'][i];page.locator(f'.play[data-i="{i}"]').click()
            if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
            assert page.evaluate('async()=>await window.TELEMETRY_READY')
            assert replay['id'] in page.locator('#clip-title').inner_text() and 'joined-attention comparison' in page.locator('#dd').inner_text()
            assert page.locator('#inspect-player').input_value()==str(replay['inspectedLineman'])
            last=saved['result']['frames'][-1]['t']
            boundaries=replay['attentionBoundaries']
            checks=[(c['t'],c['beforeCombination']['members'],c) for c in saved['climbs']]
            if not checks:
                row=next((r for r in boundaries if r['t']>.3 and r['t']+.025<last),None)
                checks=[(row['t'],row['beforeCombination']['members'],None)] if row else [(min(.5,last-.1),replay['initialCombinations'][0]['members'],None)]
            for at,members,climb in checks:
                t=min(at+.075 if climb else at+.025,last)
                page.locator('#scrub').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',str(round(t/last*1000)))
                for slot in members:
                    idx=next(k for k,a in enumerate(saved['players']) if a['slot']==slot);page.select_option('#inspect-player',str(idx))
                    page.wait_for_function("a=>{const e=document.querySelector('#combo-attention');return e.dataset.fixture===a[0]&&e.dataset.slot===a[1]&&Math.abs(Number(e.dataset.time)-a[2])<.01}",arg=[replay['id'],slot,t])
                    text=page.locator('#combo-attention').inner_text();assert 'Installed double #' in text
                    if climb:
                        assert 'Actual departure '+climb['climber']+' → '+climb['backer'] in text
                        if climb['completedAt']<=t:assert 'Completed native tick ' in text and 'applied velocity intention ' in text and 'ground impulse ' in text
                        cues=[c for c in climb['consumedImages'] if climb['decisionImageOrdinalRange']['first']<=c['ordinal']<climb['decisionImageOrdinalRange']['end'] and c['observer']==slot]
                        for cue in cues:assert 'Actual observer '+slot+' saw '+cue['target']+' in '+cue['phase'] in text
                        if not cues:assert 'No own consumed picture for '+slot+' in actual departure decision.' in text
                        if climb['initiatingObserver'] and climb['initiatingObserver']!=climb['climber']:assert 'Remote departure: '+climb['initiatingObserver'] in text
                        if climb['phase']=='joined-prepass':assert 'Chosen departure has '+climb['climber']+'’s own current native proposal.' in text
                        if not any(c['climbT']==climb['t'] and c['climber']==climb['climber'] and c['backer']==climb['backer'] for c in saved['backerContacts']):
                            assert 'Full-play record: no actual loaded backer contact after this climb.' in text
                    else:assert 'No actual block_climb reached' in text
                    if not saved['prepassAvailable']:assert 'Historical shared attention' in text
                    inspections.append({'id':replay['id'],'slot':slot,'at':at,'actualClimbInspected':climb is not None,
                        'actualObserverAndNativePhaseInspected':True,'text':text})
            assert page.locator('#event-details button').count()==len(saved['result']['events'])
            page.click('#copy-reference');assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
            if i in [0,6]:
                page.evaluate('()=>{window.__filmStamps=[]}');page.fill('#clip-start','0');page.fill('#clip-end','1')
                with page.expect_download(timeout=15000) as info:page.click('#export-video')
                download=info.value;assert replay['sourceSha256'][:12] in download.suggested_filename
                dest=screenshots/download.suggested_filename;download.save_as(dest);stamps=page.evaluate('()=>window.__filmStamps')
                assert dest.stat().st_size>0 and stamps and all(s.startswith('Film '+replay['sourceSha256'][:12]+' · ') for s in stamps)
                videos.append({'id':replay['id'],'sourceSha256':replay['sourceSha256'],'filename':download.suggested_filename,'bytes':dest.stat().st_size,'sourceStampCorrect':True})
            clips.append({'id':replay['id'],'fullTelemetryReady':True,'eventsInspected':len(saved['result']['events']),'referenceSourceCorrect':True})
        page.click('#reset-filters');page.locator('.more-filters summary').click();page.select_option('#game-filter','1');assert page.locator('.play').count()==6
        page.click('#reset-filters');page.fill('#search',fixed[0]);assert page.locator('.play').count()==2
        page.click('#reset-filters');page.select_option('#group-by','front');assert page.locator('.clip-group').count()==3
        page.select_option('#group-by','concept');assert page.locator('.clip-group').count()==3
        page.select_option('#group-by','coverage');assert page.locator('.clip-group').count()==1
        page.screenshot(path=str(screenshots/'film-room-desktop.png'),full_page=True);page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(screenshots/'film-room-mobile.png'),full_page=True);assert not errors,errors;browser.close()
finally:server.shutdown();server.server_close()
browser_check={'schema':'combo-attention-browser-v1','clips':clips,'pageErrors':errors,'externalHttpsBlocked':True,
  'recordedSourceFilter':True,'pairedFixtureSearch':True,'frontConceptCoverageGrouping':True,'mobileNoHorizontalOverflow':True,
  'videoExport':videos,'actualReaderProposalAndNativeLoadInspections':inspections}
repo=Path(__file__).resolve().parents[4]
integrity={'schema':'combo-attention-film-integrity-v1','clips':12,'predeterminedInputs':fixed,'naturalFinishes':12,
  'sourceComparison':packed['meta']['sourceComparison'],'allTwelveObserverControlsNeutral':True,
  'exactFullTelemetryEventsProfilesRatings':True,'exactNativeAttentionBoundariesClimbsLoadsAndBackerContacts':True,
  'crossSourceFullInitialInputAndProfilesMatch':True,'maxExistingPackingPositionFacingError':max_error,
  'historicalMissingPersonalReadStateExplicit':True,'actualDecisionObserversAndNativeChoices':native_choices,
  'attentionAttemptsNotRelabeledVisualReads':True,
  'preservedTickStartPostPhysicsFrameStamping':True,'completionGateTrailsFrameStateOneTick':True,'finalNativeSolveOutsideSeekRange':True,
  'zipHtmlByteExact':True,'htmlSha256':digest(html_path.read_bytes()),'zipSha256':digest(zip_path.read_bytes()),
  'checkerSha256':digest(Path(__file__).read_bytes()),'toolSha256':{s:digest((repo/s).read_bytes()) for s in
     ['scripts/diag/combo-attention-witness.ts','scripts/export-combo-attention.ts','scripts/replay-data.ts','scripts/replay-telemetry-packing.ts','viewer/replay.template.html']}}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'clips':12,'memberInspections':len(inspections),'videoChecks':len(videos),'pageErrors':errors,'integrity':integrity},indent=2))
