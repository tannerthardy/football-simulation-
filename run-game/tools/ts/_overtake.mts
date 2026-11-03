// OZ/IZ doubles, ticks where the shared DL flows toward the covered member (> 0.6 yd/s, field lateral): the helper's
// state (registered helper on the rep / own engagement / free), his requested and achieved lateral speed toward the
// covered side, the DL's, and distance to the DL.
import { readFileSync } from 'node:fs';
const W = process.argv[2], scheme = process.argv[3] ?? 'outsideZone';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const V: Record<string, number[]> = {}; const put = (k: string, v: number) => (V[k] ??= []).push(v);
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== scheme) continue;
    const sim: any = new PlaySim(st);
    const combos = new Set<any>(); for (const a of sim.offense) { const c = a.behavior instanceof RunBlocker ? a.behavior.plan.combination : null; if (c) combos.add(c); }
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); for (const c of combos) { if (c.released) continue; const [cov, hel] = c.members, d = c.defender;
      if (Math.hypot(hel.pos.x - d.pos.x, hel.pos.y - d.pos.y) > 2.5) continue;
      const side = Math.sign(hel.pos.y - cov.pos.y) || 1, toCov = -side, v = d.vel.y * toCov; if (v < .6) continue;
      const e = d.engagement; const st2 = e && e.helpers.includes(hel) ? 'registered helper' : hel.engagement ? (hel.engagement.defender === d ? 'owner of the man' : 'engaged elsewhere') : 'free';
      const req = sim.intents[hel.idx]?.vel ?? { x: 0, y: 0 };
      put(st2 + ' | n', 1); put(st2 + ' | DL lat', v); put(st2 + ' | helper req lat', req.y * toCov); put(st2 + ' | helper got lat', hel.vel.y * toCov);
      put(st2 + ' | helper req speed', Math.hypot(req.x, req.y)); put(st2 + ' | dist to DL', Math.hypot(hel.pos.x - d.pos.x, hel.pos.y - d.pos.y)); } };
    try { sim.run(); } catch {}
  }
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))].toFixed(2); };
for (const [k, v] of Object.entries(V).sort()) console.log(k.padEnd(40), k.endsWith('| n') ? v.length : `p25 ${q(v, .25)} med ${q(v, .5)} p75 ${q(v, .75)}`);
