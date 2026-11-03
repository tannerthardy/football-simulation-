import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const v: Record<string, number[]> = {}; const put = (k: string, x: number) => (v[k] ??= []).push(x);
for (let seed = 7; seed <= 29; seed += 4) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); let h = -1; const rb = sim.slot('RB'); const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 4) { sim.tick();
    if (h < 0 && sim.ball?.kind === 'held' && sim.ball.carrier === rb) { h = sim.t; put('speed@handoff', Math.hypot(rb.vel.x, rb.vel.y)); put('depth@handoff', (rb.pos.x - sim.los) * dir); }
    for (const dt of [.5, 1.0]) if (h >= 0 && Math.abs(sim.t - h - dt) < sim.dt / 2) { put(`speed+${dt}`, Math.hypot(rb.vel.x, rb.vel.y)); put(`depth+${dt}`, (rb.pos.x - sim.los) * dir); }
  }
}
for (const [k, a] of Object.entries(v)) { const s = [...a].sort((x, y) => x - y); console.log(k.padEnd(16), 'n', s.length, 'p50', s[s.length >> 1].toFixed(2)); }
