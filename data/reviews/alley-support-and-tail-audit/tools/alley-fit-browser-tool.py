# Generated from scripts/check-replay-viewer.py; the two source assertions use each clip's real source, because this film pairs baseline and component-policy sources.
#!/usr/bin/env python3
"""Exercise an exported film library in Chromium (requires Python Playwright).

python3 scripts/check-replay-viewer.py out/film-room/replay.html
Optional: --browser /path/to/chromium --screenshots out/film-room
Uses a temporary local server; external fonts are blocked to check offline use.
"""
import argparse
import json
import shutil
import subprocess
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('replay', type=Path)
    parser.add_argument('--browser', default=shutil.which('chromium'))
    parser.add_argument('--screenshots', type=Path)
    parser.add_argument('--video-out', type=Path, help='Export a real 1.2-second WebM and verify decoded frames with ffprobe')
    args = parser.parse_args()
    replay = args.replay.resolve(strict=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(replay.parent)))
    Thread(target=server.serve_forever, daemon=True).start()
    checks = []
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1080})
            page.route('https://**', lambda route: route.abort())
            page.on('pageerror', lambda error: errors.append(str(error)))
            load_started = time.monotonic()
            page.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
            assert page.evaluate('async () => await window.REPLAY_READY'), page.evaluate('window.REPLAY_ERROR')
            compressed_telemetry = page.evaluate('() => REPLAY.plays.some(p => p.telemetry?.encoding === "gzip-base64")')
            assert page.evaluate('async () => await window.TELEMETRY_READY'), page.locator('#telemetry-status').inner_text()
            load_seconds = round(time.monotonic() - load_started, 3)
            # Keep large trajectory/telemetry arrays in the browser. The checks
            # need library metadata and event counts, not a second 200MB copy.
            data = page.evaluate('''() => ({meta:REPLAY.meta, games:REPLAY.games,
                plays:REPLAY.plays.map(p => ({id:p.id, index:p.index, game:p.game, kind:p.kind,
                    ...(p.fixtureSeed!=null ? {fixtureSeed:p.fixtureSeed} : {}), concept:p.concept, plan:p.plan,
                    flags:p.flags, nullified:p.nullified, ev:p.ev,
                    ...(p.eventDetails ? {eventDetails:p.eventDetails} : {}),
                    ...(p.frames ? {frames:{t:p.frames.t}} : {}),
                    ...(p.telemetry ? {telemetry:{level:p.telemetry.level}} : {})}))})''')
            if data['meta'].get('cohort'):
                assert page.locator('#cohort-note').inner_text() == data['meta']['cohort']
                assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
                checks.append('Controlled inspection fixtures are explicitly labeled and do not imply a played-game score')
            filmed = [i for i, clip in enumerate(data['plays']) if 'frames' in clip]
            assert page.locator('.play').count() == len(filmed)
            assert page.locator('.clip-group').count() == len({data['plays'][i]['concept']['id'] for i in filmed})
            checks.append('All filmed clips appear once, grouped by actual concept')
            if data['meta'].get('cohort'):
                for index in filmed:
                    clip = data['plays'][index]
                    page.locator(f'.play[data-i="{index}"]').click()
                    assert f"seed {clip.get('fixtureSeed', data['games'][clip['game']]['seed'])} ·" in page.locator('#clock').inner_text()
                    page.click('#playbtn')
                checks.append('Controlled fixture clocks use each actual fixture seed')

            def current():
                return int(page.locator('.play[aria-current="true"]').get_attribute('data-i'))

            def indices():
                return page.locator('.play').evaluate_all('(rows) => rows.map((el) => Number(el.dataset.i))')

            def select_populated_family(preferred):
                keys = page.locator('[data-f]').evaluate_all('(buttons) => buttons.map((el) => el.dataset.f)')
                # Focused libraries need not contain zone/gap plays or expose
                # a chip for every custom lab family. Prefer the original
                # family check, then a populated family, then a play kind.
                candidates = [preferred] + [key for key in keys if key not in ['all', 'run', 'pass', preferred]] + ['run', 'pass', 'all']
                for key in candidates:
                    if key not in keys:
                        continue
                    expected_family = [i for i in filmed if key == 'all' or
                        (data['plays'][i]['kind'] == key if key in ['run', 'pass'] else data['plays'][i]['concept']['family'] == key)]
                    if expected_family:
                        page.locator(f'[data-f="{key}"]').click()
                        assert sorted(indices()) == sorted(expected_family)
                        return key
                raise AssertionError('No populated family or kind filter for the recorded clips')

            for group in ['front', 'coverage', 'formation', 'game', 'concept']:
                page.select_option('#group-by', group)
                assert sorted(indices()) == filmed
            checks.append('All grouping modes preserve the clip collection')

            page.locator('.group-head button').first.click()
            concept = page.locator('#concept-filter').input_value()
            expected = [i for i in filmed if data['plays'][i]['concept']['id'] == concept]
            assert indices() == expected and expected
            assert page.locator('#playbtn').inner_text() == 'Pause'
            page.click('#playbtn')
            assert current() == expected[0]
            if len(expected) == 1:
                # Focused diagnostic libraries may contain only one clip per
                # concept. Exercise playlist transport across the whole set.
                page.select_option('#concept-filter', 'all')
                expected = indices()
                page.click('#watch')
                page.click('#playbtn')
            assert len(expected) > 1, 'Transport check needs at least two recorded clips'
            page.click('#next')
            assert current() == expected[1]
            page.click('#prev')
            assert current() == expected[0]
            checks.append('Watch group and next/previous stay in the selected concept')

            page.locator('#event-jumps button').last.click()
            before = current()
            page.wait_for_timeout(1000)
            assert current() == before and page.locator('#playbtn').inner_text() == 'Play'
            checks.append('Seeking to the finish pauses without auto-advancing')
            page.click('#speedbtn')  # 2x
            page.click('#speedbtn')  # 4x
            page.click('#playbtn')
            page.wait_for_function('(index) => document.querySelector(".play[aria-current]").dataset.i !== String(index)', arg=before, timeout=15000)
            page.click('#playbtn')
            assert current() == expected[1]
            checks.append('Auto-next advances to the next matching clip')

            page.locator('.play').last.click()
            last = current()
            page.locator('#event-jumps button').last.click()
            page.click('#back')
            page.click('#playbtn')
            page.wait_for_function('document.getElementById("playbtn").textContent === "Play"', timeout=4000)
            assert current() == last and page.locator('#next').is_disabled()
            checks.append('The playlist stops cleanly at its last clip')

            page.click('#loop-playlist')
            page.click('#back')
            page.click('#playbtn')
            page.wait_for_function('(index) => document.querySelector(".play[aria-current]").dataset.i !== String(index)', arg=last, timeout=4000)
            page.click('#playbtn')
            assert current() == expected[0]
            page.click('#loop-playlist')
            checks.append('Loop selection returns to the first matching clip')

            page.locator('#event-jumps button').last.click()
            page.click('#back')
            page.click('#playbtn')
            page.wait_for_function('document.getElementById("scrub").value === "1000"', timeout=3000)
            page.click('#playbtn')
            before = current()
            page.wait_for_timeout(1000)
            assert current() == before
            checks.append('Pausing cancels a pending auto-next')

            page.click('#reset-filters')
            page.locator('.more-filters summary').click()
            if len(data['games']) > 1:
                page.select_option('#game-filter', '1')
                assert all(data['plays'][i]['game'] == 1 for i in indices())
                assert data['plays'][current()]['game'] == 1
                if data['meta'].get('cohort'):
                    assert 'controlled inspection fixtures' in page.locator('#game-label').text_content()
                    assert page.locator('#teams').is_hidden() and page.locator('#linescore').is_hidden()
                    checks.append('Source-group filters select the matching controlled fixtures and keep fictional scores hidden')
                else:
                    assert 'Game 2' in page.locator('#game-label').text_content()
                    assert f"{data['games'][1]['final']['home']}" == page.locator('#teams .pts').nth(1).inner_text()
                    checks.append('Game filters and scoreboard use the selected clip’s game')
            page.click('#reset-filters')
            front = data['plays'][filmed[0]]['plan']['front']
            page.select_option('#front-filter', front)
            coverage = data['plays'][indices()[0]]['plan']['coverage']
            page.select_option('#coverage-filter', coverage)
            assert sorted(indices()) == [i for i in filmed if data['plays'][i]['plan']['front'] == front and data['plays'][i]['plan']['coverage'] == coverage]
            checks.append('Front and coverage filters compose correctly')
            page.click('#reset-filters')
            for outcome in ['td', 'complete', 'big', 'to', 'sack', 'pressure', 'stuff', 'broken', 'oob', 'nullified']:
                page.select_option('#outcome-filter', outcome)
                expected_result = [i for i in filmed if (data['plays'][i]['nullified'] if outcome == 'nullified' else data['plays'][i]['flags'].get(outcome, False))]
                assert sorted(indices()) == expected_result
            checks.append('Result filters agree with recorded outcomes and nullified plays')
            page.click('#reset-filters')
            reference_play = data['plays'][filmed[0]]
            reference_id = reference_play['id']
            page.fill('#search', reference_id)
            assert indices() == [filmed[0]]
            assert reference_id in page.locator('#clip-title').inner_text()
            page.click('#copy-reference')
            reference = page.locator('#play-reference').input_value()
            assert reference_id in reference and 't=' in reference
            assert page.evaluate('(index) => REPLAY.plays[index].sourceSha256', filmed[0])[:12] in reference
            assert f"seed {reference_play.get('fixtureSeed', data['games'][reference_play['game']]['seed'])} /" in reference
            # Clipboard writes finish asynchronously; wait for the UI's
            # actual completion/fallback state instead of racing that promise.
            page.wait_for_function("() => /Copied|selected/.test(document.getElementById('copy-status').textContent)", timeout=5000)
            assert 'Copied' in page.locator('#copy-status').inner_text() or 'selected' in page.locator('#copy-status').inner_text()
            checks.append('Play IDs search precisely; copied references include film version and timestamp')
            page.click('#reset-filters')
            family = select_populated_family('gap')
            checks.append(f'Populated family/kind filters retain exactly the recorded clips ({family})')

            page.select_option('#inspect-player', '0')
            page.wait_for_function('document.getElementById("player-motion").textContent.includes("mph")')
            assert 'lb' in page.locator('#player-motion').inner_text()
            assert 'player ticks = body facing' in page.locator('.result .foot').inner_text()
            page.select_option('#inspect-player', '-1')
            checks.append('Player inspection shows weight and recorded-path speed; facing ticks are labelled')

            page.click('#restart')
            page.click('#wide')
            page.wait_for_timeout(250)
            point = page.evaluate('''() => {
                const clip = REPLAY.plays[Number(document.querySelector('.play[aria-current]').dataset.i)];
                const field = document.getElementById('field'), box = field.getBoundingClientRect();
                const width = box.width, height = box.height, scale = width / 120;
                return {x:box.x+(clip.frames.p[0]-60)*scale+width/2,
                        y:box.y+height/2-(clip.frames.p[1]-26.67)*scale};
            }''')
            page.mouse.click(point['x'], point['y'])
            assert page.locator('#inspect-player').input_value() == '0'
            page.wait_for_function("document.getElementById('inspector-title').textContent.includes('#')")
            assert 'Speed (recorded path)' in page.locator('#inspector-state').inner_text()
            page.click('#wide')
            checks.append('Clicking a player on the field selects the live inspector')

            clip = data['plays'][current()]
            assert page.evaluate('async () => await window.TELEMETRY_READY'), page.locator('#telemetry-status').inner_text()
            if not clip.get('telemetry'):
                assert all(page.locator('#layer-' + name).is_disabled() for name in ['assignments', 'movement', 'contact', 'perception'])
                assert 'Unrecorded' in page.locator('#inspector-state').inner_text()
                checks.append('Legacy replays explicitly disable missing telemetry layers without inventing state')
            else:
                assert 'telemetry' in page.locator('#telemetry-status').inner_text()
                assert page.locator('#layer-movement').is_enabled()
                page.check('#layer-movement')
                if page.locator('#layer-assignments').is_enabled():
                    page.check('#layer-assignments')
                page.locator('#event-jumps button').last.click()
                assert 'State sampled at' in page.locator('#inspector-state').inner_text()
                if clip['telemetry']['level'] == 'full':
                    assert 'Footwork support available' in page.locator('#inspector-state').inner_text()
                    for layer in ['contact', 'perception']:
                        if page.locator('#layer-' + layer).is_enabled():
                            page.check('#layer-' + layer)
                checks.append('Recorded telemetry feeds stackable layers and player detail at sampled times')

            page.locator('details.inspector summary').click()
            assert page.locator('#event-details button').count() == len(clip.get('eventDetails', clip['ev']))
            page.locator('#event-details button').first.click()
            assert page.locator('#playbtn').inner_text() == 'Play'
            checks.append('Detailed event timestamps seek the same replay timeline')

            if args.video_out:
                if not shutil.which('ffprobe'):
                    raise RuntimeError('--video-out requires ffprobe to verify actual decoded video')
                # A focused mechanical library may start with a short play
                # (for example a 0.85s form tackle). Export needs an actual
                # recorded 1.2s window; an invalid range correctly never locks.
                video_indices = [i for i in indices() if
                    data['plays'][i]['frames']['t'][-1] - max(0, data['plays'][i]['frames']['t'][0]) >= 1.2 - 1e-8]
                assert video_indices, 'Video check needs a recorded clip with at least 1.2s available'
                if current() not in video_indices:
                    page.locator(f'.play[data-i="{video_indices[0]}"]').click()
                    if page.locator('#playbtn').inner_text() == 'Pause':
                        page.click('#playbtn')
                clip = data['plays'][current()]
                assert page.evaluate('async () => await window.TELEMETRY_READY'), page.locator('#telemetry-status').inner_text()
                video_start = max(0, clip['frames']['t'][0])
                video_end = video_start + 1.2
                checks.append(f"Video checks select a recorded 1.2s window ({clip['id']})")
                assert page.locator('#export-video').is_enabled()
                page.click('#restart')
                page.click('#fwd')
                page.wait_for_timeout(150)
                saved_reference = page.locator('#play-reference').input_value()
                original_speed = page.locator('#speedbtn').inner_text()
                page.fill('#clip-start', str(video_start))
                page.fill('#clip-end', str(video_start))
                page.click('#export-video')
                assert 'end after start' in page.locator('#export-status').inner_text()
                assert page.locator('#playbtn').is_enabled()
                page.fill('#clip-end', str(video_end))
                checks.append('Invalid video ranges are explained without changing playback state')
                with page.expect_download(timeout=15000) as download_info:
                    page.click('#export-video')
                    assert page.locator('#next').is_disabled() and page.locator('#scrub').is_disabled()
                download = download_info.value
                args.video_out.parent.mkdir(parents=True, exist_ok=True)
                download.save_as(str(args.video_out))
                page.wait_for_function("document.getElementById('export-status').textContent.startsWith('Downloaded')")
                page.wait_for_function('(value) => document.getElementById("play-reference").value === value', arg=saved_reference)
                assert page.locator('#speedbtn').inner_text() == original_speed
                assert clip['id'] in download.suggested_filename and page.evaluate('(index) => REPLAY.plays[index].sourceSha256', current())[:12] in download.suggested_filename
                probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_name,width,height,nb_read_frames', '-of', 'json', str(args.video_out)], text=True))
                video = probe['streams'][0]
                assert video['codec_name'] in ['vp8', 'vp9']
                assert video['width'] == 1280 and video['height'] == 840
                assert int(video['nb_read_frames']) >= 20
                assert args.video_out.stat().st_size > 10000
                checks.append(f"WebM clip downloads and decodes ({video['codec_name']}, {video['width']}×{video['height']}, {video['nb_read_frames']} frames); replay position/speed restored")
                page.click('#export-video')
                page.wait_for_timeout(150)
                page.click('#cancel-export')
                page.wait_for_function("document.getElementById('export-status').textContent.startsWith('Export cancelled')")
                assert page.locator('#export-video').is_enabled()
                page.wait_for_function('(value) => document.getElementById("play-reference").value === value', arg=saved_reference)
                checks.append('Cancelling video recording restores the replay and leaves export usable')

            unsupported = browser.new_page(viewport={'width': 1024, 'height': 768})
            unsupported.add_init_script('window.MediaRecorder = undefined')
            unsupported.route('https://**', lambda route: route.abort())
            unsupported.on('pageerror', lambda error: errors.append(str(error)))
            unsupported.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
            assert unsupported.evaluate('async () => await window.REPLAY_READY')
            assert unsupported.locator('#export-video').is_disabled()
            assert 'requires a browser' in unsupported.locator('#export-status').inner_text()
            unsupported.close()
            checks.append('Browsers without WebM recording show an explicit unsupported message')

            failure = browser.new_page(viewport={'width': 1024, 'height': 768})
            failure.add_init_script('''const NativeRecorder = window.MediaRecorder;
                window.MediaRecorder = class {
                    static isTypeSupported(mime) { return NativeRecorder.isTypeSupported(mime); }
                    constructor() { throw new Error('Recorder unavailable in this browser session'); }
                };''')
            failure.route('https://**', lambda route: route.abort())
            failure.on('pageerror', lambda error: errors.append(str(error)))
            failure.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
            assert failure.evaluate('async () => await window.REPLAY_READY')
            failure.click('#export-video')
            assert 'could not start' in failure.locator('#export-status').inner_text()
            assert failure.locator('#playbtn').is_enabled()
            assert failure.locator('#cancel-export').is_hidden()
            failure.close()
            checks.append('Recorder initialization failures stop capture and leave normal playback usable')

            if compressed_telemetry:
                # Rapid selections must leave only the requested clip's
                # inspection state visible, and decoded storage stays bounded.
                page.click('#reset-filters')
                for index in filmed[:min(6, len(filmed))]:
                    page.locator(f'.play[data-i="{index}"]').click()
                assert page.evaluate('async () => await window.TELEMETRY_READY')
                assert current() == filmed[min(6, len(filmed))-1]
                assert page.evaluate('() => REPLAY.plays.filter(p => p.telemetry?.frames).length') <= 3
                assert page.evaluate('() => REPLAY.plays.some(p => p.telemetry?.encoding === "gzip-base64")')
                page.click('#playbtn')
                checks.append('Lazy telemetry survives rapid selection, discards stale decodes and retains at most three decoded plays')

                race = browser.new_page(viewport={'width': 1024, 'height': 768})
                race.add_init_script('''const NativeDecompression = window.DecompressionStream;
                    window.DECODE_STARTED = 0;
                    window.DecompressionStream = class {
                        constructor(format) {
                            window.DECODE_STARTED++;
                            const native = new NativeDecompression(format);
                            let delayed = false;
                            const gate = new TransformStream({async transform(chunk, controller) {
                                if (!delayed) { delayed = true; await new Promise(resolve => setTimeout(resolve, 1200)); }
                                controller.enqueue(chunk);
                            }});
                            return {readable:native.readable.pipeThrough(gate), writable:native.writable};
                        }
                    };''')
                race.route('https://**', lambda route: route.abort())
                race.on('pageerror', lambda error: errors.append(str(error)))
                race.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
                race.wait_for_function('window.DECODE_STARTED > 0')
                assert race.evaluate('() => REPLAY.plays[Number(document.querySelector(".play[aria-current]").dataset.i)].telemetry.encoding === "gzip-base64"')
                target = filmed[min(5, len(filmed)-1)]
                # Keep the requested short clip selected while the two
                # intentional decode delays run; playback auto-next is
                # exercised separately above.
                race.evaluate('''(target) => {
                    document.querySelector(`.play[data-i="${target}"]`).click();
                    document.getElementById('playbtn').click();
                }''', target)
                assert race.evaluate('async () => await window.TELEMETRY_READY')
                assert int(race.locator('.play[aria-current]').get_attribute('data-i')) == target
                assert race.evaluate('(target) => REPLAY.plays[target].telemetry.frames.length > 0', target)
                assert race.evaluate('() => REPLAY.plays.filter(p => p.telemetry?.frames).length') <= 3
                if args.video_out:
                    cold = next((index for index in filmed if index != target and
                        data['plays'][index]['frames']['t'][-1] - max(0, data['plays'][index]['frames']['t'][0]) >= 1.2 - 1e-8), None)
                    assert cold is not None, 'Decode/export overlap needs a second recorded 1.2s window'
                    race.locator(f'.play[data-i="{cold}"]').click()
                    race.click('#playbtn')
                    cold_start = max(0, data['plays'][cold]['frames']['t'][0])
                    race.fill('#clip-start', str(cold_start))
                    race.fill('#clip-end', str(cold_start + 1.2))
                    with race.expect_download(timeout=15000) as overlap_download:
                        race.click('#export-video')
                        assert race.evaluate('async () => await window.TELEMETRY_READY')
                        assert race.locator('#layer-movement').is_disabled()
                    overlap_download.value.delete()
                    race.wait_for_function("document.getElementById('export-status').textContent.startsWith('Downloaded')")
                    assert race.locator('#layer-movement').is_enabled()
                    checks.append('Telemetry finishing during video capture keeps controls locked and refreshes their availability after restoration')
                race.close()
                checks.append('An intentionally delayed in-flight decode cannot overwrite a newer selected play')

                no_decompression = browser.new_page(viewport={'width': 1024, 'height': 768})
                no_decompression.add_init_script('window.DecompressionStream = undefined')
                no_decompression.route('https://**', lambda route: route.abort())
                no_decompression.on('pageerror', lambda error: errors.append(str(error)))
                no_decompression.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
                assert not no_decompression.evaluate('async () => await window.TELEMETRY_READY')
                assert 'cannot unpack telemetry' in no_decompression.locator('#telemetry-status').inner_text()
                assert no_decompression.locator('#playbtn').is_enabled()
                no_decompression.click('#fwd')
                checks.append('Missing gzip decompression disables inspection explicitly while positions and playback remain usable')
                no_decompression.close()

                corrupt = browser.new_page(viewport={'width': 1024, 'height': 768})
                corrupt.add_init_script("window.atob = () => 'invalid gzip bytes'")
                corrupt.route('https://**', lambda route: route.abort())
                corrupt.on('pageerror', lambda error: errors.append(str(error)))
                corrupt.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
                assert not corrupt.evaluate('async () => await window.TELEMETRY_READY')
                assert 'Telemetry unavailable' in corrupt.locator('#telemetry-status').inner_text()
                assert corrupt.locator('#playbtn').is_enabled()
                corrupt.close()
                checks.append('Telemetry decode failures show a visible message without breaking the physical replay')

            assert all(e[0] > 0 for i in filmed for e in data['plays'][i]['ev'] if e[1] == 'block_contact')
            pitch_releases = pitch_catches = 0
            for i in filmed:
                events = data['plays'][i]['ev']
                releases = [e[0] for e in events if e[1] == 'pitch']
                catches = [e[0] for e in events if e[1] == 'pitch_catch']
                pitch_releases += len(releases)
                pitch_catches += len(catches)
                assert all(any(release < catch for release in releases) for catch in catches)
            # A generated game library need not contain every exchange type;
            # missed pitches also legitimately have no catch. Dedicated run
            # execution tests exercise pitch physics on prescribed plays.
            checks.append(f'Physical block timing verified; pitch ordering checked where present ({pitch_releases} releases, {pitch_catches} catches)')

            page.fill('#search', 'NO_MATCH_FILM_314159')
            assert page.locator('.play').count() == 0
            assert page.locator('#watch').is_disabled() and page.locator('#playbtn').is_disabled()
            page.keyboard.press('ArrowDown')
            page.wait_for_timeout(1000)
            assert page.locator('.play').count() == 0
            page.click('#reset-filters')
            assert page.locator('.play').count() == len(filmed)
            checks.append('Empty selections are safe and clear filters restores all clips')
            page.click('#toggle-filters')
            assert page.locator('#filter-controls').is_hidden()
            page.click('#toggle-filters')
            assert page.locator('#filter-controls').is_visible()
            checks.append('Filters can be hidden to give the field more room')

            if args.screenshots:
                args.screenshots.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(args.screenshots / 'desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            select_populated_family('zone')
            page.click('#watch')
            page.click('#playbtn')
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / 'mobile.png'), full_page=True)
            checks.append('Mobile layout has no horizontal overflow; filters and playback work')
            page.emulate_media(color_scheme='dark')
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / 'dark.png'), full_page=True)
            template = Path(__file__).resolve().parent.parent / 'viewer' / 'replay.template.html'
            page.route('**/empty-template-check.html', lambda route: route.fulfill(content_type='text/html', body=template.read_text()))
            page.goto(f'http://127.0.0.1:{server.server_port}/empty-template-check.html')
            assert page.evaluate('async () => await window.REPLAY_READY')
            assert 'no recorded plays' in page.locator('#collection').inner_text()
            assert page.locator('.main').is_hidden()
            assert page.locator('#filter-controls').is_hidden()
            assert page.get_by_role('link', name='Download recorded plays').is_visible()
            checks.append('Opening the empty template shows visible download instructions instead of a blank field')
            assert not errors, errors
            checks.append('No JavaScript errors; viewer works without external fonts')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(json.dumps({'clips': len(filmed), 'concepts': len({data['plays'][i]['concept']['id'] for i in filmed}), 'games': len(data['games']), 'initialLoadSeconds': load_seconds, 'compressedTelemetry': compressed_telemetry, 'checks': checks}, indent=2))


if __name__ == '__main__':
    main()
