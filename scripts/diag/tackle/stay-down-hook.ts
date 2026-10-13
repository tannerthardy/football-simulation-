/** Diagnostic-only emulation of the proposed World hook (not production):
 * `Intent.stayDown` keeps a downed body from starting to rise. The proposed
 * engine change passes the intent from `feet` to `passive` and adds
 * `!stayDown` to the down -> rising condition; this module does the same by
 * wrapping those two private methods at runtime. It changes nothing else:
 * falling still completes, rising and upright bodies are unaffected, and
 * clearing the field restores the ordinary rule on the next substep.
 * Import for its side effect, or pass --stay-down-hook to panel/ground-rise.
 */
import { World } from '../../../src/physics/world.js';

const proto = World.prototype as any;
if (!proto.__stayDownHook) {
  proto.__stayDownHook = true;
  const feet = proto.feet, passive = proto.passive;
  proto.feet = function (this: any, i: number, intent: { stayDown?: boolean }, ...rest: unknown[]) {
    this.__stayDown = !!intent?.stayDown;
    try { return feet.call(this, i, intent, ...rest); } finally { this.__stayDown = false; }
  };
  proto.passive = function (this: any, b: unknown, sup: { state: string }, ...rest: unknown[]) {
    // The only transition out of 'down' is the rise; skipping the call while
    // stayDown leaves every other state's rules untouched.
    if (this.__stayDown && sup.state === 'down') return;
    return passive.call(this, b, sup, ...rest);
  };
}
