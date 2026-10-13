/** Follow-up on the saved original acquired checkpoint. Physical solves only:
 * identical issued 20 Hz requests, no new football decisions or capacities.
 * Raw state/tape stays in ignored out/. Run with baseline:run --candidate.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { World } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';
import { rep } from '../tackle/panel.js';
import { frozenInterval } from './contact-foundations.js';

type Private = any;
const root = 'out/grip-timing-followup';
mkdirSync(root, { recursive: true });
const original = JSON.parse(readFileSync('out/grip-timing/baseline.json', 'utf8'));
const id = process.argv.find(x => x.startsWith('--id='))?.slice(5) ?? 'patch-45-8-0-3001-1';
const input = original.inputs.find((x: Private) => x.id === id);
if (!input) throw Error('Unknown pinned input');
const bytes = readFileSync(`out/grip-timing/${id}.bin`);
const checksum = createHash('sha256').update(bytes).digest('hex');
if (checksum !== original.checkpoints.find((x: Private) => x.id === id).checksum) throw Error('Packet changed');
const saved = deserialize(bytes), source = sourceVersion();
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
if (JSON.stringify(flags) !== JSON.stringify(original.flags)) throw Error('Flag mismatch');

function pose(w: Private, ids: number[]) {
  return ids.map(i => ({ i, pos: { ...w.bodies[i].pos }, vel: { ...w.bodies[i].vel },
    facing: w.bodies[i].facing, spin: w.bodies[i].spin ?? 0, energy: w.bodies[i].energy,
    support: structuredClone(w.bodies[i].support) }));
}
const frozen: Private[] = [];
if (!process.argv.includes('--tape-only')) for (const [n, timing] of [[12, 'resolved'], [96, 'resolved'], [4096, 'midpoint']] as const) {
  const start = performance.now(), r = frozenInterval(saved, n, 'full', .05, timing);
  const row = { n, timing, seconds: (performance.now() - start) / 1000, integration: r.integration, end: r.end,
    firstPlacement: r.ground.find(g => g.command && Math.hypot(g.command.x, g.command.y) > 1e-9),
    maximumPlacement: Math.max(...r.ground.map(g => Math.hypot(g.command?.x ?? 0, g.command?.y ?? 0))),
    energyError: r.energyError, momentumError: r.momentumError };
  frozen.push(row); console.log(JSON.stringify({ frozen: row }));
}

const tapeFile = `${root}/${id}-tape.bin`;
if (!process.argv.includes('--frozen-only')) {
  if (!process.argv.includes('--replay')) {
    let fields: Private, entries: Private[] = [];
    const step = World.prototype.step;
    World.prototype.step = function (intents, dt) {
      const w = this as Private;
      if (!fields && w.time >= saved.fields.time - 1e-8 && w.joints.some((j: Private) => j.kind === 'grasp' && !j.broken)) {
        const f = { ...w }; delete f.attachments;
        fields = structuredClone({ fields: f, attachments: w.joints.map((j: Private) => [j, w.attachments.get(j)]).filter((p: any) => p[1]) });
      }
      if (fields && entries.length < 16) entries.push({ time: w.time, dt, intents: structuredClone(intents) });
      return step.call(this, intents, dt);
    };
    try { rep(input.cell, input.side, input.seed, { handContact: input.mode, substeps: 96 }); }
    finally { World.prototype.step = step; }
    if (!fields || entries.length !== 16 || Math.abs(entries[0].time - saved.fields.time) > 1e-8) throw Error('Acquired start mismatch');
    writeFileSync(tapeFile, serialize({ ...fields, entries, ids: saved.args[0], baseline: original.baseline,
      originalSource: original.source, source, id, flags, checksum }));
  }
  const tape = deserialize(readFileSync(tapeFile));
  const audit: Private[] = [];
  for (const n of [12, 96]) {
    const p = structuredClone(tape), w: Private = Object.assign(Object.create(World.prototype), p.fields);
    w.attachments = new WeakMap(p.attachments); w.substeps = n; w.gripTiming = 'resolved';
    if (process.argv.includes('--audit')) {
      const substep = w.integrateSubstep;
      w.integrateSubstep = function (...args: Private[]) {
        if (args[7] && this.joints.some((j: Private) => j.kind === 'grasp' && !j.broken) && audit.filter(a => a.n === n).length < 400) {
          const f = { ...this }; delete f.attachments;
          for (const k of Object.keys(f)) if (typeof f[k] === 'function') delete f[k];
          const start = structuredClone({ fields: f, args,
            attachments: this.joints.map((j: Private) => [j, this.attachments.get(j)]).filter((q: Private) => q[1]) });
          const solve = (pieces: number) => {
            const q = structuredClone(start), s = Object.assign(Object.create(World.prototype), q.fields);
            s.attachments = new WeakMap(q.attachments);
            for (let k = 0; k < pieces; k++) {
              const a = [...q.args]; a[3] = args[3] / pieces; a[4] = args[4] - k * a[3];
              s.integrateInterval(...a);
            }
            return s;
          };
          const a = solve(1), b = solve(2), norm = (x: Private, y: Private) => Math.hypot((x?.x ?? 0)-(y?.x ?? 0), (x?.y ?? 0)-(y?.y ?? 0));
          let bodyError = 0, xiError = 0, accelError = 0;
          for (const i of args[0]) {
            const x = a.bodies[i], y = b.bodies[i];
            bodyError = Math.max(bodyError, norm(x.pos,y.pos)/5e-7, norm(x.vel,y.vel)/2.5e-5,
              Math.abs(x.facing-y.facing)/2.5e-6, Math.abs((x.spin??0)-(y.spin??0))/2.5e-4);
            xiError = Math.max(xiError,norm(x.support.xi,y.support.xi));
            accelError = Math.max(accelError,norm(x.support.accel,y.support.accel),norm(x.support.tipAccel,y.support.tipAccel));
          }
          const dose = (q: Private) => q.joints.reduce((s: number,j: Private) => s+(j.kind==='grasp' ? j.force??0 : 0),0)
            - start.fields.joints.reduce((s: number,j: Private) => s+(j.kind==='grasp' ? j.force??0 : 0),0);
          const d = Math.max(dose(a),dose(b));
          if (d < 1e-10 && (bodyError > 0 || xiError > 0) || bodyError <= 1 && xiError > 5e-7) {
            const row = { n, time: this.time, h: args[3], dose: d, bodyError, xiError, accelError,
              start: pose(this,args[0]), coarse: pose(a,args[0]), fine: pose(b,args[0]) };
            audit.push(row);
            if (audit.filter(x => x.n === n).length === 1) {
              writeFileSync(`${root}/${id}-${n}-first-skip.bin`, serialize(start));
              console.log(JSON.stringify({ firstSkippedEstimate: { n, time: row.time, h: row.h, dose: d, bodyError, xiError, accelError } }));
            }
          }
        }
        return substep.apply(this,args);
      };
    }
    const rows: Private[] = [{ time: w.time, bodies: pose(w, p.ids) }];
    const start = performance.now();
    for (const e of p.entries.slice(0, Number(process.argv.find(x => x.startsWith('--ticks='))?.slice(8) ?? 16))) {
      const report = w.step(e.intents, e.dt);
      rows.push({ time: w.time, bodies: pose(w, p.ids), grips: w.joints.map((j: Private) => ({
        broken: j.broken ?? false, slipping: j.slipping ?? false, legs: j.legs, hold: j.hold, force: j.force })),
        integration: report.gripTiming, work: report.work, supportWork: report.supportMotorWork,
        leanSum: p.ids.map((i: number) => ({ i, x: w.leanX[i], y: w.leanY[i] })) });
      console.log(JSON.stringify({ tape: id, n, time: w.time, bodies: rows.at(-1)!.bodies.map((b: Private) =>
        ({ i: b.i, pos: b.pos, xi: b.support.xi, state: b.support.state })), integration: report.gripTiming }));
    }
    writeFileSync(`${root}/${id}-${n}.json`, JSON.stringify({ source, flags, id, checksum, n, tapeSource: tape.source,
      seconds: (performance.now() - start) / 1000, tapeChecksum: createHash('sha256').update(readFileSync(tapeFile)).digest('hex'), rows }, null, 2));
  }
  if (audit.length) writeFileSync(`${root}/${id}-audit.json`, JSON.stringify({ source, flags, checksum, audit },null,2));
}
if (frozen.length) writeFileSync(`${root}/${id}-frozen.json`, JSON.stringify({ source, flags, id, checksum, frozen }, null, 2));
if (sourceVersion() !== source) throw Error('Source changed');
