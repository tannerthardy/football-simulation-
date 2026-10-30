/** Power/counter lead pullers, 1.2-2.8 s, not engaged: is his plan target engaged with a teammate (true state), and in his
 * picture is a teammate within contact range of the target; is there a free unblocked defender within 2.5 yd of the
 * carrier's path ahead (between carrier and 3 yd past LOS, within 2 yd laterally of the carrier) that nobody blocks? */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1; let ticks = 0, plays = 0, never = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; if (!/^(power|counter)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O');
  const L = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'lead');
  const engaged = new Set<any>();
  while (sim.phase === 'live' && sim.t < 2.8) {
    sim.tick();
    for (const a of L) if (a.engagement) engaged.add(a);
    if (sim.t < 1.2) continue;
    const c = sim.carrier;
    for (const a of L) {
      const b: any = a.behavior; if (!b.plan || a.engagement) continue;
      const tg = b.plan.target; ticks++;
      if (!tg) { add('no target'); continue; }
      const mateOn = tg.engagement && tg.engagement.blocker !== a && tg.engagement.blocker.team === 'O';
      const seenMate = sim.offense.some((o: any) => o !== a && o !== sim.qb && (() => { const s = sim.see(a, o).pos, d = sim.see(a, tg).pos; return Math.hypot(s.x - d.x, s.y - d.y) <= o.profile.radius + tg.profile.radius + o.player.measurables.armIn / 36; })());
      let freeAhead = false;
      if (c && c !== sim.qb) for (const d of sim.defense) {
        if (d.engagement || d.isDown(sim.t)) continue;
        const ahead = (d.pos.x - c.pos.x) * dir, lat = Math.abs(d.pos.y - c.pos.y);
        if (ahead > 0 && (d.pos.x - sim.los) * dir < 3 && lat < 2.5) { freeAhead = true; break; }
      }
      add(`target ${tg.team === 'D' ? (/^LB/.test(tg.slot) ? 'LB' : /^(DE|DT|NT)/.test(tg.slot) ? 'DL' : 'DB') : '?'} ${mateOn ? 'ALREADY blocked by a teammate' : 'free'}${seenMate ? ' (teammate in contact range, his picture)' : ''} | free unblocked defender ahead of carrier: ${freeAhead ? 'yes' : 'no'}`);
    }
  }
  plays += L.length; never += L.filter((a: any) => !engaged.has(a)).length;
}
console.log(`lead pullers ${plays}, never engaged by 2.8 s ${never}; unengaged ticks 1.2-2.8 s: ${ticks}`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${(100 * v / ticks).toFixed(0)}%  ${k}`);
