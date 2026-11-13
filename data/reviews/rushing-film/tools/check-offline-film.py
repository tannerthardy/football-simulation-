#!/usr/bin/env python3
"""Check native film directly through file://, with external requests blocked."""
import argparse
import json
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('review', type=Path)
    parser.add_argument('library', type=Path)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--browser', default=shutil.which('chromium'))
    parser.add_argument('--document-content', action='store_true',
                        help='Load the standalone HTML directly when managed Chromium blocks file URLs')
    args = parser.parse_args()
    evidence = []
    first_pass = ['G1-P059', 'G5-P053', 'G2-P021', 'G1-P077', 'G2-P136', 'G3-P099']
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.browser, headless=True,
                                    args=['--no-sandbox'])
        for path, count in [(args.review, 24), (args.library, 302)]:
            page = browser.new_page(viewport={'width': 1440, 'height': 1080})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('https://**', lambda route: route.abort())
            if args.document_content:
                page.set_content(path.resolve(strict=True).read_text())
            else:
                page.goto(path.resolve(strict=True).as_uri())
            assert page.evaluate('async () => await window.REPLAY_READY')
            page.wait_for_function("document.getElementById('game-label').textContent.includes('native rushing review')")
            assert page.locator('.play').count() == count
            assert page.evaluate('() => REPLAY.meta.nativeGameFilm === true')
            assert 'native rushing review' in page.locator('#game-label').text_content()
            assert page.locator('#field').is_visible()
            assert 'recording shows paths' in page.locator('#cohort-note').inner_text()
            for group in ['concept', 'front', 'coverage', 'formation', 'game']:
                page.select_option('#group-by', group)
                assert page.locator('.play').count() == count
            page.select_option('#group-by', 'concept')
            page.locator('.more-filters summary').click()
            for play_id in first_pass:
                page.fill('#search', play_id)
                assert page.locator('.play').count() == 1
                assert play_id in page.locator('#clip-title').inner_text()
                clip = page.evaluate('''() => REPLAY.plays[Number(
                    document.querySelector('.play[aria-current]').dataset.i)]''')
                assert clip['id'] == play_id
                assert clip['index'] == int(play_id.split('-P')[1])
                assert clip['nativeGameContext']['description'] in page.locator('#clock').inner_text()
                assert clip['review']['reviewPrompt'] in page.locator('#result').inner_text()
                assert clip['nativeOutcome']['gain'] == clip['yds']
                page.select_option('#inspect-player', '0')
                assert page.locator('#inspector-title').inner_text()
                page.click('#copy-reference')
                value = page.locator('#play-reference').input_value()
                assert play_id in value and 't=' in value and 'controlled setup' not in value
                page.click('#restart')
                page.click('#fwd')
                page.wait_for_function("Number(document.getElementById('scrub').value) > 0")
            page.click('#reset-filters')
            assert page.locator('.play').count() == count
            assert not errors, errors
            evidence.append({'file': str(path), 'clips': count,
                             'loadMethod': 'standalone document content' if args.document_content else 'file URL',
                             'allGroupingModes': True,
                             'nativeIdsAndContexts': True, 'questionsVisible': True,
                             'referencesAndStepping': True, 'pageErrors': errors})
            page.close()
        browser.close()
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt = {'schema': 'native-rushing-film-offline-check-v1',
               'externalRequestsBlocked': True, 'checks': evidence, 'status': 'passed'}
    args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
