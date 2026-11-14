// HANDS_LEVER IZ diagnostic (Run Game, not committed): replay one fresh-set play; every 0.25 s from the handoff print
// the carrier, each OL's engagement partner and his facing relative to the line to that man, and defenders within 7 yd.
//   npm run -s ref -- [--flag HANDS_LEVER=1] node --import tsx scripts/diag/_hliz.mts s53-100
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const id = process.argv[2]; const [s, i] = id.slice(1).split('-').map(Number);
const p = JSON.parse(readFileSync(`out/matched-restage/seed${s}-run.json`, 'utf8'))[i];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const deg = (r: number) => Math.round(r * 180 / Math.PI);
const wrap = (r: number) => Math.atan2(Math.sin(r), Math.cos(r));
let ho = -1, next = 0;
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0();
  if (ho < 0 && sim.events.some((e: any) => e.type === 'handoff')) { ho = sim.t; next = ho; }
  if (ho < 0 || sim.t < next - 1e-9 || sim.t > ho + 2.6) return; next += 0.25;
  const c = sim.carrier; if (!c) return;
  const ol = ['LT','LG','C','RG','RT'].map((sl: string) => sim.slot(sl)).filter(Boolean);
  const eng = ol.map((o: any) => { const e = sim.engagements.find((x: any) => x.blocker === o); if (!e) return `${o.slot}:-`;
    const d = e.defender, to = Math.atan2(d.pos.y - o.pos.y, d.pos.x - o.pos.x); return `${o.slot}>${d.slot}(${deg(wrap(o.body.facing - to))})`; }).join(' ');
  const near = sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 7)
    .map((d: any) => `${d.slot}${d.engagement ? '[E]' : ''}${d.isDown(sim.t) ? '[D]' : ''}@${Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y).toFixed(1)}`).join(' ');
  console.log(`+${(sim.t - ho).toFixed(2)} carrier x${(c.pos.x - sim.los).toFixed(1)} y${(c.pos.y - sim.ballY).toFixed(1)} | ${eng} | near ${near}`);
};
const r = sim.run();
console.log('yards', r.yards.toFixed(1), sim.events.filter((e: any) => /missed|broken|tackle|block_climb|shed/.test(e.type)).map((e: any) => `${e.type}@${(e.t - ho).toFixed(2)}:${e.a?.slot ?? sim.agents[e.a]?.slot ?? ''}${e.b !== undefined ? '>' + (e.b?.slot ?? sim.agents[e.b]?.slot ?? '') : ''}`).slice(0, 14).join(' '));
