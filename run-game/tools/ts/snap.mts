// node --import tsx snap.mts <seedfile> <index> <slot> — replay one saved snap (shift 0) and print the puller's work vs the runner.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { PlaySim } = await import(pathToFileURL(`${root}/src/sim/playsim.ts`).href);
const { restoreSetup } = await import(pathToFileURL(`${root}/scripts/diag/saved-play.ts`).href);
const [file, idx, who, out] = process.argv.slice(2);
const snap = JSON.parse(readFileSync(file, 'utf8'))[Number(idx)];
const raw = Buffer.from(snap.setup, 'base64');
if (out) writeFileSync(out, raw);
console.log('call', snap.call, 'setup sha256', createHash('sha256').update(raw).digest('hex'));
const sim = new PlaySim(restoreSetup(raw));
const tick = sim.tick.bind(sim); let n = 0, last = '';
const rel = (a: any) => `${((a.pos.x - sim.los) * sim.attackDir('O')).toFixed(1)},${(a.pos.y - sim.ballY).toFixed(1)}`;
sim.tick = () => { tick(); n++;
  const a = sim.slot(who)!, b = a.behavior as any, e = a.engagement, c = sim.carrier;
  const k = `${b.plan.pullRole} tgt=${b.plan.target?.slot ?? '-'} eng=${e ? (e.blocker === a || e.helpers.includes(a) ? e.defender.slot : '?') : '-'}`;
  if (k !== last || n % 10 === 0) { last = k; const t = b.plan.target;
    console.log(sim.t.toFixed(2), who, rel(a), k, t ? `${t.slot} ${rel(t)}` : '', '| carrier', c?.slot, c ? rel(c) : '', e ? `load ${Math.hypot(...(sim.world.joints.find((j: any) => j.a === a.body || j.b === a.body)?.impulse ? [0, 0] : [0, 0])).toFixed(0)}` : ''); }
};
const r = sim.run();
console.log('result', r.yards.toFixed(2), r.outcome, r.events.filter((e: any) => ['carrier_contact', 'tackle_wrap', 'tackle', 'pull_turn_up'].includes(e.type)).map((e: any) => `${e.t.toFixed(2)} ${e.type} ${sim.agents[e.a]?.slot}->${sim.agents[e.b]?.slot ?? ''}`).join('; '));
