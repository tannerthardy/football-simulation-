import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { buildSetup, defaultRecipe, preview, run, runSetup, runSummary, scenarioFromRecipe, trace, type Recipe, type Scenario } from '../lab-app/engine.js';
import { gameHash } from '../lab-app/game-hash.js';

const recipe = (over: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...over });
/** Everything the engine produced for one play, in a comparable form (wall time is not football). */
const outcome = (r: ReturnType<typeof run>) => JSON.stringify({ ...r, summary: { ...r.summary, ms: 0 } });

function withCoachHand(s: Scenario): Scenario {
  const p = preview(s), i = p.roster.findIndex(r => r.team === 'D' && r.slot === 'CB_S');
  return { ...s, interventions: [{ id: 'align-D-CB_S', kind: 'align', by: "coach's hand", team: 'D', slot: 'CB_S',
    playerId: p.roster[i].playerId, from: { x: p.native[i].x, y: p.native[i].y }, to: { x: p.native[i].x + 3, y: p.native[i].y } }] };
}

describe('Play Lab', () => {
  it('leaves ordinary games byte-identical: same games-identical hash with the lab used in-process as in a fresh process without it', () => {
    // Use the lab the way Tanner does first: a coach's hand, edited ratings, a trace and a batch run.
    const s = withCoachHand(scenarioFromRecipe(recipe({ edits: [{ playerId: 'DEF-CB1', ratings: { press: 99 } }] })));
    run(s); runSummary(s, 3); trace(s, { team: 'D', slot: 'CB_S' }, 0, 2);
    const withLab = gameHash(7, 12);
    const fresh = execFileSync(process.execPath, ['--import', 'tsx', 'lab-app/game-hash.ts', '7', '12'], { encoding: 'utf8' }).trim();
    expect(withLab).toBe(fresh);
  });

  it('adds nothing to a play without the coach\'s hand: absent and empty alignment run identically', () => {
    const setup = buildSetup(recipe({ offense: { formation: 'ace_11', kind: 'run', concept: 'iz_strong', flip: false }, defense: { ...defaultRecipe().defense, personnel: 'base43' } }));
    const plain = new PlaySim({ ...setup, record: true, recordLevel: 'full' }).run();
    const empty = new PlaySim({ ...buildSetup(recipe({ offense: { formation: 'ace_11', kind: 'run', concept: 'iz_strong', flip: false }, defense: { ...defaultRecipe().defense, personnel: 'base43' } })), alignment: [], record: true, recordLevel: 'full' }).run();
    expect(JSON.stringify(empty)).toBe(JSON.stringify(plain));
  });

  it('replays the same play from the same scenario file, through its saved setup bytes', () => {
    const s = withCoachHand(scenarioFromRecipe(recipe()));
    const file = JSON.parse(JSON.stringify(s)) as Scenario;
    expect(outcome(run(file))).toBe(outcome(run(s)));
    // The stored bytes are the same constructor input the recipe builds.
    const direct = new PlaySim({ ...buildSetup(s.recipe!), alignment: [{ team: 'D', slot: 'CB_S', pos: s.interventions[0].to }], record: true, recordLevel: 'full', recordEvery: 1 }).run();
    expect(JSON.stringify(run(s).events)).toBe(JSON.stringify(direct.events));
  });

  it("puts a hand-placed player, and his installed spot, where the coach put him before any staging", () => {
    const s = withCoachHand(scenarioFromRecipe(recipe({ defense: { personnel: 'nickel', front: 'over', coverage: 'cover1', pressure: null, zoneStyle: 'match' } })));
    const iv = s.interventions[0];
    const sim = new PlaySim(runSetup(s));
    const cb = sim.bySlot.get('CB_S')!;
    expect(cb.pos.x).toBeCloseTo(iv.to.x, 9);
    expect(cb.pos.y).toBeCloseTo(iv.to.y, 9);
    expect(sim.defAlign.spots.CB_S!.pos).toEqual(cb.pos);
    // Nobody else moves; the engine still owns the rest of the snap.
    const native = new PlaySim(runSetup({ ...s, interventions: [] }));
    for (const a of sim.agents) if (a.slot !== 'CB_S') expect(a.pos).toEqual(native.bySlot.get(a.slot)!.pos);
  });

  it('refuses a hand placement for a slot that is not in the play', () => {
    const setup = buildSetup(recipe());
    expect(() => new PlaySim({ ...setup, alignment: [{ team: 'D', slot: 'LB_S', pos: { x: 45, y: 20 } }] })).toThrow(/not in this play/);
  });
});
