#!/usr/bin/env python3
"""Optional, bounded diagnostics. Never edits the checkout's runtime.

Restore the receipt's two evidence bundles and input capsules first. The shared
Physics restorer is copied byte-for-byte; it rejects unsaved constructor inputs.
Run via scripts/baseline.mjs. See the paired memo for provenance and budgets.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/flex-three-probes'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace(path, old, new):
    text = path.read_text()
    assert text.count(old) == 1, (path, old, text.count(old))
    path.write_text(text.replace(old, new))


def prepare(arm):
    host = OUT / 'hosts' / arm
    assert not host.exists(), f'Refusing to overwrite diagnostic host {host}'
    shutil.copytree(ROOT / 'src', host / 'src')
    shared = host / 'out/catch-opportunity-physics'
    shared.mkdir(parents=True)
    restorer = OUT / 'physics/out/catch-opportunity-physics/reconstruct.ts'
    shutil.copyfile(restorer, shared / 'reconstruct.ts')
    for folder in ('packet', 'audit', 'selected'):
        (shared / folder).symlink_to(OUT / 'capsules' / folder, target_is_directory=True)
    shutil.copyfile(ROOT / 'scripts/diag/flex-three-probes.ts.template', shared / 'flex-runner.ts')
    (host / 'scripts').mkdir()
    shutil.copyfile(ROOT / 'scripts/source-version.ts', host / 'scripts/source-version.ts')
    # Passive snapshots: no perception queries, controller calls or random draws.
    play = host / 'src/sim/playsim.ts'
    replace(play, '    spaceTeammates(this.agents, this.intents, (a,b)=>{',
            "    (globalThis as any).__flexStage?.(this, 'pre-space');\n    spaceTeammates(this.agents, this.intents, (a,b)=>{")
    replace(play, '    },{now:t,constrained});',
            "    },{now:t,constrained});\n    (globalThis as any).__flexStage?.(this, 'post-space');")
    man = host / 'src/sim/behaviors/defense.ts'
    replace(man, '    const tgt = { x: tx, y: ty };',
            "    const tgt = { x: tx, y: ty };\n    (globalThis as any).__flexMan?.({t:sim.t,a:a.idx,target:R.idx,cue,seen,tgt,releaseObserved:this.releaseObserved,hipsOpen:this.hipsOpen,opts:o});")
    if arm == 'pool':
        block = host / 'src/sim/behaviors/blocking.ts'
        replace(block, '  const stalkTargets = new Map<Agent, Agent | null>();', '''  const stalkTargets = new Map<Agent, Agent | null>();
  // Diagnostic admission of the two nominated, initially aligned perimeter
  // bodies. Do not steal an existing lineman/inline/lead/combo responsibility.
  // This is an assignment-pool probe, not a universal defender classifier.
  const owned = new Set([...plans.values()].flatMap(p => [p.target, p.climbTo]).filter(Boolean));
  const admitted = dl.filter(d => (d.slot === 'CB_S' || d.slot === 'NB') && !owned.has(d));''')
        replace(block, '    const open = [...db, ...lb.filter((l) => !claimedLB.has(l))];',
                '    const open = [...db, ...lb.filter((l) => !claimedLB.has(l)), ...admitted];')
        replace(block, '      for (const d of [...db, ...lb]) {',
                '      for (const d of [...db, ...lb, ...admitted]) {')
    elif arm == 'roof':
        replace(man, '      tx = seen.pos.x + top;', '''      // Diagnostic: retain only the already-computed unreleased C3 roof.
      const installedCorner = (a.behavior as { rule?: string }).rule === 'c3_corner';
      tx = installedCorner && !this.releaseObserved ? Math.max(tx, seen.pos.x + top) : seen.pos.x + top;''')
    elif arm == 'trace':
        receiver = host / 'src/sim/behaviors/receiver.ts'
        replace(receiver, '    if (tt <= s.t - sim.t) return { p, t: s.t, z: s.z };', '''    if (tt <= s.t - sim.t) {
      const selected = {p,t:s.t,z:s.z};
      (globalThis as any).__flexWindow?.({t:sim.t,a:a.idx,kind:'reachable',selected,tt});
      return selected;
    }''')
        replace(receiver, '  return last;\n}\n\n/** After the catch', '''  (globalThis as any).__flexWindow?.({t:sim.t,a:a.idx,kind:'fallback',selected:last});
  return last;
}

/** After the catch''')
        replace(receiver, '    const target = { x: spot.p.x + this.err.x, y: spot.p.y + this.err.y };', '''    const target = { x: spot.p.x + this.err.x, y: spot.p.y + this.err.y };
    (globalThis as any).__flexWindow?.({t:sim.t,a:a.idx,kind:'tracking-request',spot,err:this.err,target});''')
        catching = host / 'src/sim/catching.ts'
        replace(catching, '  if (rng.chance(pCatch)) {', '''  (globalThis as any).__flexDecision?.({t:sim.t,a:R.idx,s:o.s,dh:o.dh,z:o.z,
    stretch,chest,high,low,trackPen,shoulder,ballSpeed,airTime,diff,hands,pCatch,
    bestD:bestD?.idx??null,bestQ,deflected:!!ball.deflected,
    opps:opps.map(p=>({a:p.a.idx,s:p.s,dh:p.dh,z:p.z}))});
  if (rng.chance(pCatch)) {''')
        replace(catching, '  f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: vz };', '''  (globalThis as any).__flexFlight?.({t:sim.t,kind,keep,oldVel:{...f.vel},
    newVel:{x:vx*c-vy*s,y:vx*s+vy*c,z:vz},pos:{...f.pos},target:ball.target?.idx??null,
    deflectedBefore:!!ball.deflected,reason:'deflect() called; no independent touch result exists'});
  f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: vz };''')
    elif arm != 'base':
        raise ValueError(arm)
    (host / 'preparation.json').write_text(json.dumps({
        'arm': arm, 'restorerSha256': digest(restorer),
        'runnerSha256': digest(ROOT / 'scripts/diag/flex-three-probes.ts.template'),
        'preparerSha256': digest(Path(__file__)),
        'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'edits': {str(p.relative_to(host)): digest(p) for p in [play, man, host / 'src/sim/behaviors/blocking.ts']},
    }, indent=2) + '\n')
    return host


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prepare', action='store_true')
    p.add_argument('--arm', choices=('base', 'pool', 'roof', 'trace'), default='base')
    p.add_argument('--check', action='store_true')
    p.add_argument('--ids', nargs='+', required=True)
    args = p.parse_args()
    allowed = {'base': {'G1-P018', 'G1-P056', 'G1-P117', 'G1-P027', 'G1-P192', 'G1-P009', 'G1-P064'},
               'pool': {'G1-P018', 'G1-P056', 'G1-P117'},
               'roof': {'G1-P027', 'G1-P192'}, 'trace': {'G1-P020', 'G1-P009', 'G1-P080'}}
    assert set(args.ids) <= allowed[args.arm], 'Outside the declared diagnostic cases'
    assert args.check or 'G1-P064' not in args.ids, 'P064 exact restoration is held; use saved film only'
    host = prepare(args.arm) if args.prepare else OUT / 'hosts' / args.arm
    mode = 'construct' if args.check else 'run'
    # The archived first runner used 'check'. Its shared restorer also does
    # constructor-only work in that mode; neither path should execute a tick.
    if args.check and "mode==='check'" in (host / 'out/catch-opportunity-physics/flex-runner.ts').read_text():
        mode = 'check'
    subprocess.run(['node', '--import', 'tsx', 'out/catch-opportunity-physics/flex-runner.ts', mode, *args.ids],
                   cwd=host, check=True, timeout=60)


if __name__ == '__main__':
    main()
