import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [setFile, id, ...ts] = process.argv.slice(2);
const p = (deserialize(readFileSync(setFile)) as any[]).find(q => q.id === id);
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
console.log('dir', sim.attackDir('O'), 'los', sim.los);
const want = ts.map(Number);
while (sim.phase === 'live' && sim.t < Math.max(...want) + 1e-6) { sim.tick();
  if (want.some(t => Math.abs(sim.t - t) < 1e-6)) console.log(sim.t.toFixed(2), ['RT','RG','DT_S','LB_M','DE_W','RB','C','DT_W'].map(s => { const a = sim.slot(s); return `${s}(${a.pos.x.toFixed(2)},${a.pos.y.toFixed(2)} v ${a.body.vel.x.toFixed(1)},${a.body.vel.y.toFixed(1)})`; }).join(' ')); }
