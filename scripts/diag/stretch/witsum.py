"""Summarise selected witnesses (scripts/diag/stretch/witness.ts output):
result; exchange (handoff time, back speed and depth past the line, closest
back-QB distance before it); first carrier contact; every wrap, broken and
missed tackle with the carrier's speed and depth at that sampled tick.
Depth is yards past the line of scrimmage in the attack direction; carrier
speed and depth are printed only inside the witness window.
usage: witsum.py WITNESS.json|BUNDLE.json ... (a bundle from witnesses.sh)"""
import json, math, sys

# Flags printed are those differing from the pinned profile.
PROFILE = json.load(open('config/baseline.json'))['flags']

def witnesses(paths):
    for path in paths:
        data = json.load(open(path))
        if 'witnesses' in data:
            yield from ((row['name'], row['witness']) for row in data['witnesses'])
        else:
            yield path.split('/')[-1][:-5], data

for name, w in witnesses(sys.argv[1:]):
    los, ad = w['los'], w['attackDir']
    ticks = w['ticks']
    def at(t, slot):
        row = min(ticks, key=lambda k: abs(k['t'] - t))
        return row['actors'].get(slot)
    depth = lambda a: round((a['pos'][0] - los) * ad, 2)
    speed = lambda a: round(math.hypot(*a['vel']), 2)
    flags = ' '.join(f'{k}={v}' for k, v in sorted(w['flags'].items()) if k in PROFILE and v != PROFILE[k])
    print(f"{name}  {w['case']}  {w['commit'][:8]}  [{flags or 'defaults'}]  gain {w['result']['gain']} {w['result']['outcome']}")
    hand = next((e for e in w['events'] if e['type'] == 'handoff'), None)
    if hand and ticks[0]['actors'].get('QB') and ticks[0]['actors'].get('RB'):
        pre = [k for k in ticks if k['t'] <= hand['t'] + 1e-9]
        close = min((math.dist(k['actors']['RB']['pos'], k['actors']['QB']['pos']), k['t']) for k in pre)
        rb = at(hand['t'], 'RB')
        print(f"  handoff t {hand['t']}  back {speed(rb)} yd/s depth {depth(rb)}  closest back-QB {close[0]:.2f} yd at t {close[1]}")
    elif ticks[0]['actors'].get('QB'):
        keep = next((k['t'] for k in ticks if k['actors']['QB']['behavior'] == 'carrier'), None)
        rb = [k for k in ticks if k['actors'].get('RB')]
        close = min((math.dist(k['actors']['RB']['pos'], k['actors']['QB']['pos']), k['t']) for k in rb)
        print(f"  no handoff; QB carrier from t {keep}  closest back-QB {close[0]:.2f} yd at t {close[1]}")
    first = next((e for e in w['events'] if e['type'] == 'carrier_contact'), None)
    if first:
        c = at(first['t'], first['a']) if first['t'] <= w['window'][1] else None
        print(f"  first carrier contact t {first['t']} by {first['b']} ({first['note']})" + (f"  carrier {speed(c)} yd/s depth {depth(c)}" if c else ''))
    for e in w['events']:
        if e['type'] in ('tackle_wrap', 'broken_tackle', 'missed_tackle', 'tackle', 'shed', 'touchdown'):
            carrier = e['b'] if e['type'] in ('tackle_wrap', 'tackle') else e['a']
            c = at(e['t'], carrier) if carrier else None
            info = f"  carrier {speed(c)} yd/s depth {depth(c)}" if c and e['t'] <= w['window'][1] else ''
            print(f"    t {e['t']:5.2f} {e['type']:<13} {e['a']}->{e['b']} {e['note'] or ''}{info}")
