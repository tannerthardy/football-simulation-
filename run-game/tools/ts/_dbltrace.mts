// IZ doubles on saved snaps: per 0.1 s while the combination is unreleased: is the DL engaged, by whom (owner),
// is the other member a registered helper, members' lateral (+ away from partner) / depth in front of the DL.
import { readFileSync } from 'node:fs';
const W = process.argv[2], verbose = Number(process.argv[3] ?? 2); if (process.argv[4] === 'freeze') (globalThis as any).__freezeDL = true;
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const G: Record<string, number[]> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; let shown = 0, n = 0;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  snaps.forEach((p: any, idx: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'insideZone') return;
    const sim: any = new PlaySim(st); const dir = sim.attackDir('O');
    const combos = new Set<any>(); for (const a of sim.offense) { const c = a.behavior instanceof RunBlocker ? a.behavior.plan.combination : null; if (c) combos.add(c); }
    if (!combos.size) return; n++;
    const show = shown < verbose; if (show) shown++;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (Math.abs(sim.t * 10 - Math.round(sim.t * 10)) > 1e-6 || sim.t < .3 || sim.t > 1.6) return;
      for (const c of combos) { if (c.released) continue; const d = c.defender, [m1, m2] = c.members;
        const e = d.engagement; const owner = e?.blocker, helpers = e?.helpers ?? [];
        const st = !e ? 'DL not engaged' : !c.members.includes(owner) ? 'DL engaged by non-member' : helpers.length ? 'owner+registered helper' : 'owner only (no helper)';
        inc(st);
        const other = !e ? null : m1 === owner ? m2 : m2 === owner ? m1 : null;
        if (other && helpers.includes(other)) { const lat = { x: 0, y: 1 }; const side = Math.sign(other.pos.y - owner.pos.y) || 1;
          const put = (k: string, v: number) => (G[k] ??= []).push(v);
          put('owner lat (+ away from helper)', (owner.pos.y - d.pos.y) * -side); put('owner depth in front', (d.pos.x - owner.pos.x) * dir);
          put('helper lat (+ away from owner)', (other.pos.y - d.pos.y) * side); put('helper depth in front', (d.pos.x - other.pos.x) * dir);
          put('owner-helper gap', Math.hypot(other.pos.x - owner.pos.x, other.pos.y - owner.pos.y)); }
        if (other && !helpers.includes(other)) inc('  other member engaged elsewhere: ' + !!(other.engagement && other.engagement.defender !== d));
        if (show) { const f = (a: any) => { const lat = (a.pos.y - d.pos.y), dep = (d.pos.x - a.pos.x) * dir; return `${a.slot}(${lat.toFixed(2)},${dep.toFixed(2)})`; };
          console.log(`s${seed}#${idx} t=${sim.t.toFixed(1)} ${d.slot} ${st} owner=${owner?.slot ?? '-'} helpers=${helpers.map((h: any) => h.slot)} ${f(m1)} ${f(m2)}`); } } };
    try { sim.run(); } catch {}
  });
}
console.log('iz plays with combos', n); for (const [k, v] of Object.entries(C)) console.log(k.padEnd(44), v);
const q=(v:number[],p:number)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.floor(p*(s.length-1))].toFixed(2)}; for (const [k,v] of Object.entries(G)) console.log(k.padEnd(32), 'p25', q(v,.25), 'med', q(v,.5), 'p75', q(v,.75));
