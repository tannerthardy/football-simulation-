/** Co-flow push bench: two real bodies (an engaged OL and DL taken from a restaged OZ snap), in a fresh World with
 * copies of their joints, both requesting the same lateral velocity. Arms vary the joint, facings and posture to find
 * what caps the pair's shared lateral speed. usage: <capFile> */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { World } from '../../src/physics/world.js';
(PlaySim as any).recordedSingleStream = true;
const plays = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[];
let pair: any = null, sim: any = null;
for (const p of plays) {
  if (p.pass || !/Outside Zone|Wide Zone/.test(p.call)) continue;
  sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  while (sim.phase === 'live' && sim.t < 0.6) sim.tick();
  const e = sim.engagements?.find((e: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(e.blocker.slot) && /^(DE|DT|NT)/.test(e.defender.slot)
    && sim.world.joints.some((j: any) => j.kind === 'hands' && ((j.a === e.blocker.body && j.b === e.defender.body) || (j.b === e.blocker.body && j.a === e.defender.body))));
  if (e) { pair = e; console.log('pair', p.call, e.blocker.slot, '->', e.defender.slot, 'at t', sim.t.toFixed(2)); break; }
}
if (!pair) throw new Error('no engaged OL-DL pair with a hand joint');
const clone = (b: any) => ({ ...b, pos: { ...b.pos }, vel: { x: 0, y: 0 }, spin: 0, support: b.support ? JSON.parse(JSON.stringify(b.support)) : undefined });
const dir = sim.attackDir(pair.blocker.team);
const ob = pair.blocker.body, db = pair.defender.body;
const axis = Math.atan2(db.pos.y - ob.pos.y, db.pos.x - ob.pos.x); // blocker -> defender
const lat = { x: -Math.sin(axis), y: Math.cos(axis) }; // perpendicular to the pair axis
function run(label: string, opts: { joint: boolean; oFace?: number; dFace?: number; posture?: number; solo?: 'O' | 'D'; speed?: number }) {
  const O = clone(ob), D = clone(db);
  const bodies = opts.solo === 'O' ? [O] : opts.solo === 'D' ? [D] : [O, D];
  const w = new World(bodies as any, { substeps: sim.world.substeps, handContact: sim.world.handContact } as any);
  if (opts.joint && !opts.solo) for (const j of sim.world.joints) {
    if (j.kind !== 'hands') continue;
    const pairs = (j.a === ob && j.b === db) || (j.a === db && j.b === ob);
    if (pairs) {
      // Map every body reference (a, b, actor, holder) onto the copies; keep other fields by value.
      const c: any = {};
      for (const [k, v] of Object.entries(j)) c[k] = v === ob ? O : v === db ? D : (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
      w.joints.push(c);
    }
  }
  const s = opts.speed ?? 3.5, v = { x: lat.x * s, y: lat.y * s };
  const oF = axis + (opts.oFace ?? 0) * Math.PI / 180, dF = axis + Math.PI + (opts.dFace ?? 0) * Math.PI / 180;
  const out: string[] = [];
  for (let k = 1; k <= 20; k++) {
    const intents = bodies.map(b => ({ vel: v, facing: b === O ? oF : dF, push: 1, posture: opts.posture ?? 0.85, cutSkill: 0.9 }));
    w.step(intents as any, 0.05);
    if (k === 10 || k === 20) {
      const lv = (b: any) => (b.vel.x * lat.x + b.vel.y * lat.y);
      const ld = (b: any, b0: any) => ((b.pos.x - b0.pos.x) * lat.x + (b.pos.y - b0.pos.y) * lat.y);
      out.push(`@${(k * 0.05).toFixed(1)}s v ${bodies.map(b => lv(b).toFixed(2)).join('/')} disp ${bodies.map(b => ld(b, b === O ? ob : db).toFixed(2)).join('/')}`);
    }
  }
  console.log(label.padEnd(40), out.join(' | '), opts.solo ? '' : `| joints ${w.joints.length} sep ${Math.hypot(O.pos.x - D.pos.x, O.pos.y - D.pos.y).toFixed(2)}`);
}
run('pair, hands joint, square facings', { joint: true });
run('pair, no joint, square facings', { joint: false });
run('pair, hands joint, DL hips open 45', { joint: true, dFace: lat.x * Math.cos(axis + Math.PI) >= 0 ? 45 : -45 });
run('pair, hands joint, both open 45', { joint: true, oFace: 45, dFace: -45 });
run('pair, hands joint, both open -45', { joint: true, oFace: -45, dFace: 45 });
run('OL alone, square (side shuffle)', { joint: false, solo: 'O' });
run('DL alone, square (side shuffle)', { joint: false, solo: 'D' });
run('OL alone, facing travel', { joint: false, solo: 'O', oFace: Math.atan2(lat.y, lat.x) * 180 / Math.PI - axis * 180 / Math.PI });
run('DL alone, facing travel', { joint: false, solo: 'D', dFace: Math.atan2(lat.y, lat.x) * 180 / Math.PI - (axis + Math.PI) * 180 / Math.PI });
run('pair, joint, square, posture 0.3', { joint: true, posture: 0.3 });
