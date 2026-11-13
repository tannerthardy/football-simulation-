import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const cnt: Record<string, number> = {}; const leave: number[] = []; const end: Record<string, number[]> = {}; const clock: number[] = [];
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; const sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const dice = sim.dice.bind(sim), made = new Set<string>();
    (sim as any).dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake || sim.offCall.pass?.family === 'screen') return;
    const qbb: any = sim.qb.behavior; if (typeof qbb.clock === 'number') clock.push(qbb.clock);
    const backs = sim.offense.filter(o => ['RB', 'FB'].includes((o as any).player.position) && sim.los - o.pos.x >= 3);
    const kind = new Map(backs.map(b => [b.idx, b.behavior instanceof RouteRunner ? 'route' : (b.behavior as any).passOption ? 'check' : 'stays in'])); const x0 = new Map(backs.map(b => [b.idx, { ...b.pos }])); const lt = new Map<number, number>();
    let scr = -1; const tick = sim.tick.bind(sim);
    (sim as any).tick = () => { tick(); for (const b of backs) if (!lt.has(b.idx)) { const o = x0.get(b.idx)!; if (b.pos.x - o.x > 1 || Math.abs(b.pos.y - o.y) > 3) lt.set(b.idx, sim.t); } if (scr < 0 && (sim as any).scrambled) scr = sim.t; };
    const r: any = sim.run(); const s: any = sim.stats;
    for (const b of backs) { const kd = kind.get(b.idx)!; cnt[kd] = (cnt[kd] ?? 0) + 1; if (kd !== 'stays in' && lt.has(b.idx)) leave.push(lt.get(b.idx)!); }
    if (s.sacked) (end.sack ??= []).push(r.events.find((e: any) => e.type === 'sack')?.t ?? NaN);
    if (scr >= 0) (end['scramble (start)'] ??= []).push(scr);
    if (sim.throwAt >= 0) { (end['all throws'] ??= []).push(sim.throwAt); if (!(sim.ball as any).target || s.throwaway) (end.throwaway ??= []).push(sim.throwAt); } }); }
const q = (v: number[] = [], x: number) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(x * (v.length - 1))].toFixed(2) : '-';
const n = Object.values(cnt).reduce((a, b) => a + b, 0); console.log('sim backfield backs n', n, Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, (v / n * 100).toFixed(1) + '%'])), '| leave-pocket p50', q(leave, .5));
for (const [k, v] of Object.entries(end)) console.log(`sim ${k.padEnd(18)} n ${v.length} time p25/50/75/90 ${q(v, .25)}/${q(v, .5)}/${q(v, .75)}/${q(v, .9)}`);
console.log(`sim QB clock p10/50/90 ${q(clock, .1)}/${q(clock, .5)}/${q(clock, .9)}`);
