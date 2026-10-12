/** Pad heights and the implied vertical share of a push for linemen pairs,
 * from generated rosters at the run-rep posture. */
import { contactFixture } from '../run-contact-technique.js';
import { padHeightAt, supportParams } from '../../../src/physics/support.js';
const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11 });
const show = (a: typeof f.blocker) => { const sp = supportParams(a.profile); return `${a.slot} h=${(a.profile.heightYd * 36).toFixed(1)}in m=${a.profile.massKg.toFixed(0)}kg bend=${(a.profile.bend ?? .5).toFixed(2)} pad@.85=${padHeightAt(sp, .85).toFixed(3)} pad@.6=${padHeightAt(sp, .6).toFixed(3)}`; };
console.log(show(f.blocker)); console.log(show(f.defender));
const pads = (a: typeof f.blocker) => padHeightAt(supportParams(a.profile), .85);
const d = Math.hypot(f.blocker.pos.x - f.defender.pos.x, f.blocker.pos.y - f.defender.pos.y);
console.log(`center distance ${d.toFixed(2)} yd; vertical share of push ${((pads(f.blocker) - pads(f.defender)) / d).toFixed(3)}`);
const all = [...f.sim.offense, ...f.sim.defense].filter((a) => ['LT','LG','C','RG','RT','DE_S','DE_W','DT_S','DT_W','NT'].includes(a.slot));
for (const a of all) console.log('  ', show(a));
