/** Zone combination releases (block_climb by a member with a planned backer): release time, time until he is 2 yd
 * from the released DL ("clear"), the lag, his speed at release and at clear, and whether any departure tick was a
 * detour around the keeper / unvalidated brake. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const rows: any[] = [];
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/zone/i.test(sim.offCall.run?.scheme ?? '') || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const open = new Map<any, any>(); let seenEv = 0;
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    const fresh = sim.events.slice(seenEv); seenEv = sim.events.length;
    for (const ev of fresh.filter((e: any) => e.type === 'block_climb')) {
      const a = sim.agents[ev.a], b: any = a.behavior; const dl = b.plan.departure?.defender;
      if (dl && !open.has(a)) open.set(a, { t0: sim.t, dl, v0: a.speed, keeperDetour: false, brake: false, sch: sim.offCall.run.scheme });
    }
    for (const [a, r] of open) {
      const b: any = a.behavior, acc = b.departureAccess;
      if (acc?.kind === 'detour' && b.plan.departure && sim.agents[acc.plan.obstacle] === b.plan.departure.keeper) r.keeperDetour = true;
      if (acc?.kind === 'unvalidated' && Math.hypot(acc.command.vel.x, acc.command.vel.y) < 1e-6) r.brake = true;
      if (Math.hypot(a.pos.x - r.dl.pos.x, a.pos.y - r.dl.pos.y) >= 2) { rows.push({ ...r, lag: sim.t - r.t0, v1: a.speed }); open.delete(a); }
      else if (sim.t - r.t0 > 1.5) { rows.push({ ...r, lag: NaN, v1: a.speed }); open.delete(a); }
    }
  }
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
for (const [lab, f] of [['all', (r: any) => true], ['keeper detour', (r: any) => r.keeperDetour], ['brake', (r: any) => r.brake], ['neither', (r: any) => !r.keeperDetour && !r.brake]] as const) {
  const g = rows.filter(f); if (!g.length) continue;
  console.log(`${lab.padEnd(14)} n ${String(g.length).padStart(3)} (${(g.length / rows.length).toFixed(2)}) | release ${med(g.map(r => r.t0))} s | to 2 yd clear ${med(g.map(r => r.lag))} s (never in 1.5 s: ${g.filter(r => !Number.isFinite(r.lag)).length}) | speed at release ${med(g.map(r => r.v0))} -> at clear ${med(g.map(r => r.v1))}`);
}
