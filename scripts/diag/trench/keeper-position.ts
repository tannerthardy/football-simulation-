/** Causal probe only: retain a keeper's existing runoff technique for ONE
 * decision beat when its first reach re-read says it cannot gain the shoulder.
 * No extra see(), no neighbor/future state, no changed body or contact laws.
 * Run with the same arguments/environment as defense/flow-panel.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import type { ZoneReachRead } from '../../../src/sim/zone-reach.js';

const records: unknown[] = [];
const mode = process.env.KEEPER_POSITION_MODE ?? 'one-beat-runoff';
if (!['one-beat-runoff', 'omit-rg-track'].includes(mode)) throw new Error(`Unknown probe mode ${mode}`);
const previous = new WeakMap<RunBlocker, ZoneReachRead>();
const intervened = new WeakSet<RunBlocker>();
const context = new WeakMap<RunBlocker, string>();
const motion = RunBlocker.prototype.contactMotion;
if (mode === 'omit-rg-track') RunBlocker.prototype.contactMotion = function (a) {
  const proposed = motion.call(this, a);
  if (a.slot !== 'RG' || !proposed) return proposed;
  if (!intervened.has(this)) records.push({ input: context.get(this), actor: a.idx, slot: a.slot,
    proposed, note: 'Omit only RG held-reach track; retain its ordinary seal/mirror/anchor controller.' });
  intervened.add(this);
  return null;
};
const update = RunBlocker.prototype.update;
RunBlocker.prototype.update = function (a, sim) {
  context.set(this, sim.offCall.label);
  const old = previous.get(this);
  const command = update.call(this, a, sim);
  const read = this.zoneRead;
  if (mode === 'one-beat-runoff' && read && old && read.t !== old.t && !intervened.has(this)
    && a.tags.has('combo-stay') && a.engagement?.blocker === a
    && old.phase === 'runoff' && read.phase === 'reach'
    && read.neededTravel > read.availableTravel) {
    records.push({ input: sim.offCall.label, t: sim.t, actor: a.idx, slot: a.slot,
      old: structuredClone(old), proposed: structuredClone(read),
      position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing });
    intervened.add(this);
    read.phase = 'runoff';
    read.drive = { ...old.drive };
    read.sealTarget = -read.side * .3;
    read.aim = { x: read.seen.pos.x - .3, y: read.seen.pos.y - read.side * .6 };
    this.plan.drive = { ...read.drive };
    Reflect.get(this, 'applyZoneContact').call(this, a, sim);
  }
  if (read) previous.set(this, structuredClone(read));
  return command;
};
await import('../defense/flow-panel.js');
writeFileSync(`${process.argv[2]}.interventions.json`, JSON.stringify({
  protocol: 'keeper-position-causal-probe', mode,
  probeSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  executions: 'For each input: recorded execution, then plain execution; repeated records verify the same intervention.',
  productionChange: false, records,
}, null, 2));
