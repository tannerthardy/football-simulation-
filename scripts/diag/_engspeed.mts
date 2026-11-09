/** Engaged DL on runs, carrier (not QB) within 6 yd: requested vs achieved speed while engaged, the request's
 * lateral component vs the carrier's side, upfield request vs achieved, and the blocker's speed. usage: <capDir> <seed>...
 * (Defense, pasted 2026-11-05; for a scheme split add sim.intents[b.idx] and b.behavior?.plan?.kind to the row) */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const DL = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot));
  const t0 = sim.tick.bind(sim); let k = 0;
  sim.tick = () => { t0(); if (++k % 4) return; const c = sim.carrier; if (!c || c === sim.qb) return;
    for (const d of DL) { if (!d.engagement) continue; const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); if (dist > 6) continue;
      const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, b = d.engagement.blocker; const side = Math.sign(c.pos.y - d.pos.y) || 1, dir = sim.attackDir(sim.offense[0].team);
      const bv = sim.intents[b.idx]?.vel ?? { x: 0, y: 0 };
      R.push({ req: Math.hypot(iv.x, iv.y), reqLat: iv.y * side, v: Math.hypot(d.vel.x, d.vel.y), vLat: d.vel.y * side, bv: Math.hypot(b.vel.x, b.vel.y),
        reqUp: -iv.x * dir, vUp: -d.vel.x * dir, bReqUp: -bv.x * dir, bPlan: b.behavior?.plan?.kind ?? b.behavior?.kind,
        dMass: d.profile.massKg, bMass: b.profile.massKg, dStr: d.r('strength'), bStr: b.r('strength'),
        kind: `${d.runFit?.kind ?? '-'}:${d.runFit?.technique ?? '-'}:${(-iv.x * dir) > 1 ? 'press' : 'hold'}` }); } };
  sim.run();
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z[Math.floor(f * (z.length - 1))]; };
for (const kind of ['all', ...new Set(R.map(r => r.kind))]) { const S = kind === 'all' ? R : R.filter(r => r.kind === kind); if (S.length < 50) continue;
  console.log(`${kind.padEnd(9)} n ${String(S.length).padStart(5)} | requested speed p25/50/75 ${q(S.map(r => r.req), .25).toFixed(1)}/${q(S.map(r => r.req)).toFixed(1)}/${q(S.map(r => r.req), .75).toFixed(1)} | toward carrier side (lateral) req ${q(S.map(r => r.reqLat)).toFixed(1)} achieved ${q(S.map(r => r.vLat)).toFixed(1)} | achieved speed ${q(S.map(r => r.v)).toFixed(1)} | blocker speed ${q(S.map(r => r.bv)).toFixed(1)} | upfield req ${q(S.map(r => r.reqUp)).toFixed(1)} achieved ${q(S.map(r => r.vUp)).toFixed(1)} | zero request ${(100 * S.filter(r => r.req < .2).length / S.length).toFixed(0)}%`); }
// Push contest split: interior pressing DL by the blocker's plan and the blocker's upfield request.
const P = R.filter(r => r.kind.startsWith('interior') && r.kind.endsWith('press'));
for (const plan of [...new Set(P.map(r => r.bPlan))]) { const S = P.filter(r => r.bPlan === plan); if (S.length < 30) continue;
  console.log(`press vs ${String(plan).padEnd(10)} n ${String(S.length).padStart(5)} | DL up req ${q(S.map(r => r.reqUp)).toFixed(1)} achieved ${q(S.map(r => r.vUp)).toFixed(1)} | blocker up req (toward DL) ${q(S.map(r => -r.bReqUp)).toFixed(1)} | mass DL/OL ${q(S.map(r => r.dMass)).toFixed(0)}/${q(S.map(r => r.bMass)).toFixed(0)} | str DL/OL ${q(S.map(r => r.dStr)).toFixed(2)}/${q(S.map(r => r.bStr)).toFixed(2)}`); }
