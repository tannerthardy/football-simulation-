import { World } from '../../src/physics/world.js';
import { beforeEach, afterEach } from 'vitest';
import { appendFileSync, mkdirSync } from 'node:fs';
let usage = { trials: 0, intervals: 0, limited: 0 };
beforeEach(() => { usage = { trials: 0, intervals: 0, limited: 0 }; });
afterEach(ctx => {
  const names: string[] = []; let task: any = ctx.task;
  while (task && task !== ctx.task.file) { names.unshift(task.name); task = task.suite; }
  mkdirSync('out', { recursive: true });
  appendFileSync('out/grip-timing-gate-usage.jsonl', JSON.stringify({ fullName: names.join(' '), ...usage }) + '\n');
});
const step = World.prototype.step;
World.prototype.step = function (...args) {
  if (this.handIntegration === 'centered') {
    Reflect.set(this, 'handContact', 'patch'); Reflect.set(this, 'gripTiming', 'resolved');
  }
  const r = step.apply(this, args);
  if (r.gripTiming) {
    usage.trials += r.gripTiming.trials; usage.intervals += r.gripTiming.intervals;
    usage.limited += r.gripTiming.limited;
  }
  return r;
};
