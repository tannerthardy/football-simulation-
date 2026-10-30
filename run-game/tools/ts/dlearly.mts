/** Zone runs, front DL (snap depth < 1.5 yd), ticks 0-0.8 s after the snap: play-side lateral request (this tick's
 * intent) vs achieved velocity, upfield request, split by engaged/unengaged. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const acc: Record<string, Record<string, number>> = {};
const put = (bin: string, k: string, v = 1) => { const a = (acc[bin] ??= {}); a[k] = (a[k] ?? 0) + v; };
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (!/^(insideZone|outsideZone)$/.test(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('D');
  const dl = sim.agents.filter((a: any) => a.team === 'D' && Math.abs(a.pos.x - sim.los) < 1.5);
  let t0: number | null = 0;
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();

    if (t0 === null) continue;
    const t = sim.t - t0; if (t > 0.8) break;
    for (const d of dl) {
      const r = sim.intents[d.idx]?.vel; if (!r) continue;
      const eng = sim.engagements?.some?.((e: any) => e.defender === d) ?? !!d.engagement;
      const bin = `${sch} ${t < 0.3 ? 'a 0-0.3' : t < 0.55 ? 'b 0.3-0.55' : 'c 0.55-0.8'} ${eng ? 'engaged' : 'free'}`;
      put(bin, 'n'); put(bin, 'req', r.y * ps); put(bin, 'ach', d.vel.y * ps); put(bin, 'up', r.x * dir); put(bin, 'achup', d.vel.x * dir);
      if (r.y * ps > .5) put(bin, 'with'); if (r.y * ps < -.5) put(bin, 'against');
    }
  }
}
for (const [bin, a] of Object.entries(acc).sort()) console.log(`${bin.padEnd(32)} n ${String(a.n).padStart(5)} | lateral with play req ${(a.req / a.n).toFixed(2)} ach ${(a.ach / a.n).toFixed(2)} | req >0.5 with ${((a.with ?? 0) / a.n).toFixed(2)} against ${((a.against ?? 0) / a.n).toFixed(2)} | upfield req ${(a.up / a.n).toFixed(2)} ach ${(a.achup / a.n).toFixed(2)}`);
