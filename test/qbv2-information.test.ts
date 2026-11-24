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
const AGENT_FILES = ['drive.ts', 'roles.ts', 'presnap.ts', 'cycle.ts', 'look.ts', 'plan.ts', 'ratings.ts'];

/** Paid: drive.ts no longer reads a defender's roster position (Flex's isDbSlot, the visible package's slots). */
const DEBT: Record<string, { reads: number; why: string }> = {
  'drive.ts:player.position': { reads: 0, why: 'paid 2026-11-24: isDbSlot on the visible package' },
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

  it('covers every module in src/sim/qbv2 (a new file is scanned or listed as pure)', () => {
    const pure = ['judge.ts'];
    expect(files.filter((f) => !AGENT_FILES.includes(f) && !pure.includes(f))).toEqual([]);
  });
});
