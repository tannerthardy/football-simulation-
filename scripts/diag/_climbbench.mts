/** One body, free field, steady request: does the World make its velocity heading wander and its speed stall?
 * Takes real bodies (an OL climber and an RB) from a restaged snap a second into the play, runs a constant request
 * at a fixed heading (optionally with facing offset) through the same World as the game, and reports per-step
 * velocity heading rate and speed. usage: <capFile> */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
(PlaySim as any).recordedSingleStream = true;
const plays = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[];
const p = plays.find(x => !x.pass);
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
while (sim.t < 0.3) sim.tick();
const deg = (r: number) => r * 180 / Math.PI;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (const slot of ['LG', 'C', 'RB']) {
  const a = sim.agents.find((x: any) => x.slot === slot);
  for (const [v0, off, faceOff] of [[3, 12, 0], [3, 12, 19], [3, 0, 0], [3, 30, 0]] as const) {
    const body = { ...a.body, pos: { x: 20, y: 26 }, vel: { x: v0, y: 0 }, facing: 0, yaw: 0 };
    const h = off * Math.PI / 180, req = 7.34;
    const samples = previewFreeMovement(body as any, { vel: { x: Math.cos(h) * req, y: Math.sin(h) * req }, facing: h + faceOff * Math.PI / 180 } as any, 0, 30);
    let prev = 0; const rates: number[] = []; let away = 0;
    for (const s of samples) { const hd = Math.atan2(s.vel.y, s.vel.x); const r = deg(wrap(hd - prev)) / 0.05; rates.push(Math.abs(r));
      if (Math.sign(wrap(h - prev)) !== 0 && Math.sign(r) !== Math.sign(wrap(h - prev)) && Math.abs(wrap(h - prev)) > 0.02) away++; prev = hd; }
    const sp = (t: number) => { const s = samples[Math.round(t / 0.05) - 1]; return Math.hypot(s.vel.x, s.vel.y).toFixed(2); };
    const z = [...rates].sort((x, y) => x - y);
    console.log(`${slot.padEnd(3)} v0 ${v0} req ${off}° face+${faceOff}° | speed @0.4/0.8/1.2/1.5 s ${sp(0.4)}/${sp(0.8)}/${sp(1.2)}/${sp(1.5)} | heading rate p50 ${z[z.length >> 1].toFixed(1)} p90 ${z[Math.floor(z.length * .9)].toFixed(1)} deg/s | steps turning away ${away}/30 | final heading ${deg(Math.atan2(samples[29].vel.y, samples[29].vel.x)).toFixed(1)}° | vmax ${a.profile.vmax.toFixed(2)} mass ${a.profile.massKg}`);
  }
}
