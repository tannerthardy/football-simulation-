import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

/** Play-action run look, ended by what happens to the lineman rather than a
 * clock (PUNCH; the owner's request, 2026-11-12). The playbook has one
 * generic play-action protection today: a `fake` on the concept, no
 * protection type (aggressive run-action, boot, gap fake with a puller, plain
 * set). Those types are Rules+Coaching's concept queue; this is only the
 * transition. On a fake a lineman shows run -- low pads, firing out, hands on
 * his pass-pro man -- until: he has engaged his man; he has reached his depth
 * limit (a yard past the line); his man has declared a pass rush (seen in the
 * backfield, half a yard past the line, coming on); or he stops selling
 * (stands up), which a poor seller does early: his patience is his discipline
 * (0.35 s at none to 1.0 s at full). Off (PUNCH off), every lineman showed
 * low pads for 0.35 s and the interior held at the line for 0.35 s. */
const lookOver = new WeakMap<PlaySim, Set<Agent>>();

export function paRunLook(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  if (sim.offCall.kind !== 'pass' || !sim.offCall.pass?.fake) return false;
  let over = lookOver.get(sim);
  if (!over) { over = new Set(); lookOver.set(sim, over); }
  if (over.has(a)) return false;
  const dir = sim.attackDir(a.team);
  let end = !!a.engagement || (a.pos.x - sim.los) * dir > 1.0 || sim.t > 0.35 + 0.65 * a.r('discipline');
  if (!end && man) {
    const seen = sim.see(a, man);
    end = (sim.los - seen.pos.x) * dir > 0.5 && -seen.vel.x * dir > 1.0;
  }
  if (end) over.add(a);
  return !end;
}
