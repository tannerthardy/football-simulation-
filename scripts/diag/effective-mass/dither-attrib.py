"""Which players, plays and draws add the reversed re-aims of one dither row, between two arms of the panel (logs written by test/dither-attrib.test.ts
on a tree whose dither-core pushes to globalThis.__ditherLog). usage: dither-attrib.py A.json B.json CONTROLLER STAGE   (e.g. coverage containment)"""
import json, sys, collections as C
PASS = ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']
RUNS = ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']
SCR = ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood']
panel = [(r, s) for r in RUNS for s in range(1, 6)] + [(p, s) for p in PASS for s in range(1, 6)] + \
        [(p, s) for p in SCR for s in range(1, (11 if 'screen' in p else 6))]
assert len(panel) == 135
label = lambda n: (f"draw{(n - 1) // 135}", *panel[(n - 1) % 135])
def load(p, g, st):
    d = json.load(open(p)); rows = [r for r in d['log'] if r['g'] == g and r['src'] == st]
    return d, rows
if __name__ == '__main__':
    g, st = sys.argv[3], sys.argv[4]
    for name in sys.argv[1:3]:
        d, rows = load(name, g, st)
        rev = [r for r in rows if r['k'] == 'rev']; re_ = [r for r in rows if r['k'] == 'reaim']
        mov = sum(x['controller'][g]['moving'] for x in d['rates'] if g in x['controller'])
        print(f"== {name.split('/')[-1]}: {g} / {st}: re-aims {len(re_)}, reversed {len(rev)}, {g} moving {mov:.0f} s -> {len(rev)/mov:.4f}/s; reversed per re-aim {len(rev)/max(1,len(re_)):.2f}")
        print('   by draw', dict(C.Counter(label(r['play'])[0] for r in rev)))
        print('   by slot (reversed)', dict(C.Counter(r['slot'] for r in rev).most_common(8)))
        pl = C.Counter(label(r['play'])[1:] for r in rev)
        print('   plays with >=3 reversed', [(k, v) for k, v in pl.most_common(8) if v >= 3], ' plays touched', len(pl))
        pp = C.Counter((label(r['play'])[0], label(r['play'])[1:], r['slot']) for r in rev)
        print('   player-plays with >=3', [(k, v) for k, v in pp.most_common(6) if v >= 3])
