/** Doubled zone DL, per tick: play-side lateral request vs achievement for the DL, the owner and each helper, read
 * from this tick's intents (sim.intents after the tick) and the bodies' velocities after World. Also hand force on
 * the DL laterally if available. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runContactObservers } = await import(root + '/src/sim/run-contact-observer.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const acc: Record<string, Record<string, number>> = {};
const put = (bin: string, k: string, v = 1) => { const a = (acc[bin] ??= {}); a[k] = (a[k] ?? 0) + v; };
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (!/^(insideZone|outsideZone)$/.test(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const ps = playSideSign(sim, sim.offCall.run);
  let doubled: any[] = [];
  runContactObservers.set(sim, (e: any, kind: string) => { if (kind === 'defender-movement' && e.helpers?.length) doubled.push(e); });
  while (sim.phase === 'live' && sim.t < 3) {
    doubled = [];
    sim.tick();
    for (const e of doubled) {
      const bin = `${sch} ${sim.t < 0.8 ? 'a <0.8' : sim.t < 1.5 ? 'b 0.8-1.5' : 'c 1.5+'}`;
      const I = sim.intents;
      put(bin, 'n');
      const body = (k: string, a: any) => { const r = I[a.idx]?.vel; if (!r) return; put(bin, k + ' req', r.y * ps); put(bin, k + ' ach', a.vel.y * ps); put(bin, k + ' n'); };
      body('DL', e.defender); body('own', e.blocker); for (const h of e.helpers) body('hlp', h);
      const ownR = I[e.blocker.idx]?.vel, dlR = I[e.defender.idx]?.vel;
      if (ownR && dlR) { put(bin, 'agree n'); if (Math.sign(ownR.y) === Math.sign(dlR.y)) put(bin, 'agree'); }
    }
  }
}
for (const [bin, a] of Object.entries(acc).sort()) {
  const g = (k: string) => `${(a[k + ' req'] / a[k + ' n']).toFixed(2)} -> ${(a[k + ' ach'] / a[k + ' n']).toFixed(2)}`;
  console.log(`${bin.padEnd(20)} ticks ${String(a.n).padStart(5)} | play-side lateral req -> ach: DL ${g('DL')} | owner ${g('own')} | helper ${g('hlp')} | owner/DL same lateral sign ${(a.agree / a['agree n']).toFixed(2)}`);
}
