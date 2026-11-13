"""Summarize roster-audit.ts output with roster-clustered paired intervals.

python3 scripts/roster-audit-report.py --input out/roster-audit
Optional --plot needs matplotlib; all numerical reporting uses the stdlib.
"""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path
import random
import statistics


def load(path):
    opener = gzip.open if str(path).endswith('.gz') else open
    with opener(path, 'rt') as handle:
        return json.load(handle)


def average(values):
    return statistics.mean(values) if values else None


def interval(values, seed=90210):
    if not values:
        return None
    rng = random.Random(seed)
    estimates = sorted(average(rng.choices(values, k=len(values))) for _ in range(10000))
    return [estimates[250], estimates[9749]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=Path('out/roster-audit'))
    parser.add_argument('--out', type=Path, default=Path('data/reviews/current/roster-capability-audit.json'))
    parser.add_argument('--plot', action='store_true')
    args = parser.parse_args()
    paths = {mode: args.input / f'{mode}.json' for mode in ['profiles', 'quality', 'encounters', 'contexts', 'games', 'native']}
    reports = {mode: load(path) for mode, path in paths.items()}
    sources = {r['metadata']['source'] for r in reports.values()}
    flags = {json.dumps(r['metadata']['flags'], sort_keys=True) for r in reports.values()}
    if len(sources) != 1 or len(flags) != 1:
        raise ValueError('Mixed runtime or flag profiles')
    profiles = reports['profiles']
    profile_fields = ['balance', 'ballSecurity', 'strength', 'tackling', 'pursuit', 'handTechnique', 'vmax', 'brake', 'lateral', 'stepSpeed', 'baseRadius', 'armForce']
    positions = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S']
    selected = {pos: {k: profiles['byPosition'][f'0.55/selected-11-base43/{pos}'][k] for k in profile_fields} for pos in positions}
    slots = {slot: profiles['bySlot'][f'0.55/fresh/nickel/{slot}'] for slot in ['FS', 'SS', 'NB', 'DT_W', 'DT_S']}

    encounter_rows = load(args.input / 'encounters.raw.json.gz')['rows']
    base = {(r['pair'], r['cell'], r['rep']): r for r in encounter_rows if r['arm'] == 'original'}
    encounter_summary = {}
    for arm in sorted({r['arm'] for r in encounter_rows}):
        rows = [r for r in encounter_rows if r['arm'] == arm]
        differences = collections.defaultdict(list)
        for r in rows:
            differences[r['pair']].append(r['tackled'] - base[r['pair'], r['cell'], r['rep']]['tackled'])
        encounter_summary[arm] = {'n': len(rows), 'tackled': sum(r['tackled'] for r in rows),
            'escaped': sum(r['escaped'] for r in rows), 'censored': sum(r['censored'] for r in rows),
            'fumbled': sum(r['fumbled'] for r in rows),
            'tackleRate': average([r['tackled'] for r in rows]),
            'pairedTackleDeltaCI95': interval([average(v) for v in differences.values()])}

    context_rows = load(args.input / 'contexts.raw.json.gz')['rows']
    base = {(r['pair'], r['cell'], r['rep']): r for r in context_rows if r['arm'] == 'original'}
    contexts = {}
    for cell in sorted({r['cell'] for r in context_rows}):
        contexts[cell] = {}
        for arm in ['original', 'balance+25', 'tackling+15']:
            rows = [r for r in context_rows if r['arm'] == arm and r['cell'] == cell]
            catches = [r['yac'] for r in rows if 'yac' in r]
            deltas = collections.defaultdict(list)
            pair_means = collections.defaultdict(list)
            for r in rows:
                deltas[r['pair']].append(r['yards'] - base[r['pair'], r['cell'], r['rep']]['yards'])
                pair_means[r['pair']].append(r['yards'])
            contexts[cell][arm] = {'n': len(rows), 'meanOffenseYards': average([r['yards'] for r in rows]),
                'attempts': sum(r['attempted'] for r in rows), 'completions': sum(r['completed'] for r in rows),
                'yacN': len(catches), 'meanYac': average(catches), 'yac15': sum(r.get('explosiveYac', 0) for r in rows),
                'pairedDeltaYards': average([average(v) for v in deltas.values()]),
                'pairedDeltaYardsCI95': interval([average(v) for v in deltas.values()]),
                'perPairMeanYards': {k: average(v) for k, v in pair_means.items()}}
    pooled = {}
    for arm in ['balance+25', 'tackling+15']:
        deltas = collections.defaultdict(list)
        for r in context_rows:
            if r['arm'] == arm:
                deltas[r['pair']].append(r['yards'] - base[r['pair'], r['cell'], r['rep']]['yards'])
        pooled[arm] = {'pairedDeltaYards': average([average(v) for v in deltas.values()]),
            'pairedDeltaYardsCI95': interval([average(v) for v in deltas.values()])}

    games = reports['games']['rows']
    catches = sum(r['catches'] for r in games)
    pair_games = collections.defaultdict(list)
    for r in games:
        pair_games[r['pair']].append(r)
    pair_results = {pair: {'catches': sum(r['catches'] for r in rows),
        'meanYac': sum(r['yac']['mean'] * r['catches'] for r in rows) / sum(r['catches'] for r in rows),
        'yac15Rate': sum(r['explosiveYac'] for r in rows) / sum(r['catches'] for r in rows),
        'pointsPerTeamGame': average([r['pointsPerTeam'] for r in rows])} for pair, rows in pair_games.items()}
    game_raw = load(args.input / 'games.raw.json.gz')
    energies = [a['energy'] for snap in game_raw['snaps'] for a in snap['agents']]
    actual_slots = {slot: dict(collections.Counter(a['position'] for snap in game_raw['snaps'] for a in snap['agents'] if a['slot'] == slot))
        for slot in ['FS', 'SS', 'NB', 'DB', 'RT', 'DT_W', 'DT_S']}

    native = reports['native']['rows']
    originals = {r['id']: r for r in native if r['arm'] == 'original'}
    after_catch = []
    for r in native:
        if r['stage'] == 'after-catch':
            b = originals[r['id']]
            after_catch.append({**r, 'originalYac': b['yac'], 'originalOutcome': b['outcome'], 'deltaYac': r['yac'] - b['yac']})
    summary = {'baselineCommit': reports['profiles']['metadata']['commit'], 'source': next(iter(sources)),
        'node': reports['profiles']['metadata']['node'], 'flags': reports['profiles']['metadata']['flags'],
        'provenance': {m: {**r['metadata'], 'summaryFileSha256': hashlib.sha256(paths[m].read_bytes()).hexdigest()} for m, r in reports.items()},
        'counts': {'teams': profiles['teams'], 'players': profiles['players'], 'selectionAppearances': profiles['exposures'],
            'qualitySweepPlayers': reports['quality']['players'], 'encounters': len(encounter_rows), 'forcedContextSnaps': len(context_rows),
            'games': len(games), 'gameFieldSnaps': len(game_raw['snaps']), 'officialScrimmagePlays': sum(r['plays'] for r in games),
            'fieldAppearances': len(energies), 'nativeOriginalsVerified': sum(r['originalVerified'] for r in native),
            'nativeCatchPrefixesVerified': sum(r['catchPrefixVerified'] for r in native)},
        'selectedAtStrength055': selected, 'nickelSlotsAtStrength055': slots,
        'selectionFailures': dict(collections.Counter(f"{x['condition']}/{x['package']}" for x in profiles['selectionFailures'])),
        'correlationsAtStrength055': profiles['correlations'], 'unitDistributions': profiles['unitDistributions'],
        'qualityPairedDeltas': {p: {k: reports['quality']['paired'][p][k] for k in ['balance', 'strength', 'vmax', 'power', 'brake', 'stepSpeed']} for p in positions},
        'encounters': encounter_summary, 'contexts': contexts, 'pooledContextChanges': pooled,
        'games': {'catches': catches, 'meanYac': sum(r['yac']['mean'] * r['catches'] for r in games) / catches,
            'yac15Rate': sum(r['explosiveYac'] for r in games) / catches,
            'pointsPerTeamGame': average([r['pointsPerTeam'] for r in games]), 'pairs': pair_results,
            'energyMin': min(energies), 'energyMean': average(energies), 'appearancesBelow08': sum(e < .8 for e in energies),
            'listedPositionsBySlot': actual_slots},
        'nativePostCatch': after_catch,
        'uncertainty': '10,000 bootstrap draws resample 12 independent roster-pair averages. Exploratory percentile intervals; no multiplicity correction. Completions and YAC are reported separately. Escapes end the staged observation early, so mean encounter advance is not a matched-duration outcome.'}
    summary['validation'] = {}
    for name in ['final-typecheck', 'final-build', 'final-tests']:
        receipt_path = args.input / f'{name}-receipt.json'
        if receipt_path.exists():
            receipt = load(receipt_path)
            if receipt['exitCode'] or not receipt['inputsUnchanged'] or receipt['sourceSha256'] not in sources:
                raise ValueError(f'Failed or mismatched validation receipt: {receipt_path}')
            summary['validation'][name] = {k: receipt[k] for k in ['node', 'sourceSha256', 'validationSha256', 'inputsUnchanged', 'commands', 'exitCode']}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=2) + '\n')
    print(f'Wrote {args.out}')
    print(json.dumps(summary['counts']))
    if args.plot:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(1, 3, figsize=(14, 4.5), layout='constrained')
        ps = ['RB', 'WR', 'TE', 'LB', 'CB', 'S']
        colors = ['#346a8a'] * 3 + ['#c27337'] * 3
        vals = [selected[p]['balance']['p50'] for p in ps]
        axes[0].bar(ps, vals, color=colors)
        axes[0].set(title='Selected balance ratings', ylabel='Median rating', ylim=(0, 100))
        for i, value in enumerate(vals):
            axes[0].text(i, value + 2, f'{value:.0f}', ha='center')
        for key, label, color in [('brake', 'Braking', '#346a8a'), ('stepSpeed', 'Recovery stepping', '#c27337')]:
            axes[1].plot(ps, [selected[p][key]['p50'] / selected['WR'][key]['p50'] for p in ps], 'o-', label=label, color=color)
        axes[1].axhline(1, color='#aaa', lw=.8)
        axes[1].set(title='Derived movement capacities', ylabel='Ratio to WR median', ylim=(.7, 1.1))
        axes[1].legend(frameon=False, fontsize=9)
        for pair, rows in pair_games.items():
            axes[2].scatter([pair + 1] * len(rows), [r['yac']['mean'] for r in rows], color='#999', s=30)
            axes[2].scatter(pair + 1, pair_results[pair]['meanYac'], color='#346a8a', s=60, marker='_')
        axes[2].set(title='YAC across independent rosters', xlabel='Roster pair (two game seeds)', ylabel='YAC per reception, yd', ylim=(0, 18), xticks=range(1, 9))
        fig.suptitle('Roster audit • pinned 4ded6b6 baseline • diagnostic samples', fontsize=14)
        fig.savefig(args.input / 'roster-audit.png', dpi=180)
        plt.close(fig)


if __name__ == '__main__':
    main()
