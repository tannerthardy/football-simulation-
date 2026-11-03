import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const v: Record<string, number[]> = {}; const put = (k: string, x: number) => (v[k] ??= []).push(x);
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (st.offCall?.run?.scheme !== 'outsideZone') continue;
  const sim: any = new PlaySim(st); const tr = sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 0.5, to: 4 });
  const c = sim.slot('C'); const side = new Map<number, number>();
  while (sim.t < 4 && sim.phase === 'live') { sim.tick();
    const car = sim.ball?.kind === 'held' ? sim.ball.carrier : null; const e = c.engagement;
    if (car && car !== sim.qb && e && e.blocker === c && /LB/.test(e.defender.slot)) side.set(Math.round(sim.t * 20), Math.sign(car.pos.y - e.defender.pos.y) || 1); }
  for (const s of tr.steps as any[]) { const sd = side.get(Math.round(s.stepStart * 20)); if (!sd || !s.final) continue;
    put('raw', (s.decision?.raw?.vel?.y ?? 0) * sd); put('final', s.final.vel.y * sd); put('achieved', (s.endpoint?.body?.velocity?.y ?? 0) * sd);
    for (const r of s.rewrites) put('stage ' + r.stage, r.command.vel.y * sd); }
}
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))].toFixed(2); };
for (const [k, a] of Object.entries(v)) console.log(k.padEnd(22), 'n', a.length, 'p25', q(a, .25), 'p50', q(a, .5), 'p75', q(a, .75));
