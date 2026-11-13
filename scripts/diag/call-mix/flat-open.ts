// Flat-open table (report only): why the QB rarely throws the flat. On the matched panel (seeds 7 and 11 x 4
// dice shifts), every time the QB evaluates a receiver running a flat (flat, arrow), log his own estimate
// (P, INT risk, the bar he holds it to), whether the flat is his current read, and the picture: receiver depth,
// width and speed, the nearest defender's distance and closing speed. Passive: wraps QBPass.evaluate and calls
// it once, unchanged; the play is identical to an unprobed replay.
//   node --import tsx scripts/diag/matched-restage.ts capture 7; ... capture 11
//   [ARM ENV] node --import tsx scripts/diag/call-mix/flat-open.ts <arm>
//     -> out/call-mix/flat-open-<arm>.jsonl (each QB evaluation of a flat), flat-plays-<arm>.jsonl, flat-fixed-<arm>.jsonl
// FLAT_FIRST (read the flat first) is on branch rules/flat-first.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';

const arm = process.argv[2] ?? 'x';
mkdirSync('out/call-mix', { recursive: true });
const FLATS = new Set(['flat', 'arrow']);
let log: any[] = [], key = '', sim: any = null;
const proto: any = QBPass.prototype;
const evaluate = proto.evaluate;
proto.evaluate = function (a: any, s: any, r: any, urgency: number) {
  const ev = evaluate.call(this, a, s, r, urgency);
  const rr = r.behavior instanceof RouteRunner ? r.behavior : null;
  if (rr && FLATS.has(rr.route.id)) {
    const dir = s.attackDir('O');
    let near: any = null, nd = Infinity;
    for (const d of s.defense) { const x = Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y); if (x < nd) { nd = x; near = d; } }
    const rel = near ? { x: near.pos.x - r.pos.x, y: near.pos.y - r.pos.y } : null;
    const closing = near && rel ? -(((near.vel.x - r.vel.x) * rel.x + (near.vel.y - r.vel.y) * rel.y) / (nd || 1)) : null;
    const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
    log.push({ key, slot: r.slot, t: +s.t.toFixed(2), current: this.reads[this.readIdx] === r, readNo: this.reads.indexOf(r) + 1, readIdx: this.readIdx + 1,
      P: ev ? +ev.P.toFixed(3) : null, intRisk: ev ? +ev.intRisk.toFixed(3) : null, need: +(0.6 - 0.12 * aggression - 0.32 * urgency).toFixed(3),
      depth: +((r.pos.x - s.los) * dir).toFixed(2), width: +Math.abs(r.pos.y - s.ballY).toFixed(2), speed: +Math.hypot(r.vel.x, r.vel.y).toFixed(2),
      nearPos: near?.player.position ?? null, nearDist: +nd.toFixed(2), nearDepth: near ? +((near.pos.x - s.los) * dir).toFixed(2) : null,
      closing: closing === null ? null : +closing.toFixed(2), concept: s.offCall.pass?.id });
  }
  return ev;
};
const rows: string[] = [], outcome: string[] = [], fixed: string[] = [];
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, i: number) => {
    if (!p.pass) return;
    const setup: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (setup.offCall?.pass) setup.offCall = { ...setup.offCall, pass: PASS_BY_ID[setup.offCall.pass.id] ?? setup.offCall.pass };
    sim = new PlaySim(setup); key = `${seed}:${i}:${k}`; log = [];
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    // Fixed-time picture of every flat runner (same operator as nfl_flat_open.py): depth past the snap spot,
    // width from it, speed, nearest defender and his closing speed.
    const marks = [1.0, 1.5, 2.0, 2.5], seen = new Set<number>(), tick = sim.tick.bind(sim), los = sim.los, ballY = sim.ballY, dir = sim.attackDir('O');
    let starters: any[] = [], started = false;
    sim.tick = () => {
      tick();
      if (sim.phase !== 'live') return;
      if (!started) { started = true; starters = sim.offense.filter((a: any) => a.behavior instanceof RouteRunner && FLATS.has(a.behavior.route.id)); }
      for (const m of marks) if (!seen.has(m) && sim.t >= m - 1e-9) {
        seen.add(m);
        for (const f of starters) {
          let near: any = null, nd = Infinity;
          for (const d of sim.defense) { const x = Math.hypot(d.pos.x - f.pos.x, d.pos.y - f.pos.y); if (x < nd) { nd = x; near = d; } }
          const rel = { x: near.pos.x - f.pos.x, y: near.pos.y - f.pos.y };
          const closing = -(((near.vel.x - f.vel.x) * rel.x + (near.vel.y - f.vel.y) * rel.y) / (nd || 1));
          const look = [...log].reverse().find((e) => e.slot === f.slot && e.t <= m + 1e-9 && e.t > m - 0.2);
          fixed.push(JSON.stringify({ key, at: m.toFixed(1), slot: f.slot, ballOut: sim.throwAt >= 0, depth: +((f.pos.x - los) * dir).toFixed(2), width: +Math.abs(f.pos.y - ballY).toFixed(2),
            speed: +Math.hypot(f.vel.x, f.vel.y).toFixed(2), nearPos: near.player.position, nearDist: +nd.toFixed(2), closing: +closing.toFixed(2), P: look?.P ?? null, need: look?.need ?? null }));
        }
      }
    };
    const r = sim.run(), s = sim.stats;
    const flats = starters.map((a: any) => a.player.id);
    for (const e of log) rows.push(JSON.stringify(e));
    if (flats.length) outcome.push(JSON.stringify({ key, concept: sim.offCall.pass?.id, flats: flats.length, targetFlat: !!s.target && flats.includes(s.target),
      att: !!s.attempted, cmp: !!s.completed, yards: +r.yards.toFixed(2), ttt: s.timeToThrow ?? null, evals: log.length }));
  });
}
writeFileSync(`out/call-mix/flat-open-${arm}.jsonl`, rows.join('\n') + '\n');
writeFileSync(`out/call-mix/flat-plays-${arm}.jsonl`, outcome.join('\n') + '\n');
writeFileSync(`out/call-mix/flat-fixed-${arm}.jsonl`, fixed.join('\n') + '\n');
console.log(arm, 'flat evaluations', rows.length, 'plays with a flat', outcome.length);
