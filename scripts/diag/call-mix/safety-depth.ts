// Second safety on called two-high coverages: where his depth comes from. On the matched panel (seeds 7 and 11
// x 4 dice shifts), for every dropback whose call shows two-high (cov.look ?? cov.shell), log for each safety
// (SS, FS) and for the deepest two DBs: installed spot depth, the team habit (safetyDepth) and SITU_DEPTH's
// change for this snap, his depth when the play is built (before pre-snap movement), at the snap (first live
// tick) and 0.5 s / 1.0 s after it. Passive: reads positions only.
//   node --import tsx scripts/diag/call-mix/safety-depth.ts > out/call-mix/safety-depth.jsonl
import { readFileSync } from 'node:fs';
import { situationDepth } from '../../../src/playbook/alignment.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';

const DB = new Set(['CB', 'S', 'FS', 'SS', 'DB']);
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, i: number) => {
    if (!p.pass) return;
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const cov = sim.defCall.coverage, look = cov.look ?? cov.shell;
    if (look !== 'two-high') return;
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    const dir = sim.attackDir('O'), los = sim.los;
    const depthOf = (a: any) => +((a.pos.x - los) * dir).toFixed(2);
    const safeties = sim.defense.filter((d: any) => d.slot === 'SS' || d.slot === 'FS');
    const built = new Map(safeties.map((d: any) => [d.slot, depthOf(d)]));
    const style = sim.defStyle ?? {};
    const quarters = (slot: string) => { const r = cov.roles[slot]; return r?.kind === 'zone' && r.zone.startsWith('quarter'); };
    const rows: any = { snap: null, '0.5': null, '1.0': null };
    const grab = () => {
      const dbs = sim.defense.filter((d: any) => DB.has(d.player.position)).map((d: any) => ({ slot: d.slot, pos: d.player.position, depth: depthOf(d) })).sort((a: any, b: any) => b.depth - a.depth);
      return { deepest: dbs[0], second: dbs[1], safeties: Object.fromEntries(safeties.map((d: any) => [d.slot, depthOf(d)])) };
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.phase !== 'live') return;
      if (!rows.snap) rows.snap = grab();
      if (!rows['0.5'] && sim.t >= 0.5) rows['0.5'] = grab();
      if (!rows['1.0'] && sim.t >= 1.0) rows['1.0'] = grab();
    };
    sim.run();
    console.log(JSON.stringify({ key: `${seed}:${i}:${k}`, cov: cov.id, family: cov.family ?? cov.id, shell: cov.shell, look, shown: sim.defCall.shown?.id ?? null,
      habit: style.safetyDepth ?? 0, down: sim.down, dist: +(sim.firstDownX - los).toFixed(1),
      safeties: safeties.map((d: any) => ({ slot: d.slot, role: cov.roles[d.slot]?.zone ?? cov.roles[d.slot]?.kind ?? null,
        installed: +((sim.defAlign.spots[d.slot].pos.x - los) * dir).toFixed(2),
        situ: +situationDepth(quarters(d.slot) ? 'quarter' : 'half', style.situation).toFixed(2), built: built.get(d.slot) })),
      ...rows }));
  });
}
