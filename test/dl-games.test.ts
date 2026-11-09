/** DL_GAMES: called defensive-line games. A run-down movement (angle, slant,
 * pinch) moves each called lineman one gap along the line from the snap and the
 * backers re-fit the gaps it vacates, so the front stays balanced (no gap gets a
 * second first-level owner while another is left that was owned). The mover
 * executes the call on the snap, whatever the man in front of him does. A twist
 * is a pass-rush exchange: the crasher attacks his partner's gap and the looper,
 * after a jab, comes around behind him into the gap he left. */
import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';
PlaySim.recordedSingleStream = true;
const slot = (sim: PlaySim, s: string) => sim.slot(s as Agent['slot'])!;
function snap(concept: string, formation: string, flip: boolean, dlGame?: object) {
  const setup: any = nativeTraceSetup({ coverage: 'cover3', concept, seed: 1, roster: 7, formation, flip });
  if (dlGame) setup.defCall = { ...setup.defCall, dlGame };
  return new PlaySim(setup);
}
const owners = (sim: PlaySim) => {
  const c = new Map<string, string[]>();
  for (const d of sim.defense) { const j = d.runFit; if (!j || j.kind === 'alley' || j.kind === 'force') continue;
    const k = `${j.gap}${j.side > 0 ? '+' : '-'}`; c.set(k, [...(c.get(k) ?? []), d.slot]); }
  return c;
};

describe('a called run-down line game keeps the front balanced', () => {
  for (const flip of [false, true]) for (const game of [{ kind: 'angle', dir: 'S' }, { kind: 'slant', dir: 'W' }, { kind: 'pinch', dir: 'S' }]) {
    it(`${game.kind} ${game.dir}${flip ? ' (flipped)' : ''}: movers change gap, no gap gains a second owner, and no more gaps are left open`, () => {
      const base = snap('iz_strong', 'ace_11', flip); base.tick();
      const moved = snap('iz_strong', 'ace_11', flip, game); moved.tick();
      const b = owners(base), m = owners(moved);
      const changed = moved.defense.filter(d => ['DE_S', 'DE_W', 'DT_S', 'DT_W'].includes(d.slot)
        && (d.runFit!.gap !== slot(base, d.slot).runFit!.gap || d.runFit!.side !== slot(base, d.slot).runFit!.side));
      expect(changed.length).toBeGreaterThan(0);
      // First-level linemen never share a gap after the movement.
      for (const [, who] of m) expect(who.filter(s => s.startsWith('D')).length).toBeLessThanOrEqual(1);
      const open = (o: Map<string, string[]>) => ['A+', 'B+', 'C+', 'A-', 'B-', 'C-'].filter(g => !o.has(g)).length;
      expect(open(m)).toBeLessThanOrEqual(open(b));
    });
  }
  it('the mover steps into his new gap on the snap; without the call he does not', () => {
    for (const flip of [false, true]) {
      const lateral = (game?: object) => {
        const sim = snap('iz_strong', 'ace_11', flip, game); sim.tick();
        const dt = slot(sim, 'DT_S'), y0 = dt.pos.y, s = sim.offAlign.strongSign;
        while (sim.t < 0.6 - 1e-9) sim.tick();
        return (dt.pos.y - y0) * s;
      };
      expect(lateral({ kind: 'angle', dir: 'S' })).toBeGreaterThan(0.3);
      expect(lateral()).toBeLessThan(0.1);
    }
  });
});

describe('a twist exchanges two rushers', () => {
  for (const flip of [false, true]) it(`TE twist${flip ? ' (flipped)' : ''}: the end loops inside behind the crashing tackle`, () => {
    const sim = snap('four_verts', 'gun_doubles_11', flip, { kind: 'twist', dir: 'S', pair: 'TE' });
    sim.tick();
    const t = slot(sim, 'DT_S'), e = slot(sim, 'DE_S'), s = Math.sign(e.pos.y - t.pos.y);
    let crossed = false, behind = false;
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < 2.4 && !crossed) {
      sim.tick();
      if ((e.pos.y - t.pos.y) * s < 0) { crossed = true; behind = (e.pos.x - t.pos.x) * dir > 0; }
    }
    expect(crossed).toBe(true);
    // The looper is shallower than the crasher where they cross: he came around behind him.
    expect(behind).toBe(true);
  });
});
