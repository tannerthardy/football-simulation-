"""The NFL comparison population for the pass operators: drop-back passes.

A BDB 2025 play is kept when it is a dropback (isDropback) and none of these holds, checked in this order (the
first that applies is the reason it goes):
- spike, kneel or sneak; nullified by penalty;
- play action (playAction);
- a run-pass option (pff_runPassOption = 1);
- a designed rollout or designed run (dropbackType DESIGNED_*); a scramble out of a normal drop stays;
- a screen: any player's routeRan is SCREEN.
"""
import csv, collections as C

def nfl_population(D):
    """Returns ({(gameId, playId): reason}, Counter of reasons). reason 'keep' = a drop-back pass."""
    screens = set()
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        if r['routeRan'] == 'SCREEN': screens.add((r['gameId'], r['playId']))
    out = {}; n = C.Counter()
    for r in csv.DictReader(open(f'{D}/plays.csv')):
        if r['isDropback'] not in ('TRUE', 'True'): continue
        k = (r['gameId'], r['playId'])
        if r['qbSpike'] in ('TRUE', 'True') or r['qbKneel'] in ('1', 'TRUE', 'True') or r['qbSneak'] in ('1', 'TRUE', 'True') or r['playNullifiedByPenalty'] == 'Y':
            why = 'spike/kneel/sneak/nullified'
        elif r['playAction'] in ('TRUE', 'True'): why = 'play action'
        elif r['pff_runPassOption'] == '1': why = 'run-pass option'
        elif r['dropbackType'].startswith('DESIGNED'): why = 'designed rollout/run'
        elif k in screens: why = 'screen'
        else: why = 'keep'
        out[k] = why; n[why] += 1
    return out, n

if __name__ == '__main__':
    import sys
    _, n = nfl_population(sys.argv[1])
    tot = sum(n.values())
    for k, v in n.most_common(): print(f'{k:30} {v:6} {100 * v / tot:5.1f}%')
