#!/usr/bin/env python3
"""Reduce saved full games only. No simulation, outcome filtering or seed search."""
import argparse
import csv
import gzip
import hashlib
import html
import json
from pathlib import Path
import statistics


def mean(xs):
    return sum(xs) / len(xs) if xs else None


def quantile(xs, q):
    if not xs:
        return None
    a = sorted(xs)
    x = (len(a) - 1) * q
    lo = int(x)
    return a[lo] + (a[min(lo + 1, len(a) - 1)] - a[lo]) * (x - lo)


def metrics(games):
    # Same all-foul exclusion as the documented historical clean NFL context.
    plays = [p for g in games for p in g['log'] if p['kind'] in ['run', 'pass'] and not p.get('foul') and not p.get('nullified')]
    runs = [p for p in plays if p['kind'] == 'run']
    passes = [p for p in plays if p['kind'] == 'pass']
    throws = [p for p in passes if p.get('stats', {}).get('attempted')]
    catches = [p for p in throws if p.get('stats', {}).get('completed')]
    yac = [p['stats']['yac'] for p in catches if p.get('stats', {}).get('yac') is not None]
    successes = [p['yards'] >= p['distance'] * (.4 if p['down'] == 1 else .6 if p['down'] == 2 else 1) for p in runs]
    rate = lambda n, d: n / d if d else None
    return {
        'games': len(games), 'cleanScrimmages': len(plays), 'cleanDesignedRuns': len(runs),
        'cleanPassCalls': len(passes), 'throws': len(throws), 'completions': len(catches),
        'pointsPerTeamGame': sum(sum(g['score'].values()) for g in games) / (2 * len(games)),
        'completionRate': rate(len(catches), len(throws)),
        'gainPerCompletion': mean([p['yards'] for p in catches]),
        'yacPerCatch': mean(yac), 'yacP90': quantile(yac, .9),
        'yac20Rate': rate(sum(x >= 20 for x in yac), len(yac)),
        'interceptionRate': rate(sum(bool(p.get('stats', {}).get('interceptedBy')) for p in throws), len(throws)),
        'passTDRate': rate(sum(p.get('outcome') == 'touchdown' and p.get('stats', {}).get('completed', False) and not p.get('stats', {}).get('interceptedBy') for p in throws), len(throws)),
        'sackRate': rate(sum(p.get('stats', {}).get('sacked', False) for p in passes), len(passes)),
        'designedRunMean': mean([p['yards'] for p in runs]),
        'designedRunMedian': quantile([p['yards'] for p in runs], .5),
        'designedRunSuccess': mean(successes),
        'designedRunStuffRate': rate(sum(p['yards'] <= 0 for p in runs), len(runs)),
        'designedRun10Rate': rate(sum(p['yards'] >= 10 for p in runs), len(runs)),
        'passGain20Rate': rate(sum(p['yards'] >= 20 for p in passes), len(passes)),
        'timeToThrowMean': mean([p['stats']['timeToThrow'] for p in throws if p.get('stats', {}).get('timeToThrow') is not None]),
        'officialTurnovers': sum(t['box']['turnovers'] for g in games for t in g['teams']),
        'timeoutPlays': sum(p.get('outcome') == 'timeout' for g in games for p in g['log']),
        'physicalScrimmages': sum(g['physicalScrimmages'] for g in games),
        'teammateContactIntervals': sum(g['teammateContacts'] for g in games),
        'teammateImpulse': sum(g['teammateImpulse'] for g in games),
        'simulationSeconds': sum(g['elapsedSeconds'] for g in games),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('root', type=Path)
    ap.add_argument('--input', type=Path, required=True)
    args = ap.parse_args()
    root = args.root.resolve()
    manifest = json.loads(args.input.read_text())
    games = {arm: [] for arm in ['accepted', 'experimental']}
    for arm in games:
        for f in manifest['fixtures']:
            p = root / arm / f['id'] / 'summary.json'
            d = json.loads(p.read_text())
            assert d['complete'] and d['finalState']['over']
            assert d['provenance']['sourceSha256'] == manifest['sources'][arm]
            assert d['provenance']['teamsSha256'] == f['teamsSha256']
            assert d['provenance']['flags'] == manifest['flags']
            games[arm].append(d)
    all_metrics = {a: metrics(v) for a, v in games.items()}
    pairs = [{
        'id': f['id'], 'seed': f['seed'], 'rosterSeeds': f['rosterSeeds'],
        'schemes': [f['home'], f['away']],
        **{a: {'score': games[a][i]['score'], 'metrics': metrics([games[a][i]]),
               'elapsedSeconds': games[a][i]['elapsedSeconds']} for a in games},
    } for i, f in enumerate(manifest['fixtures'])]
    observations = {}
    for arm in games:
        rows = []
        for f in manifest['fixtures']:
            raw = json.loads(gzip.decompress((root / arm / f['id'] / 'game.json.gz').read_bytes()))
            for i, o in enumerate(raw['observations']):
                by_idx = {a['idx']: a for a in o['initialPlayers']}
                rb = [c for c in o['teammateContacts'] if c['team'] == 'O' and 'RB' in c['slots']]
                rb_blocker = [c for c in rb if 'QB' not in c['slots'] and
                              any(by_idx[k]['slot'] != 'RB' and by_idx[k]['listedPosition'] in ['OT', 'OG', 'C', 'TE', 'FB'] for k in [c['i'], c['j']])]
                rows.append({'fixture': f['id'], 'physicalSnap': i,
                             'offensiveContact': any(c['team'] == 'O' for c in o['teammateContacts']),
                             'defensiveContact': any(c['team'] == 'D' for c in o['teammateContacts']),
                             'rbContact': bool(rb), 'rbImpulse': sum(c['impulse'] for c in rb),
                             'rbContactIntervals': len(rb), 'rbBlockerContact': bool(rb_blocker),
                             'rbBlockerImpulse': sum(c['impulse'] for c in rb_blocker)})
        observations[arm] = {'physicalSnaps': len(rows),
                             'snapsWithOffensiveTeammateContact': sum(x['offensiveContact'] for x in rows),
                             'snapsWithDefensiveTeammateContact': sum(x['defensiveContact'] for x in rows),
                             'snapsWithRBTeammateContact': sum(x['rbContact'] for x in rows),
                             'snapsWithRBBlockerContact': sum(x['rbBlockerContact'] for x in rows),
                             'rbBlockerImpulse': sum(x['rbBlockerImpulse'] for x in rows),
                             'rbTeammateImpulse': sum(x['rbImpulse'] for x in rows), 'snaps': rows}
    report = {'schema': 'experimental-game-report-v1', 'sources': manifest['sources'],
              'acceptedDevelop': manifest['acceptedDevelop'], 'historicalComparison': manifest['historicalComparison'],
              'inputsSha256': hashlib.sha256(args.input.read_bytes()).hexdigest(),
              'inputCount': 4, 'gamesPerArm': 4, 'aggregate': all_metrics, 'pairs': pairs,
              'teammateContactObservations': observations,
              'selection': 'Four fixture pairs declared before outcomes; one seed each. Every completed game and filmed play is retained.',
              'limits': ['Exploratory four-pair checkpoint; no separate estimate of seed variation or league realism.',
                         'Matched whole-game seeds share initial teams/settings, but histories, fatigue and calls can diverge. This is not a same-state causal comparison.',
                         'Clean rates exclude every flagged foul, including declined ones; official scores and boxes retain normal rules.',
                         'Body-contact intervals/impulse describe physical contact, not automatically an awareness or blocking defect.',
                         'RB contact labels identify the RB-position player; they do not establish that he carried the ball at that instant. The OL/TE/FB breakdown excludes QB mesh contact.',
                         'Standard film has jobs, requests and engagement links; it does not contain full perception or exact contact-force traces.',
                         'Historical NFL context is a separate 2022–23 clean sample, not matched talent/scheme/game-state calibration.']}
    (root / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
    columns = ['id', 'arm', 'score', 'cleanScrimmages', 'designedRunMean', 'designedRunSuccess', 'completionRate', 'yacPerCatch', 'yacP90', 'yac20Rate', 'interceptionRate', 'sackRate', 'timeoutPlays', 'simulationSeconds']
    with (root / 'results.csv').open('w') as stream:
        w = csv.DictWriter(stream, fieldnames=columns)
        w.writeheader()
        for p in pairs:
            for arm in games:
                w.writerow({'id': p['id'], 'arm': arm, 'score': str(p[arm]['score']), **{k: p[arm]['metrics'][k] for k in columns[3:]}})
    specs = [('Points / team / game', 'pointsPerTeamGame', False, None),
             ('Designed run mean (yd)', 'designedRunMean', False, 4.27),
             ('Designed run median (yd)', 'designedRunMedian', False, 3.0),
             ('Designed run success', 'designedRunSuccess', True, .492),
             ('Completion rate', 'completionRate', True, .645),
             ('YAC / completion (yd)', 'yacPerCatch', False, 5.16),
             ('YAC 90th percentile (yd)', 'yacP90', False, 12.0),
             ('20+ YAC / completion', 'yac20Rate', True, .036),
             ('INT / throw', 'interceptionRate', True, .023),
             ('Sacks / pass call', 'sackRate', True, .067),
             ('Timed-out native plays', 'timeoutPlays', False, None)]
    fmt = lambda v, pct=False: '—' if v is None else f'{v*100:.1f}%' if pct else f'{v:.2f}'
    rows = ''.join('<tr><th>'+label+'</th>'+''.join('<td>'+fmt(all_metrics[a][key], pct)+'</td>' for a in games)+'<td>'+fmt(nfl, pct)+'</td></tr>' for label, key, pct, nfl in specs)
    fixtures = ''.join('<tr><th>'+html.escape(p['id'])+'<small>'+html.escape(' vs '.join(x[0] for x in p['schemes']))+'</small></th>'+''.join('<td><a href="'+a+'/'+p['id']+'/film.html">'+str(p[a]['score']['home'])+' – '+str(p[a]['score']['away'])+' · watch all plays</a></td>' for a in games)+'</tr>' for p in pairs)
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Experimental simulation checkpoint</title><style>body{max-width:1100px;margin:40px auto;padding:0 22px;background:#0d1721;color:#e7edf3;font:17px/1.55 system-ui}a{color:#8ac7ff}h1{line-height:1.15}table{width:100%;border-collapse:collapse;margin:28px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #344452}small{display:block;color:#a7bac9}.scope{padding:20px;background:#172b3b;border-radius:8px}video{width:100%}code{font-size:13px;overflow-wrap:anywhere}</style><h1>Recent work: full-game checkpoint</h1><p class="scope">Four experimental games and four accepted-develop controls. Same frozen teams and game seeds; native coaching, fatigue, substitutions and game rules. This is an experimental comparison, not a baseline adoption or league-realism certificate.</p><p><a href="checkpoint-film.mp4">Watch the film reel</a> · <a href="results.json">Complete results</a> · <a href="results.csv">CSV</a></p><h2>Observed football</h2><table><thead><tr><th>Clean scrimmage measure</th><th>Accepted develop</th><th>Experimental</th><th>Historical NFL context</th></tr></thead><tbody>'''+rows+'''</tbody></table><p>Rates are pooled by their actual denominator; run success uses 40/60/100% of down-distance. NFL context comes from the documented 2022–23 clean sample in the historical engine review. It is not a matched comparison or a tuning target. Official scores include all normal penalties and special teams.</p><h2>Every game, every recorded scrimmage play</h2><table><thead><tr><th>Predeclared matchup</th><th>Accepted develop</th><th>Experimental</th></tr></thead><tbody>'''+fixtures+'''</tbody></table><h2>What this version contains</h2><p>Run stack through #52: observer-owned teammate information, attainable opening forecasts, stretch helper/moving-fit footwork, local DL block response, moving exchange and attached TE base. Minimal stalk #29, live-aim assessment #13, and Stick-only agreement are included. Accepted moving-catch behavior is retained.</p><p>Excluded: blocked coverage #34, rejected gather/departure trials, disabled attention pilot, seam/post, QB-pressure policy, experimental grip solvers, rating changes and new call-menu entries.</p><h2>Interpretation limits</h2><ul>'''+''.join('<li>'+html.escape(x)+'</li>' for x in report['limits'])+'''</ul><p>Body-facing ticks show torso direction, not measured gaze. Interpolated film uses saved native positions and events. Select a player in the full film room for recorded assignments, requests and engagement links.</p><p>Accepted source <code>'''+manifest['sources']['accepted']+'''</code><br>Experimental source <code>'''+manifest['sources']['experimental']+'''</code></p></html>'''
    adverse = ('<p class="scope"><strong>Experimental only; this bundle is not supported as a replacement for develop.</strong> '
               'Ordinary run success falls from 31.3% to 25.7%; interceptions rise from 4.4% to 8.2%; average YAC remains about 8.8 yards. '
               'The closer rushing mean does not compensate for worse ordinary runs. The smaller score is not proof of improved football. '
               'Eight games complete, but five experimental native plays still reach the 25-second simulation cap (seven in controls).</p>')
    # This is the interpretation of this pinned receipt, not an automatic grade
    # to carry into a later checkpoint with different measurements.
    if all_metrics['experimental']['designedRunSuccess'] < all_metrics['accepted']['designedRunSuccess'] and all_metrics['experimental']['interceptionRate'] > all_metrics['accepted']['interceptionRate']:
        page = page.replace('<h2>Observed football</h2>', adverse + '<h2>Observed football</h2>')
    (root / 'index.html').write_text(page)
    print(json.dumps({'aggregate': all_metrics, 'games': len(pairs) * 2, 'simulation': False}))


if __name__ == '__main__':
    main()
