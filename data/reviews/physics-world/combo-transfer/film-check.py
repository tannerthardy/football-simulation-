"""Validate saved fixed combo films, native state, offline ZIP and browser behavior.

python3 film-check.py BEFORE-film.json.gz AFTER-film.json.gz FILM.html OUTPUT_DIR
Panel companions use BEFORE/AFTER.json.gz or panel-before/panel-after.json.gz.
No football simulation runs here and clips are never chosen by their outcomes.
"""
import base64, functools, gc, gzip, hashlib, json, re, sys, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

before_path, after_path, html_path, output_dir = map(Path, sys.argv[1:5])
output_dir.mkdir(parents=True, exist_ok=True)
film_paths = [before_path, after_path]
report_paths = [p.with_name(p.name.replace('film-', 'panel-', 1)) if p.name.startswith('film-')
                else Path(str(p).replace('-film.json.gz', '.json.gz')) for p in film_paths]
films = [json.loads(gzip.decompress(p.read_bytes())) for p in film_paths]
reports = [json.loads(gzip.decompress(p.read_bytes())) for p in report_paths]
expected_sources = [r['sourceBefore'] for r in reports]
assert expected_sources[0] != expected_sources[1]
assert all(re.fullmatch('[a-f0-9]{64}', s) for s in expected_sources)
match = re.search(r'const REPLAY = (\{[^\n]*\});', html_path.read_text())
assert match, 'Embedded replay JSON missing'
packed = json.loads(match.group(1).replace('<\\/', '</'))
fixed = [('iz_strong', 'over', 3), ('power', 'under', 3), ('counter', 'odd', 11),
         ('duo', 'odd', 11), ('split_zone', 'tite', 3)]
expected = [f'CT-R1-{run}-{front}-{side}-S{seed}' for run, front, seed in fixed for side in ['R', 'L']]
assert len(packed['plays']) == 20
assert reports[0]['cohort'] == reports[1]['cohort']
assert reports[0]['collectorSha256'] == reports[1]['collectorSha256']
assert reports[0]['moduleSha256']['src/physics/world.ts'] == reports[1]['moduleSha256']['src/physics/world.ts']
assert packed['meta']['filmSchema'] == 'combo-transfer-comparison-v1'
assert 'chosen before outcomes' in packed['meta']['cohort']
all_rows = [r['trials'] + r['supplementalTrials'] for r in reports]
for a, b in zip(*all_rows):
    for key in ['id', 'profileSha256']:
        assert a[key] == b[key], (a['id'], key)
    assert a['supplemental'] == b['supplemental']
saved_all = []; max_error = 0; stale_states = []; cancellations = []; transfer_records = []
for group, (film, report, film_path, report_path) in enumerate(zip(films, reports, film_paths, report_paths)):
    assert film['schema'] == 'combo-transfer-film-v1' and report['schema'] == 'combo-transfer-review-v1'
    assert film['sourceBefore'] == film['sourceAfter'] == report['sourceBefore'] == report['sourceAfter']
    assert film['collectorSha256'] == report['collectorSha256']
    assert [p['id'] for p in film['plays']] == report['filmIds'] == expected
    assert report['summary']['observerVerifiedCount'] == report['summary']['snaps'] == 160
    assert len(report['trials']) == 160 and len(report['supplementalTrials']) == 2
    assert all(r['observerVerified'] and r['observedSignature'] == r['plainSignature'] for r in all_rows[group])
    comparison = packed['meta']['sourceComparison'][group]
    assert comparison['sourceSha256'] == film['sourceBefore']
    assert comparison['collectorSha256'] == film['collectorSha256']
    assert comparison['cohortSha256'] == hashlib.sha256(json.dumps(report['cohort'], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    assert comparison['filmRawSha256'] == hashlib.sha256(film_path.read_bytes()).hexdigest()
    assert comparison['reportRawSha256'] == hashlib.sha256(report_path.read_bytes()).hexdigest()
    assert comparison['moduleSha256'] == report['moduleSha256']
    assert comparison['observerChecks'] == [{key: r[key] for key in [
        'id', 'initialSha256', 'profileSha256', 'observedSignature', 'plainSignature']} for r in all_rows[group]]
    for saved, replay in zip(film['plays'], packed['plays'][group*10:(group+1)*10]):
        saved_all.append(saved); result = saved['result']; frames = result['frames']
        row = next(r for r in report['trials'] if r['id'] == saved['id'])
        assert replay['id'] == ('BEFORE-' if group == 0 else 'FINAL-') + saved['id']
        assert replay['fixtureId'] == saved['id'] and replay['filmSelection'] == saved['selection'] == 'fixed-before-outcomes'
        assert saved['roster'] == 0 and not replay['supplemental'] and not row['supplemental']
        assert replay['fixtureFormation'] == row['formation'] == replay['plan']['formation'] == ('gun_wing_12' if saved['run'] == 'split_zone' else 'ace_11')
        assert replay['olMetrics'] == row['olMetrics']
        assert replay['plan']['personnel'] == ('12' if saved['run'] == 'split_zone' else '11')
        assert replay['plan']['qb'] == ('gun' if saved['run'] == 'split_zone' else 'under')
        assert replay['plan']['front'] == saved['front']
        assert replay['plan']['defPersonnel'] == ('base34' if saved['front'] in ['odd', 'tite'] else 'base43')
        assert 'rushers' not in replay['plan'], 'Do not invent an unrecorded rusher count'
        assert replay['fixtureSeed'] == saved['seed'] and replay['fixtureFlip'] == saved['flip']
        assert replay['fixtureRun'] == saved['run'] and replay['sourceSha256'] == film['sourceBefore']
        assert replay['initialSha256'] == row['initialSha256'] and replay['profileSha256'] == row['profileSha256']
        assert replay['physicalSha256'] == row['observedSignature'] == row['plainSignature']
        assert replay['naturalResult'] == {k: v for k, v in result.items() if k not in ['frames', 'telemetry']}
        assert replay['naturalResult'] == row['result'] and result['outcome'] != 'timeout'
        assert saved['trace'][-1]['phase'] == 'dead'
        assert abs(saved['trace'][-1]['t'] + .05 - result['duration']) < 1e-8
        assert replay['frames']['t'] == [f['t'] for f in frames]
        assert replay['frames']['c'] == [f['carrier'] for f in frames]
        for axis, field in [('p', 'agents'), ('b', 'ball'), ('s', 'carrierPosture')]:
            original = [x for frame in frames for x in frame[field]]
            assert len(original) == len(replay['frames'][axis])
            max_error = max(max_error, max(abs(a-b/10) for a, b in zip(original, replay['frames'][axis])))
        assert json.loads(gzip.decompress(base64.b64decode(replay['telemetry']['data']))) == result['telemetry']
        assert replay['eventDetails'] == result['events']
        assert replay['recordedPlayers'] == saved['players']
        assert replay['profiles'] == [{key: p[key] for key in ['position', 'heightIn', 'weightLb', 'ratings']} for p in saved['players']]
        assert replay['weights'] == [p['weightLb'] for p in saved['players']]
        assert replay['roster'] == [[p['team'], p['slot'], p['name'], p['jersey']] for p in saved['players']]
        initial = saved['trace'][0]['before']
        focus = next((m for m in initial if m['slot'] == 'C' and m['plan'] and m['plan']['combination']), None)
        focus = focus or next((m for m in initial if m['slot'] in ['LT', 'LG', 'C', 'RG', 'RT'] and m['plan'] and m['plan']['combination']), None)
        assert replay['inspectedLineman'] == next(k for k, p in enumerate(saved['players']) if p['slot'] == (focus['slot'] if focus else 'C'))
        expected_trace = []
        for tick in saved['trace']:
            transitions = [u for u in tick['updates'] if u['classification'] != 'no-target-change'
                           or u['beforeBody']['plan']['kind'] != u['afterBody']['plan']['kind']]
            expected_trace.append({'t': tick['t'], 'achievedAt': tick['t']+.05, 'phase': tick['phase'],
                'members': tick['after'], 'loads': tick['deliveredStep'], 'transitions': transitions,
                'nonOLAfterPhysics': [m for m in next((u['afterSolvedOwnership'] for u in reversed(tick['updates']) if u.get('afterSolvedOwnership')), []) if m['slot'] not in ['LT','LG','C','RG','RT']],
                'reads': [{k: u[k] for k in ['t', 'observer', 'requested', 'targetGeometry', 'consumedImages', 'events']}
                          for u in tick['updates'] if u['observer'] in ['LT','LG','C','RG','RT','Y','F']]})
            for state in tick['after']:
                plan = state['plan']; combo = plan and plan['combination']
                if combo and not combo['released'] and plan['target'] != combo['defender']:
                    stale_states.append({'group': group, 'fixture': saved['id'], 'slot': state['slot'], 't': tick['t']})
            cancellations.extend({'group': group, 'fixture': saved['id'], 'observer': u['observer'], 't': u['t']}
                                 for u in transitions if u['classification'] == 'cancelled-combination')
            for u in transitions:
                if u['classification'] != 'earned-climb': continue
                defender = u['beforeBody']['plan']['combination']['defender']
                before = next(m['engagement'] for m in u['before'] if m['engagement'] and m['engagement']['defender'] == defender)
                after = next(m['engagement'] for m in u['after'] if m['engagement'] and m['engagement']['defender'] == defender)
                transfer_records.append({'group': group, 'fixture': saved['id'], 't': u['t'], 'observer': u['observer'],
                    'defender': defender, 'beforeBlocker': before['blocker'], 'keeper': after['blocker'],
                    'comboMembers': u['beforeBody']['plan']['combination']['members'],
                    'beforePrimaryJointId': before['hands']['id'] if before['hands'] else None,
                    'afterPrimaryJointId': after['hands']['id'] if after['hands'] else None,
                    'promoted': before['blocker'] != after['blocker'], 'afterDecisionPrimaryLive': bool(after['hands'] and after['hands']['live'])})
        assert replay['ownershipTrace'] == expected_trace, saved['id']
        for event in result['events']:
            if event['type'] in ['block_abandon', 'block_climb']:
                assert any(kind == event['type'] and abs(time-event['t']) <= .0050001 for time, kind in replay['ev'])
assert max_error <= .050000001
assert not stale_states, stale_states
for i in range(10):
    for key in ['id', 'selection', 'roster', 'run', 'front', 'flip', 'seed', 'offCall', 'defCall', 'los', 'firstDownX', 'players']:
        assert saved_all[i][key] == saved_all[i+10][key], (expected[i], key)
    for key in ['agents', 'ball', 'carrier', 'carrierPosture']:
        assert saved_all[i]['result']['frames'][0][key] == saved_all[i+10]['result']['frames'][0][key]
# Full native traces are verified above. Browser checks need only their small
# fixture/result summary; release duplicate native trace trees before Chromium.
saved_all = [{'id': s['id'], 'players': s['players'],
              'result': {'frames': s['result']['frames'], 'events': s['result']['events']}}
             for s in saved_all]
del films, reports, all_rows, film, report, saved, expected_trace, tick, transitions, initial
# Preserve the packed viewer state, so the browser and integrity checks still
# validate the actual exported native timeline rather than a second reconstruction.
gc.collect()
zip_path = html_path.with_suffix('.zip')
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    info = zipfile.ZipInfo(html_path.name, (1980, 1, 1, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, html_path.read_bytes())
with zipfile.ZipFile(zip_path) as z:
    assert z.namelist() == [html_path.name] and z.read(html_path.name) == html_path.read_bytes() and z.testzip() is None
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(html_path.parent.resolve())))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []; clips = []; videos = []; native_checks = []
screenshots = Path('out/combo-transfer/film'); screenshots.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.add_init_script("""window.__filmStamps=[];
            const originalFillText=CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText=function(text,...args){
              if(String(text).startsWith('Film '))window.__filmStamps.push(String(text));
              return originalFillText.call(this,text,...args);
            };""")
        page.route('https://**', lambda route: route.abort())
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/{html_path.name}')
        assert page.evaluate('async()=>await window.REPLAY_READY') and page.evaluate('async()=>await window.TELEMETRY_READY')
        assert page.locator('.play').count() == 20 and page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
        for i, saved in enumerate(saved_all):
            replay = packed['plays'][i]; page.locator(f'.play[data-i="{i}"]').click()
            if page.locator('#playbtn').inner_text() == 'Pause': page.locator('#playbtn').click()
            assert page.evaluate('async()=>await window.TELEMETRY_READY')
            assert replay['id'] in page.locator('#clip-title').inner_text()
            assert 'controlled combo-transfer comparison' in page.locator('#dd').inner_text()
            assert page.locator('#inspect-player').input_value() == str(replay['inspectedLineman'])
            for layer in ['assignments', 'movement', 'contact', 'perception']:
                if page.locator('#layer-'+layer).is_enabled(): page.locator('#layer-'+layer).check()
            last_t = saved['result']['frames'][-1]['t']
            def seek(time):
                page.locator('#scrub').evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}))}', str(round(time/last_t*1000)))
            seek(min(.75, last_t))
            page.wait_for_function("(id)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===id&&Number(e.dataset.time)>.5&&e.textContent.includes('After tick')}", arg=replay['id'])
            text = page.locator('#ownership-state').inner_text()
            assert 'Body state' in page.locator('#inspector-state').inner_text()
            assert 'Arm impulse' in text and 'Actual support ' in text
            assert page.locator('#event-details button').count() == len(saved['result']['events'])
            records = [r for r in transfer_records if r['group'] == i//10 and r['fixture'] == saved['id']]
            for record in records:
                if record['t'] + .05 > last_t + 1e-8:
                    native_checks.append(record | {'notYetCompletedAtFinalVisualFrame': True})
                    continue
                inspect_time = min(record['t'] + .11, last_t)
                seek(inspect_time)
                focus_slot = record['keeper'] if record['keeper'] in ['LT','LG','C','RG','RT'] else next(m for m in record['comboMembers'] if m in ['LT','LG','C','RG','RT'])
                focus_idx = next(k for k, player in enumerate(saved['players']) if player['slot'] == focus_slot)
                page.select_option('#inspect-player', str(focus_idx))
                page.wait_for_function("(arg)=>{const e=document.querySelector('#ownership-state');return e.dataset.fixture===arg[0]&&e.dataset.slot===arg[2]&&Math.abs(Number(e.dataset.time)-arg[1])<.02}", arg=[replay['id'], inspect_time, focus_slot])
                text = page.locator('#ownership-state').inner_text()
                assert 'At decision, actual blocker '+record['beforeBlocker']+' → '+record['keeper'] in text, text
                assert 'Transfer completed tick ' in text and 'Keeper support at decision: ' in text, text
                if record['afterPrimaryJointId'] is not None:
                    assert 'primary hands #'+str(record['afterPrimaryJointId']) in text, text
                native_checks.append(record | {'inspectionTime': inspect_time, 'actualKeeperHandAndNativeSolveSnapshotShown': True, 'nonOLPerBodyLoadNotInvented': True, 'inspectedText': text})
            page.click('#copy-reference')
            assert page.locator('#play-reference').input_value().startswith('Film '+replay['sourceSha256'][:12]+' / '+replay['id'])
            if i in [0, 10]:
                page.evaluate('()=>{window.__filmStamps=[]}')
                page.fill('#clip-start', '0'); page.fill('#clip-end', '1')
                with page.expect_download(timeout=15000) as info: page.click('#export-video')
                download = info.value
                assert replay['sourceSha256'][:12] in download.suggested_filename
                video_path = screenshots / download.suggested_filename; download.save_as(video_path)
                assert video_path.stat().st_size > 0
                stamps = page.evaluate('()=>window.__filmStamps')
                assert stamps and all(stamp.startswith('Film '+replay['sourceSha256'][:12]+' · ') for stamp in stamps)
                videos.append({'id': replay['id'], 'selectedSourceSha256': replay['sourceSha256'], 'downloadFilename': download.suggested_filename,
                               'nonemptyBytes': video_path.stat().st_size, 'paintedStampUsesSelectedSource': True, 'sampleStamp': stamps[0]})
            clips.append({'id': replay['id'], 'fullTelemetry': True, 'naturalFinish': True, 'rawEventCount': len(saved['result']['events']),
                          'actualSupportOwnershipHandsAndDeliveredLoadsInspected': True, 'copiedReferenceUsesSelectedEngineSource': True})
        page.click('#reset-filters'); page.select_option('#outcome-filter', 'stuff')
        assert page.locator('.play').count() == sum(p['flags']['stuff'] for p in packed['plays'])
        page.click('#reset-filters'); page.locator('.more-filters summary').click(); page.fill('#search', expected[0])
        assert page.locator('.play').count() == 2
        page.click('#reset-filters'); page.select_option('#game-filter', '1'); assert page.locator('.play').count() == 10
        page.select_option('#game-filter', 'all'); page.select_option('#front-filter', 'odd'); assert page.locator('.play').count() == 8
        page.click('#reset-filters'); page.select_option('#group-by', 'front'); assert page.locator('.clip-group').count() == 4
        page.select_option('#group-by', 'concept'); assert page.locator('.clip-group').count() == 5
        page.select_option('#group-by', 'coverage'); assert page.locator('.clip-group').count() == 1
        page.screenshot(path=str(screenshots/'film-room-desktop.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(screenshots/'film-room-mobile.png'), full_page=True)
        assert not errors, errors
        browser.close()
finally:
    server.shutdown(); server.server_close()
browser_check = {'schema': 'combo-transfer-browser-smoke-v1', 'clips': clips, 'pageErrors': errors,
    'localSelfContainedHtmlOpened': True, 'offlineFontsBlocked': True, 'stuffFilterUsesRecordedResults': True, 'pairedFixtureSearch': True,
    'frontFilterAndGrouping': True, 'recordedSourceFilter': True, 'conceptAndCoverageGrouping': True,
    'mobileNoHorizontalOverflow': True, 'copiedReferenceUsesSelectedEngineSource': True,
    'videoExportUsesSelectedEngineSource': videos, 'nativeTransferInspections': native_checks}
integrity = {'schema': 'combo-transfer-film-integrity-v1', 'clips': 20, 'predeterminedClips': 20,
    'sourceComparison': packed['meta']['sourceComparison'], 'exactFullTelemetry': True, 'exactRawEventsActorsNotesTimes': True,
    'exactPlayersProfilesRatingsWeights': True, 'exactNativeSupportOwnershipHandsImagesAndDeliveredLoads': True,
    'crossSourceProfilesAndInitialPositionsMatch': True, 'all162ObserverControlsPerPhaseNeutral': True,
    'naturalFinishes': len(saved_all), 'inspectionCensors': 0, 'recordedFrameTimesAndPossession': True,
    'maxExistingPackingPositionFacingError': max_error, 'baselineStaleStates': 0, 'candidateStaleStates': 0,
    'recordedCancellations': cancellations, 'recordedTransfers': transfer_records, 'zipHtmlByteExact': True,
    'htmlSha256': hashlib.sha256(html_path.read_bytes()).hexdigest(), 'zipSha256': hashlib.sha256(zip_path.read_bytes()).hexdigest(),
    'checkerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
repo = Path(__file__).resolve().parents[4]
integrity['exportToolSha256'] = {path: hashlib.sha256((repo/path).read_bytes()).hexdigest() for path in [
    'scripts/export-combo-transfer.ts', 'scripts/replay-data.ts', 'scripts/replay-telemetry-packing.ts', 'viewer/replay.template.html']}
(output_dir/'browser-check.json').write_text(json.dumps(browser_check, indent=2)+'\n')
(output_dir/'film-integrity.json').write_text(json.dumps(integrity, indent=2)+'\n')
print(json.dumps({'browser': browser_check, 'integrity': integrity}, indent=2))
