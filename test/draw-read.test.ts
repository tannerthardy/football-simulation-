import { afterEach, describe, expect, it, vi } from 'vitest';

// DRAW_READ is read when recognition.ts loads, so each arm imports the engine fresh.
async function draws(flag: string) {
  vi.resetModules();
  vi.stubEnv('DRAW_READ', flag);
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { drawReadEnabled } = await import('../src/sim/recognition.js');
  let beforeGive = 0, linebackers = 0;
  for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) {
    const sim = new PlaySim(nativeTraceSetup({ coverage, concept: 'draw', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const lbs = sim.defense.filter(d => d.slot.startsWith('LB'));
    const was = new Map(lbs.map(l => [l, 'unsure' as string]));
    const step = sim.tick.bind(sim);
    (sim as any).tick = () => {
      step();
      for (const l of lbs) {
        const r = l.recog!.read;
        // Changed to run on what the line shows, before his own picture of the ball in the back's hands.
        if (was.get(l) === 'pass' && r === 'run' && !(l.recog as any).sawGive) beforeGive++;
        was.set(l, r);
      }
    };
    sim.run();
    linebackers += lbs.length;
  }
  return { enabled: drawReadEnabled(), beforeGive, linebackers };
}
afterEach(() => vi.unstubAllEnvs());

describe('DRAW_READ: a committed pass read yields to a line that turns to run blocking', () => {
  it('backers who read pass on a draw change to run before seeing the give only with the re-read', async () => {
    const on = await draws('1'), off = await draws('0');
    expect(on.enabled).toBe(true);
    expect(off.enabled).toBe(false);
    // Off, a committed pass read changes only on the posterior, which the
    // situation prior holds above the threshold until he sees the give.
    expect(off.beforeGive).toBe(0);
    expect(on.beforeGive).toBeGreaterThan(on.linebackers / 3);
  }, 120_000);
});

// The two directions of a commitment change stay coherent once what he saw has
// defeated the situation's prior: the prior alone does not bring the pass back
// (which reversed real commands run -> pass -> run on 3rd and 12), while a pass
// set or the throw he sees still does.
async function reads(concept: string, opts: { coverages?: string[]; seeds?: number; down?: number; toGo?: number } = {}) {
  vi.resetModules();
  vi.stubEnv('DRAW_READ', '1');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const out: { slot: string; seq: string[]; sawPass: boolean; afterPass: string | null; window: string[]; runBeforeCatch: boolean }[] = [];
  for (const coverage of opts.coverages ?? ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= (opts.seeds ?? 6); seed++) for (const flip of [false, true]) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip });
    setup.down = opts.down ?? 3; setup.firstDownX = setup.los + (opts.toGo ?? 12);
    const sim = new PlaySim(setup);
    const lbs = sim.defense.filter(d => d.slot.startsWith('LB'));
    const rec = new Map(lbs.map(l => [l, { slot: l.slot, seq: [] as string[], sawPass: false, afterPass: null as string | null, window: [] as string[], runBeforeCatch: false }]));
    const step = sim.tick.bind(sim);
    (sim as any).tick = () => {
      const at = sim.t; step();
      for (const l of lbs) {
        const r = l.recog!.read, o = rec.get(l)!;
        if (o.seq[o.seq.length - 1] !== r) o.seq.push(r);
        if (r === 'run' && !sim.events.some(e => e.type === 'catch' || e.type === 'scramble')) o.runBeforeCatch = true;
        if ((l.recog as any).sawPass) { o.sawPass = true; o.afterPass = r; }
        if (at >= 1.2 - 1e-9 && at <= 1.8 + 1e-9) o.window.push(r);
      }
    };
    sim.run();
    out.push(...rec.values());
  }
  return out;
}
const reversals = (seq: string[]) => seq.join('>').split('run>pass>run').length - 1;

describe('DRAW_READ: coherent change of mind once the picture defeats the prior', () => {
  it('3rd and 12 draw (cover3, seed 1, both mirrors): LB_W changes to run once and stays', async () => {
    for (const r of (await reads('draw', { coverages: ['cover3'], seeds: 1 })).filter(r => r.slot === 'LB_W')) {
      const changes = r.window.filter((x, i) => i > 0 && x !== r.window[i - 1]).length;
      expect(changes).toBeLessThanOrEqual(1);
      expect(r.window[r.window.length - 1]).toBe('run');
    }
  }, 120_000);

  it('native draws on 3rd and 12: no backer reverses run -> pass -> run, and the draw is still read', async () => {
    const all = await reads('draw');
    expect(all.reduce((n, r) => n + reversals(r.seq), 0)).toBe(0);
    expect(all.filter(r => r.seq.join('>').includes('pass>run')).length).toBeGreaterThan(all.length / 2);
  }, 240_000);

  it('opposing control, strong pass prior on a real dropback: no backer commits run', async () => {
    for (const concept of ['dagger', 'four_verts']) {
      const all = await reads(concept);
      // Judged up to the catch or a scramble. A receiver running with the ball is a runner: with the receivers' route reads
      // (#420), dagger cover1 seed 5 has a 2.7 s catch-and-run on which LB_W reads run at 6.4 s.
      // Likewise a scrambling quarterback: with #419's alignment, dagger cover1 seed 5 flipped has a scramble at
      // 2.95 s and LB_W reads run at 3.55 s.
      // With the QB's throwing motion (#408) as well, four_verts cover2 seed 1 flipped is a scramble from 2.85 s on
      // which both backers read run at 5.25 s with the QB past the line; that is a runner too.
      expect(all.filter(r => r.runBeforeCatch).length).toBe(0);
    }
  }, 240_000);

  it('play action: a backer who bit on the fake and then sees the throw reads pass again', async () => {
    const bit = (await reads('pa_post_dig')).filter(r => r.seq.includes('run') && r.sawPass);
    expect(bit.length).toBeGreaterThan(0);
    for (const r of bit) expect(r.afterPass).toBe('pass');
  }, 240_000);
});
