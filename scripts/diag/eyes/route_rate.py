"""QB lane: targets per route run, by route, on sim exports and BDB 2025 player_play (NFL). For a route (default
corner): routes run, targeted, per-route rate, share of all targets, completion, yards a target, interceptions.
usage: python3 -I route_rate.py [--route corner] [--nfl <bdb2025 dir>] name=a.jsonl.gz,... """
import sys, gzip, json, csv
args = sys.argv[1:]; route = 'corner'; nfl = None
if '--route' in args: i = args.index('--route'); route = args[i + 1]; del args[i:i + 2]
if '--nfl' in args: i = args.index('--nfl'); nfl = args[i + 1]; del args[i:i + 2]
def row(name, run, tg, cm, yd, it, tot):
    print(f"{name:12s} {route}: run {run:5d} | targeted {tg:4d} = {100 * tg / max(1, run):4.1f}% per route, {100 * tg / max(1, tot):3.1f}% of {tot} targets | complete {100 * cm / max(1, tg):3.0f}% | {yd / max(1, tg):4.1f} yd/target | INT {it}")
if nfl:
    P = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{nfl}/plays.csv'))}
    run = tg = cm = it = tot = 0; yd = 0.0
    for r in csv.DictReader(open(f'{nfl}/player_play.csv')):
        t = r['wasTargettedReceiver'] == '1'; tot += t
        if r['routeRan'] != route.upper(): continue
        run += 1
        if t:
            tg += 1; cm += r['hadPassReception'] == '1'; yd += float(r['receivingYards'] or 0)
            it += 'INTERCEPTED' in P[(r['gameId'], r['playId'])]['playDescription'].upper()
    row('NFL', run, tg, cm, yd, it, tot)
for arg in args:
    name, paths = arg.split('=', 1); run = tg = cm = it = tot = 0; yd = 0.0
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r.get('kind') != 'pass': continue
            thrown = r['events'].get('pass_forward') is not None and not (r.get('labels') or {}).get('throwaway'); t = r.get('target')
            if thrown and t is not None: tot += 1
            for i, p in enumerate(r['players']):
                if route not in str(p.get('route') or '').split(':'): continue
                run += 1
                if thrown and t == i:
                    tg += 1; c = r.get('receiver') == i; cm += c; yd += r['yards'] if c else 0; it += bool((r.get('labels') or {}).get('interception'))
    row(name, run, tg, cm, yd, it, tot)
