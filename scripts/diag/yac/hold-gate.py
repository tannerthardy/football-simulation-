"""Holder gate for the friction-ellipse arbitration (hold-trace-loco.mts output, flag off vs on).
usage: python3 -I scripts/diag/yac/hold-gate.py OFF.json ON.json"""
import json, sys, numpy as np
def summarize(path):
    B = json.load(open(path)); out = {}
    H = [h for b in B for r in b['rows'] if r['t'] >= 0.15 for h in r['H'] if h['sup'] == 'up' and h.get('L')]
    d = np.array([h['dGround'] for h in H])
    brk = [h for h in H if h['L']['rq'] is not None and h['L']['rq'] - h['dsp'] < -1]
    out['ticks'] = len(H); out['mean'] = d.mean(); out['median'] = np.median(d); out['pos'] = (d > 0).mean()
    out['brake_n'] = len(brk); out['brake_median'] = np.median([h['dGround'] for h in brk]); out['brake_p25'] = np.percentile([h['dGround'] for h in brk], 25)
    sh = [abs(h['L']['at1']) / max(h['L']['At'], 1e-9) for h in brk]
    out['at_share'] = np.median(sh); out['at_share_p75'] = np.percentile(sh, 25)
    def cs_at(t):
        v = []
        for b in B:
            rows = [r for r in b['rows'] if abs(r['t'] - t) < 0.06]
            if rows: v.append(rows[0]['cs'])
        return (np.mean(v) if v else float('nan')), len(v)
    out['cs05'] = cs_at(0.5); out['cs10'] = cs_at(1.0); out['bonds'] = len(B)
    alive = [b for b in B if b['rows'][-1]['t'] >= 0.95]
    out['alive'] = len(alive) / len(B); out['moving1'] = np.mean([b['rows'][-1]['cs'] > 2 for b in alive]) if alive else float('nan')
    out['v0'] = np.mean([b['v0'] for b in B])
    return out
for name, p in zip(('off', 'on'), sys.argv[1:3]):
    o = summarize(p)
    print(f"{name:3s} bonds {o['bonds']} (carrier entry {o['v0']:.2f}) | upright holder ticks {o['ticks']}: turf force along the run mean {o['mean']:.0f} median {o['median']:.0f}, positive {o['pos']:.0%}; "
          f"braking ticks {o['brake_n']}: median {o['brake_median']:.0f}, p25 {o['brake_p25']:.0f}, braking kept {o['at_share']:.2f} of At (worst quartile {o['at_share_p75']:.2f}) | "
          f"carrier speed at 0.5 s {o['cs05'][0]:.2f} (n {o['cs05'][1]}), 1.0 s {o['cs10'][0]:.2f} (n {o['cs10'][1]}); bonds alive at 1 s {o['alive']:.0%}, of those carrier above 2 yd/s {o['moving1']:.0%}")
