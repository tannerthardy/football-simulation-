import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const plays = [...JSON.parse(readFileSync('/home/user/fs-rel/out/matched-restage/seed7.json', 'utf8')), ...JSON.parse(readFileSync('/home/user/fs-rel/out/matched-restage/seed8.json', 'utf8'))];
const p = plays[Number(process.argv[2])]; const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const D = sim.slot(process.argv[3]);
sim.event('snap', sim.slot('C')); let last = ''; const dir = sim.attackDir('O');
while (sim.phase === 'live' && sim.t < 2.7) { sim.tick();
  const e = sim.engagements.find((x: any) => x.defender === D);
  const s = e ? `${e.blocker.slot}${e.helpers.length ? '+' + e.helpers.map((h: any) => h.slot).join('+') : ''}` : 'free';
  if (s !== last || Math.abs(sim.t * 4 - Math.round(sim.t * 4)) < 1e-6) { console.log(sim.t.toFixed(2), s, `DT depth ${((D.pos.x - sim.los) * dir).toFixed(2)} y ${D.pos.y.toFixed(2)}`); last = s; } }
