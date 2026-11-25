import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// QB_V2 information guard (QB lane, 2026-11-24; Integration's ruling after the outside audit's §1 row 14). The passer's
// modules decide from his own pictures: the seen pose, his estimates and his forecasts. They never read a body's true
// position, its true pose (isDown), the engagement record, another player's behavior or assignment, or who holds the
// ball. judge.ts is a pure function of SeenDefender pictures (its `.pos` is the picture) and is not scanned for
// positions. A new read fails here; shrink a debt row when it is paid.
const HIDDEN = /\.isDown\(|\.engagement\b|\.behavior\b|\.assignment\b|\bsim\.carrier\b|\bsim\.ball\b/g;
/** True body positions of other agents: `x.pos` on an Agent, except the passer's own (`h.a.pos`, `a.pos` in the host). */
const BODY_POS = /(?<![\w.])(?!h\.a\.)(?:r|d|t|s1|rc|cov|target|recv|def)\.pos\b/g;
/** Files holding real Agents (the rest are pure over pictures and plans). */
const AGENT_FILES = ['host.ts', 'drive.ts', 'roles.ts', 'presnap.ts', 'cycle.ts', 'look.ts', 'plan.ts', 'ratings.ts'];

/** The defense's identity (the outside reviewer's second read, 2026-11-25): the defense's call, and a defender's slot
 * label, roster position, true profile or ratings. Who a man is comes from what the passer sees (alignment, grouping,
 * the scouting report through the view), never from these. Defender-named variables only: his own receivers are looked
 * up by the play's install (`sim.slot(...)`), and his own ratings are his (`v.ratings`). */
const DEF_ID = /\bsim\.defCall\b|(?<![\w.])(?:d|m|def|cov|k)\.(?:slot|profile|ratings|player)\b/g;
/** Delayed truth through `sim.see` (no cone gate): head and pose must come from his cone-updated picture. */
const SEE = /\.see\(/g;

/** Listed debt: each row a counted read with its reason; a new read fails, a paid row shrinks. */
const DEBT: Record<string, { reads: number; why: string }> = {
  'drive.ts:player.position': { reads: 0, why: 'paid 2026-11-24: isDbSlot on the visible package' },
  // drive.ts picture(): db = isDbSlot(sim.defCall.personnel, d.slot). Deferred, Flex's rule (second read §1 boundary):
  // which men are defensive backs is visible (bodies, numbers, the grouping that ran on), but it is read through the
  // call and the slot label, not through his perception. It moves when perception carries a seen grouping.
  'drive.ts:defense identity': { reads: 2, why: 'isDbSlot via the call personnel and d.slot: Flex, to perception' },
  // drive.ts seenUp(): sim.see(...).pose. Deferred to gate 2 (cone-gated head and pose everywhere), Tools' sim.see.
  'drive.ts:sim.see': { reads: 1, why: 'pose from sim.see, no cone gate: gate 2 (Tools)' },
};

describe('QB_V2 information guard', () => {
  const dir = new URL('../src/sim/qbv2/', import.meta.url).pathname;
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
  const code = (f: string) => readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');

  it('reads no hidden state (true pose, engagement, behavior, assignment, the ball holder) in any module', () => {
    const hits = files.flatMap((f) => (code(f).match(HIDDEN) ?? []).map((m) => `${f}: ${m}`));
    expect(hits).toEqual([]);
  });

  it("reads no other body's true position in the modules that hold Agents", () => {
    const hits = files.filter((f) => AGENT_FILES.includes(f)).flatMap((f) => (code(f).match(BODY_POS) ?? []).map((m) => `${f}: ${m}`));
    expect(hits).toEqual([]);
  });

  it('keeps the listed debt at or below its count', () => {
    const n = (code('drive.ts').match(/\.player\.position\b/g) ?? []).length;
    expect(n).toBeLessThanOrEqual(DEBT['drive.ts:player.position'].reads);
  });

  it("reads no defender's identity (the call, slot label, roster position, profile, ratings) beyond the listed debt", () => {
    const hits = files.flatMap((f) => (code(f).match(DEF_ID) ?? []).map((m) => `${f}: ${m}`));
    expect(hits.filter((h) => !h.startsWith('drive.ts:'))).toEqual([]);
    expect(hits.filter((h) => h.startsWith('drive.ts:')).length).toBeLessThanOrEqual(DEBT['drive.ts:defense identity'].reads);
  });

  it('takes head and pose through sim.see only where listed (gate 2)', () => {
    const hits = files.flatMap((f) => (code(f).match(SEE) ?? []).map((m) => `${f}: ${m}`));
    expect(hits.filter((h) => !h.startsWith('drive.ts:'))).toEqual([]);
    expect(hits.length).toBeLessThanOrEqual(DEBT['drive.ts:sim.see'].reads);
  });

  it('covers every module in src/sim/qbv2 (a new file is scanned or listed as pure)', () => {
    const pure = ['judge.ts'];
    expect(files.filter((f) => !AGENT_FILES.includes(f) && !pure.includes(f))).toEqual([]);
  });
});
