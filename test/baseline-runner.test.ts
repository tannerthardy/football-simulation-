import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const launcher = resolve('scripts/baseline.mjs');
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const info = (extra: string[] = [], env: NodeJS.ProcessEnv = {}) => JSON.parse(execFileSync(process.execPath,
  [launcher, '--info', '--candidate', ...extra], { encoding: 'utf8', env: { ...process.env, ...env } }));

describe('shared baseline runs are explicit and cannot inherit experiments', () => {
  it('stops opted-in verification after failure and explicitly retains the skipped commands', () => {
    const code = `import { runCommands } from ${JSON.stringify(pathToFileURL(launcher).href)};
      const commands = [['cheap'], ['expensive']], run = async command => ({ command, exitCode: 1 });
      console.log(JSON.stringify([await runCommands(commands, run, true), await runCommands(commands, run)]));`;
    const [early, complete] = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' }));
    expect(early.commands).toHaveLength(1); expect(early.skippedCommands).toEqual([['expensive']]);
    expect(complete.commands).toHaveLength(2); expect(complete.skippedCommands).toEqual([]);
  });
  it('resets ambient experiments, ablations and counterfactual defenses', () => {
    const result = info([], { TACKLE_TOUCH: '1', HOLD_SUBSTEPS: '48', LEVER_FACING: '0', CF_FLOW: 'over' });
    expect(result.flags).toEqual(profile.flags);
    expect(result.node).toBe(`v${profile.nodeVersion}`);
    expect(result.mode).toBe('candidate');
    expect(result.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.validationSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('records only explicitly requested experimental settings', () => {
    const result = info(['--flag', 'TACKLE_TOUCH=1', '--flag', 'HOLD_SUBSTEPS=48']);
    expect(result.flags).toEqual({ ...profile.flags, TACKLE_TOUCH: '1', HOLD_SUBSTEPS: '48' });
  });

  it('rejects unknown or malformed overrides before running a command', () => {
    for (const value of ['UNKNOWN_RESEARCH=1', 'TACKLE_TOUCH=maybe', 'HOLD_SUBSTEPS=1.5', 'GAIT_STEP=NaN']) {
      const result = spawnSync(process.execPath, [launcher, '--info', '--candidate', '--flag', value], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toMatch(/Unknown baseline flag|Invalid numeric flag|Flag requires/);
    }
  });

  it('requires new runtime flags to be registered in the shared profile', () => {
    const code = `import { checkFlags, profile } from ${JSON.stringify(pathToFileURL(launcher).href)};
      checkFlags([...Object.keys(profile.flags), 'NEW_UNREGISTERED_FLAG']);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing [NEW_UNREGISTERED_FLAG]');
  });
});
