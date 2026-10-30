/** Departing climbers (plan.departure set), every tick: access kind (direct / detour by obstacle role /
 * unvalidated brake or original), chosen turn sign, commanded and achieved speed; per departure: duration and how it
 * ended. Zone and gap runs, saved dice. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const tick: Record<string, { n: number; cmd: number; v: number }> = {}; const dep: Record<string, number[]> = {}; const ends: Record<string, number> = {};
const add = (k: string, cmd: number, v: number) => { const r = (tick[k] ??= { n: 0, cmd: 0, v: 0 }); r.n++; r.cmd += cmd; r.v += v; };
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; const fam = /zone|duo/i.test(sch) ? 'zone' : /power|counter|trap/.test(sch) ? 'gap' : null;
  if (!fam || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const live = new Map<any, { t0: number; keeper: any; kinds: Record<string, number> }>();
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    for (const a of sim.offense) {
      const b: any = a.behavior; if (!(b instanceof RunBlocker)) continue;
      const d = b.plan.departure;
      if (d) {
        if (!live.has(a)) live.set(a, { t0: sim.t, keeper: d.keeper, kinds: {} });
        const acc = b.departureAccess; let k = acc ? acc.kind : 'none';
        if (acc?.kind === 'detour') { const ob = sim.agents[acc.plan.obstacle]; k += ob === d.keeper ? ' around keeper' : ob.team === 'O' ? ' around other OL' : ' around DL'; k += ` sign ${acc.plan.turn ?? '?'}`; }
        if (acc?.kind === 'unvalidated') k += Math.hypot(acc.command.vel.x, acc.command.vel.y) < 1e-6 ? ' BRAKE' : ' original';
        if (b.departureStrikeClear) k += ' (strike clear)';
        const cmd = sim.intents[a.idx]?.vel ? Math.hypot(sim.intents[a.idx].vel.x, sim.intents[a.idx].vel.y) : 0;
        add(`${fam} ${k}`, cmd, a.speed);
      } else if (live.has(a)) {
        const L = live.get(a)!; live.delete(a);
        (dep[fam] ??= []).push(sim.t - L.t0);
        const why = b.plan.kind !== 'climb' ? 'left climb' : a.engagement ? 'engaged' : 'ended';
        ends[`${fam} ${why}`] = (ends[`${fam} ${why}`] ?? 0) + 1;
      }
    }
  }
}
const med = (v: number[]) => v.slice().sort((a, b) => a - b)[v.length >> 1];
for (const fam of ['zone', 'gap']) {
  const rows = Object.entries(tick).filter(([k]) => k.startsWith(fam + ' ')); const tot = rows.reduce((s, [, r]) => s + r.n, 0);
  console.log(`== ${fam}: departure ticks ${tot}, departures ${dep[fam]?.length ?? 0}, median duration ${dep[fam] ? med(dep[fam]).toFixed(2) : '-'} s`);
  for (const [k, r] of rows.sort((a, b) => b[1].n - a[1].n)) console.log(`  ${(r.n / tot).toFixed(3)}  ${k.slice(fam.length + 1).padEnd(40)} commanded ${(r.cmd / r.n).toFixed(2)} achieved ${(r.v / r.n).toFixed(2)}`);
  console.log('  ends: ' + Object.entries(ends).filter(([k]) => k.startsWith(fam)).map(([k, v]) => `${k.slice(fam.length + 1)} ${v}`).join(', '));
}
