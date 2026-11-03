import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunnerToMesh } = await import(`${W}/src/sim/assign.ts`);
const V: Record<string, number[]> = {}; const put = (k: string, v: number) => (V[k] ??= []).push(v);
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const sc = st.offCall?.run?.scheme; if (!['insideZone', 'outsideZone', 'power'].includes(sc)) continue;
    const sim: any = new PlaySim(st); const rb = sim.slot('RB'), qb = sim.qb, b: any = rb.behavior;
    if (!(b instanceof RunnerToMesh) || Math.abs(rb.pos.y - qb.pos.y) < 1) continue;
    const side = Math.sign(b.mesh.y - qb.pos.y) === Math.sign(rb.pos.y - qb.pos.y) ? 'near' : 'far';
    const d0 = Math.hypot(b.mesh.x - rb.pos.x, b.mesh.y - rb.pos.y);
    let ht = -1, hs = 0, dep = -1;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (dep < 0 && Reflect.get(rb.behavior, 'departed')) dep = sim.t;
      if (ht < 0 && sim.ball.kind === 'held' && sim.ball.carrier === rb) { ht = sim.t; hs = Math.hypot(rb.vel.x, rb.vel.y); } };
    try { sim.run(); } catch { continue; }
    if (ht < 0) continue;
    const k = `${sc} ${side}`; put(k + ' n', 1); put(k + ' handoff t', ht); put(k + ' speed', hs); put(k + ' depart t', dep); put(k + ' mesh dist', d0); put(k + ' meshTime', b.meshTime);
  }
}
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)].toFixed(2); };
for (const [k, v] of Object.entries(V).sort()) console.log(k.padEnd(30), k.endsWith(' n') ? v.length : q(v));
