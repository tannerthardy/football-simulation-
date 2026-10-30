/** IZ combo releases: for each climber, every 0.1 s after his release until he is 1.5 yd off the DL (max 1.2 s):
 * plan kind/target, distance to DL, cmd speed and direction vs the backer, achieved speed, joints on him (with whom),
 * World contacts, his engagement. Aggregates the per-tick causes, prints a few examples. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const seeds = process.argv.slice(2), tally: Record<string, number> = {}; let ex = 0, rels = 0;
const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|splitZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const combos = new Set<any>(sim.offense.map((o: any) => o.behavior?.plan?.combination).filter(Boolean));
  const watch = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    for (const cb of combos) if (cb.released && !watch.has(cb)) {
      const climber = cb.members.find((m: any) => m.behavior?.plan?.kind === 'climb') ?? cb.members.find((m: any) => m.engagement?.defender !== cb.defender);
      watch.set(cb, { climber, t0: sim.t, done: false, lines: [] as string[] }); rels++;
    }
    for (const [cb, w] of watch) {
      if (w.done || !w.climber) continue;
      const c = w.climber, d = cb.defender, dt = sim.t - w.t0;
      const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
      if (dd >= 1.5 || dt > 1.2) { w.done = true; if (dt > 0.8 && ex < 0) { ex++; console.log(`${sim.offCall.run.scheme} ${c.slot} off ${d.slot}, released ${w.t0.toFixed(2)}`); console.log(w.lines.join('\n')); } continue; }
      if (Math.round(dt * 100) % 10 !== 0) continue;
      const b: any = c.behavior, plan = b?.plan, tgt = plan?.target, cmd = sim.intents[c.idx].vel;
      const joints = sim.world.joints.filter((j: any) => (j.a === c.body || j.b === c.body) && !(j.kind === 'grasp' && j.broken))
        .map((j: any) => j.kind + ':' + sim.agents.find((x: any) => x.body === (j.a === c.body ? j.b : j.a))?.slot);
      const cons = (sim.lastStep?.contacts ?? []).filter((x: any) => x.i === c.idx || x.j === c.idx).map((x: any) => sim.agents[x.i === c.idx ? x.j : x.i].slot);
      const toT = tgt ? Math.atan2(tgt.pos.y - c.pos.y, tgt.pos.x - c.pos.x) : 0, cmdA = Math.atan2(cmd.y, cmd.x);
      const off = tgt ? Math.abs(Math.atan2(Math.sin(cmdA - toT), Math.cos(cmdA - toT))) * 180 / Math.PI : -1;
      const eng = c.engagement ? `eng:${c.engagement.blocker === c ? 'own' : 'help'}:${c.engagement.defender.slot}` : '';
      const why = eng ? 'still engaged' : joints.length ? 'joint ' + joints.join(',') : cons.includes(d.slot) ? 'touching DL body' : Math.hypot(cmd.x, cmd.y) < 2 ? 'slow request' : off > 60 ? 'request not toward target' : 'free, moving';
      add(why); if (plan?.kind) add('plan ' + plan.kind);
      if (why === 'touching DL body') {
        const ux = (d.pos.x - c.pos.x) / dd, uy = (d.pos.y - c.pos.y) / dd, mag = Math.hypot(cmd.x, cmd.y) || 1e-9;
        const into = (cmd.x * ux + cmd.y * uy) / mag;
        // where is the DL relative to the climber's straight line to his target?
        const tx = tgt ? (tgt.pos.x - c.pos.x) : 1, ty = tgt ? (tgt.pos.y - c.pos.y) : 0, tl = Math.hypot(tx, ty) || 1;
        const block = (ux * tx + uy * ty) / tl;
        add(`touch: request into DL ${into > .5 ? '>0.5' : into > .2 ? '0.2-0.5' : into > 0 ? '0-0.2' : '<=0 (away)'}`);
        add(`touch: DL ${block > .5 ? 'ahead on line to target' : block > 0 ? 'off to side ahead' : 'behind/beside'}`);
        add(`touch: DL moving with climber ${(d.vel.x * c.vel.x + d.vel.y * c.vel.y) / Math.max(1e-6, Math.hypot(c.vel.x, c.vel.y) ** 2) > .5 ? 'yes' : 'no'}`);
        const cmdRaw = sim.cmds[c.idx].vel; const rawInto = (cmdRaw.x * ux + cmdRaw.y * uy) / (Math.hypot(cmdRaw.x, cmdRaw.y) || 1e-9);
        const DR = sim.intents[d.idx].vel, cv = Math.hypot(c.vel.x, c.vel.y) || 1e-9;
        const dlAlong = (DR.x * c.vel.x + DR.y * c.vel.y) / cv; // DL's own request along the climber's motion
        add(`touch: DL request along climber motion ${dlAlong > 1 ? '>1 (DL goes with him)' : dlAlong > 0.3 ? '0.3-1' : dlAlong > -0.3 ? '~0' : '<-0.3 (DL resists)'}`);
        const dlOwn = d.engagement ? (d.engagement.blocker === c ? 'climber' : d.engagement.blocker.slot === c.slot ? 'climber' : 'keeper/other') : 'none';
        add(`touch: DL engaged with ${dlOwn}`);
        const dvAlong = (d.vel.x * c.vel.x + d.vel.y * c.vel.y) / cv;
        add(`touch: DL achieved along climber ${dvAlong > 1 ? '>1' : dvAlong > .3 ? '0.3-1' : '<0.3'}`);
        const bh: any = c.behavior;
        const phase = bh.plan?.departure ? `departure/${bh.departureAccess?.kind ?? 'none'}${bh.departureStrikeClear ? '/strikeclear' : ''}` : bh.climbAccess ? 'climb/detour' : 'climb/direct';
        add(`touch: phase ${phase}${rawInto > .2 ? ' INTO' : ''}`);
        add(`touch: behaviour cmd into DL ${rawInto > .2 ? '>0.2' : rawInto > 0 ? '0-0.2' : '<=0'}`);
      }
      w.lines.push(`  +${dt.toFixed(1)} ${plan?.kind}->${tgt?.slot} dDL ${dd.toFixed(2)} cmd ${Math.hypot(cmd.x, cmd.y).toFixed(1)} (${off.toFixed(0)} deg off target) v ${Math.hypot(c.vel.x, c.vel.y).toFixed(1)} ${eng} ${joints.join(',')} contacts ${cons.join(',')} | ${why}`);
    }
  }
}
console.log(`IZ releases ${rels}; per-0.1 s samples while still within 1.5 yd of the DL:`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
