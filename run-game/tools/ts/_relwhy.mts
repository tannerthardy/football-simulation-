// Zone doubles on saved snaps: for each combination, the release: which member leaves (covered = members[0] owner-at-plan,
// helper = members[1]), the blockingChange reason recorded at that moment, and the DL's flow (lateral velocity toward
// the helper side) then.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const sc = st.offCall?.run?.scheme; if (sc !== 'insideZone' && sc !== 'outsideZone') continue;
    const sim: any = new PlaySim(st);
    const combos = new Set<any>(); for (const a of sim.offense) { const c = a.behavior instanceof RunBlocker ? a.behavior.plan.combination : null; if (c) combos.add(c); }
    const seen = new Set<any>(); const reasons = new Map<any, string>();
    const bs = sim.blockingSink.bind(sim);
    sim.blockingSink = (ag: any) => { const real = bs(ag); return { blockingState: (x: any) => real?.blockingState(x) ?? null,
      blockingChange: (x: any, prev: any, reason: string, s2: any) => { real?.blockingChange(x, prev, reason, s2); reasons.set(x, reason.split(':')[0]); } }; };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); for (const c of combos) { if (!c.released || seen.has(c)) continue; seen.add(c);
      const [cov, hel] = c.members, d = c.defender; const side = Math.sign(hel.pos.y - cov.pos.y) || 1, v = d.vel.y * side;
      const cl = Math.abs(v) < .6 ? 'SQUARE' : v > 0 ? 'TO HELPER' : 'TO COVERED';
      const leaver = c.members.find((m: any) => (m.behavior as any).plan.target !== d);
      const who = leaver === cov ? 'covered' : leaver === hel ? 'helper' : 'none';
      inc(`${sc} ${cl}: ${who} leaves`); inc(`${sc} ${cl}: ${who} via ${reasons.get(leaver) ?? '?'}`); } };
    try { sim.run(); } catch {}
  }
}
for (const [k, v] of Object.entries(C).sort()) console.log(k.padEnd(80), v);
