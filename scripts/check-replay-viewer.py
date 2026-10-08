#!/usr/bin/env python3
"""Exercise an exported film library in Chromium (requires Python Playwright).

python3 scripts/check-replay-viewer.py out/film-room/replay.html
Optional: --browser /path/to/chromium --screenshots out/film-room
Uses a temporary local server; external fonts are blocked to check offline use.
"""
import argparse
import json
import shutil
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
            page.goto(f'http://127.0.0.1:{server.server_port}/{quote(replay.name)}')
            data = page.evaluate('REPLAY')
            filmed = [i for i, clip in enumerate(data['plays']) if 'frames' in clip]
            assert page.locator('.play').count() == len(filmed)
            assert page.locator('.clip-group').count() == len({data['plays'][i]['concept']['id'] for i in filmed})
            checks.append('All filmed clips appear once, grouped by actual concept')

            def current():
                return int(page.locator('.play[aria-current="true"]').get_attribute('data-i'))

            def indices():
                return page.locator('.play').evaluate_all('(rows) => rows.map((el) => Number(el.dataset.i))')

            for group in ['front', 'coverage', 'formation', 'game', 'concept']:
                page.select_option('#group-by', group)
                assert sorted(indices()) == filmed
            checks.append('All grouping modes preserve the clip collection')

            page.locator('.group-head button').first.click()
            concept = page.locator('#concept-filter').input_value()
            expected = [i for i in filmed if data['plays'][i]['concept']['id'] == concept]
            assert indices() == expected and len(expected) > 1
            assert page.locator('#playbtn').inner_text() == 'Pause'
            page.click('#playbtn')
            assert current() == expected[0]
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
            for outcome in ['td', 'complete', 'big', 'to', 'sack', 'stuff', 'broken', 'oob', 'nullified']:
                page.select_option('#outcome-filter', outcome)
                expected_result = [i for i in filmed if (data['plays'][i]['nullified'] if outcome == 'nullified' else data['plays'][i]['flags'].get(outcome, False))]
                assert sorted(indices()) == expected_result
            checks.append('Result filters agree with recorded outcomes and nullified plays')
            page.click('#reset-filters')
            page.locator('[data-f="gap"]').click()
            assert all(data['plays'][i]['concept']['family'] == 'gap' for i in indices())
            checks.append('Run-family filters retain only the selected schemes')

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
            page.locator('[data-f="zone"]').click()
            page.click('#watch')
            page.click('#playbtn')
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / 'mobile.png'), full_page=True)
            checks.append('Mobile layout has no horizontal overflow; filters and playback work')
            page.emulate_media(color_scheme='dark')
            if args.screenshots:
                page.screenshot(path=str(args.screenshots / 'dark.png'), full_page=True)
            assert not errors, errors
            checks.append('No JavaScript errors; viewer works without external fonts')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(json.dumps({'clips': len(filmed), 'concepts': len({data['plays'][i]['concept']['id'] for i in filmed}), 'games': len(data['games']), 'checks': checks}, indent=2))


if __name__ == '__main__':
    main()
