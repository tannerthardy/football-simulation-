"""Saved-film fidelity and browser checks; never simulates or chooses film outcomes.

python3 film-check.py BEFORE-film.json.gz AFTER-film.json.gz VIEWER.html OUTPUT_DIR
"""
import base64, functools, gzip, hashlib, json, re, sys, threading, zipfile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
fixed = ['CT-R1-iz_strong-over-R-S3', 'CT-R1-iz_strong-over-L-S3',
         'CT-R1-split_zone-tite-R-S3', 'CT-R1-split_zone-tite-L-S3', 'CT-R1-duo-odd-R-S11']
control_id = fixed[-1]
helper_witness_id = fixed[2]; helper_witness_time = 1.25
packed = json.loads(re.search(r'const REPLAY = (\{[^\n]*\});', html_path.read_text()).group(1).replace('<\\/', '</'))
assert packed['meta']['filmSchema'] == 'zone-helper-comparison-v1'
assert packed['meta']['predeterminedInputs'] == fixed and packed['meta']['negativeControl'] == control_id
assert packed['meta']['helperWitness'] == {'fixture':helper_witness_id,'slot':'RT','t':helper_witness_time}
assert len(packed['plays']) == 10
digest = lambda data: hashlib.sha256(data).hexdigest()
jhash = lambda value: digest(json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode())
max_error = 0; saved_clips = []; source_controls = []; control_archives = []; source_inputs = []; source_cohorts = []; source_worlds = []; neutral_count = 0

def initial_combinations(row):
    combos = {}
    for state in row['initialProjection']['ownership']:
        combo = (state['plan'] or {}).get('combination')
        if combo: combos.setdefault(combo['id'], combo)
    assert combos, row['id']
    return list(combos.values())

def native_trace(play, combos):
    slots = {slot for combo in combos for slot in combo['members']}; rows = []
    for tick in play['trace']:
        reads = []
        solved = next((u['afterSolvedOwnership'] for u in reversed(tick['updates']) if 'afterSolvedOwnership' in u), None)
        for u in tick['updates']:
            if u['observer'] not in slots: continue
            r = {k: u[k] for k in ['t', 'observer', 'classification',
                 'oldCombinationAfter', 'requested', 'consumedImages', 'events']}
            r['legacyCombinationRead'] = u['combinationRead']
            installed = next((c for c in combos if c['members'][1] == u['observer']), None)
            owner = installed['members'][0] if installed else None
            current_combo = (u['beforeBody']['plan'] or {}).get('combination')
            defender = current_combo['defender'] if current_combo else (installed['defender'] if installed else None)
            seen = {c['target'] for c in u['consumedImages']}
            visual_check = bool(installed and owner in seen and defender in seen)
            actual_climb = any(e['type'] == 'block_climb' for e in u['events'])
            r['helperVisualCheck'] = visual_check
            r['keeperContact'] = None
            if installed and (visual_check or actual_climb):
                def engagement(states):
                    return next((s['engagement'] for s in states if s['slot'] == owner), None)
                r['keeperContact'] = {'owner':owner,'defender':defender,'actualClimb':actual_climb,
                    'completedAt':tick['t']+.05,'before':engagement(u['before']),'after':engagement(u['after']),
                    'solvedOwnershipRecorded':solved is not None,'afterPhysics':engagement(solved or [])}
            for body_key in ['beforeBody', 'afterBody']:
                r[body_key] = {k:u[body_key][k] for k in ['slot','pos','vel','plan']}
            for before_after in ['Before', 'After']:
                r['owner'+before_after] = [{k:s[k] for k in ['slot','plan']} for s in u[before_after.lower()] if any(
                    c['members'][1] == u['observer'] and c['members'][0] == s['slot'] for c in combos)]
            reads.append(r)
        rows.append({'t': tick['t'], 'completedAt': tick['t']+.05,
            'members': [s for s in tick['after'] if s['slot'] in slots],
            'loads': [s for s in tick['deliveredStep'] if s['slot'] in slots], 'reads': reads,
            'nonOLAfterPhysics': [s for s in (solved or []) if s['slot'] in slots and s['slot'] not in ['LT','LG','C','RG','RT']]})
    return rows

for group, path in enumerate([before_path, after_path]):
    film = json.loads(gzip.decompress(path.read_bytes()))
    report_path = Path(str(path).replace('-film.json.gz', '.json.gz'))
    report = json.loads(gzip.decompress(report_path.read_bytes()))
    assert film['schema'] == 'combo-transfer-film-v1' and report['schema'] == 'combo-transfer-review-v1'
    assert film['sourceBefore'] == film['sourceAfter'] == report['sourceBefore'] == report['sourceAfter']
    assert re.fullmatch('[a-f0-9]{64}', film['sourceBefore']) and film['collectorSha256'] == report['collectorSha256']
    assert len(report['trials']) == 160 and len(report['supplementalTrials']) == 2
    all_rows = report['trials'] + report['supplementalTrials']
    assert all(r['observerVerified'] and r['observedSignature'] == r['plainSignature'] for r in all_rows)
    neutral_count += len(all_rows)
    comparison = packed['meta']['sourceComparison'][group]
    assert comparison['sourceSha256'] == film['sourceBefore'] and comparison['collectorSha256'] == film['collectorSha256']
    assert comparison['cohortSha256'] == jhash(report['cohort']) and comparison['moduleSha256'] == report['moduleSha256']
    assert comparison['inputRawSha256'] == digest(path.read_bytes()) and comparison['panelRawSha256'] == digest(report_path.read_bytes())
    assert comparison['observerChecks'] == [{k:r[k] for k in ['id','initialSha256','profileSha256','observedSignature','plainSignature']}
        for r in report['trials'] if r['id'] in fixed]
    source_controls.append(next(r['observedSignature'] for r in report['trials'] if r['id'] == control_id))
    control = next(p for p in film['plays'] if p['id'] == control_id)
    control_archives.append(jhash({k:control[k] for k in ['result','trace']}))
    source_inputs.append([{k:r[k] for k in ['id','initialSha256','profileSha256']} for r in all_rows])
    source_cohorts.append(report['cohort']); source_worlds.append(report['moduleSha256']['src/physics/world.ts'])
    for index, fixture_id in enumerate(fixed):
        saved = next(p for p in film['plays'] if p['id'] == fixture_id)
        row = next(r for r in report['trials'] if r['id'] == fixture_id)
        replay = packed['plays'][group*5+index]; result = saved['result']; frames = result['frames']
        assert replay['id'] == ('BEFORE-' if group == 0 else 'FINAL-') + fixture_id and replay['fixtureId'] == fixture_id
        assert replay['sourceSha256'] == film['sourceBefore'] and replay['recordingVerified'] and row['naturalEnd']
        assert replay['fixtureRun'] == saved['run'] and replay['fixtureSeed'] == saved['seed'] and replay['fixtureFlip'] == saved['flip']
        assert replay['filmSelection'] == saved['selection'] == 'fixed-before-outcomes' and saved['roster'] == 0
        assert replay['negativeControl'] == (fixture_id == control_id)
        for k, rk in [('initialSha256','initialSha256'), ('profileSha256','profileSha256'), ('physicalSha256','observedSignature')]:
            assert replay[k] == row[rk]
        assert result['outcome'] != 'timeout' and result['telemetry']['level'] == 'full' and len(saved['players']) == 22
        assert replay['naturalResult'] == row['result'] == {k:v for k,v in result.items() if k not in ['frames','telemetry']}
        assert replay['eventDetails'] == result['events'] and replay['recordedPlayers'] == saved['players']
        assert replay['roster'] == [[p['team'],p['slot'],p['name'],p['jersey']] for p in saved['players']]
        assert replay['profiles'] == [{k:p[k] for k in ['position','heightIn','weightLb','ratings']} for p in saved['players']]
        assert replay['weights'] == [p['weightLb'] for p in saved['players']]
        assert replay['plan']['formation'] == row['formation'] and replay['plan']['front'] == saved['front']
        assert replay['plan']['coverage'] == 'cover3' and 'rushers' not in replay['plan']
        assert replay['frames']['t'] == [f['t'] for f in frames] and replay['frames']['c'] == [f['carrier'] for f in frames]
        for axis, field in [('p','agents'), ('b','ball'), ('s','carrierPosture')]:
            original = [x for frame in frames for x in frame[field]]
            assert len(original) == len(replay['frames'][axis])
            max_error = max(max_error, max(abs(a-b/10) for a,b in zip(original,replay['frames'][axis])))
        assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == result['telemetry']
        combos = initial_combinations(row)
        assert replay['initialCombinations'] == combos and replay['helperTrace'] == native_trace(saved, combos)
        helper = 'RT' if fixture_id == helper_witness_id else next((c['members'][1] for c in combos if c['members'][0] == 'C'), combos[0]['members'][1])
        assert saved['players'][replay['inspectedLineman']]['slot'] == helper
        assert all(load['slot'] in ['LT','LG','C','RG','RT'] for tick in replay['helperTrace'] for load in tick['loads'])
        assert all(all(k not in (s['plan'] or {}) and k not in ((s['plan'] or {}).get('combination') or {})
            for k in ['helpPolicy','checkSince','checkNextRead'])
            for tick in replay['helperTrace'] for s in tick['members'])
        saved_clips.append({'players': saved['players'], 'frames': frames, 'result': row['result'],
            'id': saved['id'], 'initial': row['initialProjection']['players']})
    del film, report, all_rows
assert neutral_count == 324 and source_controls[0] == source_controls[1] and control_archives[0] == control_archives[1]
assert source_inputs[0] == source_inputs[1]
assert source_cohorts[0] == source_cohorts[1] and source_worlds[0] == source_worlds[1] and max_error <= .050000001
for a,b in zip(saved_clips[:5],saved_clips[5:]):
    assert a['id'] == b['id'] and a['players'] == b['players'] and a['initial'] == b['initial']
    for key in ['agents','ball','carrier','carrierPosture']: assert a['frames'][0][key] == b['frames'][0][key]
zip_path = html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    info=zipfile.ZipInfo(html_path.name,(1980,1,1,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
    z.writestr(info,html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.namelist()==[html_path.name] and z.read(html_path.name)==html_path.read_bytes() and z.testzip() is None

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[]; clips=[]; videos=[]; inspections=[]
screenshots=Path('out/zone-helper/film'); screenshots.mkdir(parents=True,exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1080})
        page.add_init_script("""window.__filmStamps=[];const old=CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));return old.call(this,text,...args);};""")
        page.route('https://**',lambda route:route.abort()); page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
        assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
        assert page.locator('.play').count()==10 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        for i,saved in enumerate(saved_clips):
            replay=packed['plays'][i];page.locator(f'.play[data-i="{i}"]').click()
            if page.locator('#playbtn').inner_text()=='Pause':page.locator('#playbtn').click()
            assert page.evaluate('async()=>await window.TELEMETRY_READY')
            assert replay['id'] in page.locator('#clip-title').inner_text() and 'uncovered-helper comparison' in page.locator('#dd').inner_text()
            assert page.locator('#inspect-player').input_value()==str(replay['inspectedLineman'])
            slot=saved['players'][replay['inspectedLineman']]['slot']; last=saved['frames'][-1]['t']
            combo=next(c for c in replay['initialCombinations'] if c['members'][1]==slot)
            relevant={combo['members'][0],combo['defender'],combo['backer']}
            tick=next(t for t in replay['helperTrace'] if abs(t['t']-helper_witness_time)<1e-8) if saved['id']==helper_witness_id else next(t for t in replay['helperTrace'] if t['t']>.4 and t['t']+.025<last and any(
                r['observer']==slot and any(c['target'] in relevant for c in r['consumedImages']) for r in t['reads']))
            read=next(r for r in tick['reads'] if r['observer']==slot);t=tick['t']+.025
            page.locator('#scrub').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',str(round(t/last*1000)))
            page.wait_for_function("a=>{const e=document.querySelector('#zone-helper');return e.dataset.fixture===a[0]&&e.dataset.slot===a[1]&&Math.abs(Number(e.dataset.time)-a[2])<.01&&e.textContent.includes('Completed native tick')}",arg=[replay['id'],slot,t])
            text=page.locator('#zone-helper').inner_text();assert 'Installed double #'+str(combo['id']) in text
            assert 'Own update '+f"{read['t']:.2f}"+'s: '+slot in text and 'Requested velocity ' in text
            for cue in read['consumedImages']:
                if cue['target'] in relevant: assert 'Actual observer '+slot+' saw '+cue['target'] in text
            assert 'Achieved center ' in text and 'Arm impulse ' in text and 'ground impulse ' in text
            witness = None
            if saved['id']==helper_witness_id and i>=5:
                assert read['helperVisualCheck'] and read['keeperContact']['actualClimb'], read
                k=read['keeperContact']; before=k['before']; after=k['after']; native=k['afterPhysics']
                assert k['owner']=='Y' and k['defender']=='DE_S' and before==after
                for contact in [before,after,native]:
                    assert contact['blocker']=='Y' and contact['defender']=='DE_S'
                    assert contact['hands']['a']=='Y' and contact['hands']['b']=='DE_S'
                rt_index=next(n for n,p in enumerate(saved['players']) if p['slot']=='RT')
                lb_index=next(n for n,p in enumerate(saved['players']) if p['slot']=='LB_M')
                assert any(e['type']=='block_climb' and e['a']==rt_index and e['b']==lb_index for e in read['events'])
                assert read['afterBody']['plan']['kind']=='climb' and read['afterBody']['plan']['target']=='LB_M'
                assert read['beforeBody']['pos']==read['afterBody']['pos'] and read['beforeBody']['vel']==read['afterBody']['vel']
                assert before['hands']['live'] and native['hands']['live'] and before['hands']['id']==native['hands']['id']
                assert abs(native['hands']['normalForce'])+abs(native['hands']['tangentForce'])>0
                assert 'Helper visual check proved by consumed owner+DL pictures' in text
                for target in ['Y','DE_S','LB_M']: assert 'Actual observer RT saw '+target in text
                native_t=k['completedAt']+.01
                page.locator('#scrub').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',str(round(native_t/last*1000)))
                page.wait_for_function("a=>{const e=document.querySelector('#zone-helper');return e.dataset.fixture===a[0]&&e.dataset.slot==='RT'&&Math.abs(Number(e.dataset.time)-a[1])<.01&&e.textContent.includes('Following native solve at 1.30s: keeper Y')}",arg=[replay['id'],native_t])
                native_text=page.locator('#zone-helper').inner_text()
                assert 'native hands #'+str(native['hands']['id'])+' · live' in native_text
                witness={'helper':'RT','keeper':'Y','defender':'DE_S','decisionAt':read['t'],'nativeCompletedAt':k['completedAt'],
                    'nativeKeeperAndHandEndpointsVerified':True,'nativeClimbActorTargetVerified':True,
                    'sameNativeKeeperContactAtDecision':True,'sameKeeperHandIdentityAcrossNativeSolve':True,
                    'keeperHandsLoadedAfterSolve':True,'bodyUnchangedByDecision':True,'text':native_text}
            assert page.locator('#event-details button').count()==len(saved['result']['events'])
            page.click('#copy-reference');assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
            inspections.append({'id':replay['id'],'slot':slot,'t':tick['t'],'ownImagesAndIntentionInspected':True,
                'helperVisualCheckDemonstrated':read['helperVisualCheck'],'completedNativeLoadInspected':True,'keeperWitness':witness,'text':text})
            if i in [0,5]:
                page.evaluate('()=>{window.__filmStamps=[]}');page.fill('#clip-start','0');page.fill('#clip-end','1')
                with page.expect_download(timeout=15000) as info:page.click('#export-video')
                download=info.value;assert replay['sourceSha256'][:12] in download.suggested_filename
                dest=screenshots/download.suggested_filename;download.save_as(dest)
                stamps=page.evaluate('()=>window.__filmStamps');assert dest.stat().st_size>0 and stamps
                assert all(s.startswith('Film '+replay['sourceSha256'][:12]+' · ') for s in stamps)
                videos.append({'id':replay['id'],'sourceSha256':replay['sourceSha256'],'filename':download.suggested_filename,'bytes':dest.stat().st_size,'sourceStampCorrect':True})
            clips.append({'id':replay['id'],'fullTelemetryReady':True,'eventsInspected':len(saved['result']['events']),'referenceSourceCorrect':True})
        page.click('#reset-filters');page.locator('.more-filters summary').click();page.select_option('#game-filter','1');assert page.locator('.play').count()==5
        page.click('#reset-filters');page.fill('#search',fixed[0]);assert page.locator('.play').count()==2
        page.click('#reset-filters');page.select_option('#group-by','front');assert page.locator('.clip-group').count()==3
        page.select_option('#group-by','concept');assert page.locator('.clip-group').count()==3
        page.select_option('#group-by','coverage');assert page.locator('.clip-group').count()==1
        page.screenshot(path=str(screenshots/'film-room-desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844});assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(screenshots/'film-room-mobile.png'),full_page=True);assert not errors,errors
        browser.close()
finally:server.shutdown();server.server_close()
browser_check={'schema':'zone-helper-browser-v1','clips':clips,'pageErrors':errors,'externalHttpsBlocked':True,
  'recordedSourceFilter':True,'pairedFixtureSearch':True,'frontConceptCoverageGrouping':True,'mobileNoHorizontalOverflow':True,
  'videoExport':videos,'helperOwnImageInspections':inspections}
repo=Path(__file__).resolve().parents[4]
integrity={'schema':'zone-helper-film-integrity-v1','clips':10,'predeterminedInputs':fixed,'naturalFinishes':10,
  'sourceComparison':packed['meta']['sourceComparison'],'all324ObserverControlsNeutral':True,'negativeControlExact':True,
  'exactFullTelemetryEventsProfilesRatings':True,'exactNativeHelperTraceAndCompletedStepSubset':True,
  'crossSourceInitialBodiesProfilesPositionsMatch':True,'maxExistingPackingPositionFacingError':max_error,'zipHtmlByteExact':True,
  'preservedTickStartPostPhysicsFrameStamping':True,'completionTimeGateTrailsFrameStateOneTick':True,'finalNativeSolveOutsideSeekRange':True,
  'privateHelperPolicyAndClockUnrecorded':True,'legacyNextReadDoesNotProveHelperVisualCheck':True,
  'htmlSha256':digest(html_path.read_bytes()),'zipSha256':digest(zip_path.read_bytes()),'checkerSha256':digest(Path(__file__).read_bytes()),
  'toolSha256':{s:digest((repo/s).read_bytes()) for s in ['scripts/diag/combo-transfer-review.ts','scripts/export-zone-helper.ts','scripts/replay-data.ts','scripts/replay-telemetry-packing.ts','viewer/replay.template.html']}}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check,indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity,indent=2)+'\n')
print(json.dumps({'clips':10,'helperInspections':len(inspections),'videoChecks':len(videos),'pageErrors':errors,'integrity':integrity},indent=2))
