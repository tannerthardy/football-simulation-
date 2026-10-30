import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const p = (deserialize(readFileSync('out/run/restage/seed11.bin')) as any[]).find(q => q.id === 'G1-P112');
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
const lg = sim.slot('LG'), dt = sim.slot('DT_S');
while (sim.t < 1.6) { sim.tick(); if (Math.round(sim.t * 20) % 2) continue; if (sim.t < 1.0) continue;
  const near = sim.offense.filter((o: any) => o !== lg).map((o: any) => { const lx = dt.pos.x - lg.pos.x, ly = dt.pos.y - lg.pos.y, l2 = lx*lx+ly*ly; const u = Math.max(0, Math.min(1, ((o.pos.x-lg.pos.x)*lx+(o.pos.y-lg.pos.y)*ly)/l2));
    return { s: o.slot, d: Math.hypot(lg.pos.x+u*lx-o.pos.x, lg.pos.y+u*ly-o.pos.y) - lg.profile.radius - o.profile.radius, eng: o.engagement?.defender.slot }; }).filter((q: any) => q.d < 0.3);
  console.log(sim.t.toFixed(2), 'LG', (lg.pos.x - sim.los).toFixed(2), lg.pos.y.toFixed(2), 'DT_S', (dt.pos.x - sim.los).toFixed(2), dt.pos.y.toFixed(2), 'eng', dt.engagement?.blocker.slot ?? '-', JSON.stringify(near)); }
