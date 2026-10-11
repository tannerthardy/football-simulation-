/** Bad phase metadata must fail before loading or publishing any saved film. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const exporter = resolve('scripts/export-combo-transfer.ts');
const good = { title: 'controlled run-game comparison',
  phaseLabels: ['Baseline: d087104', 'Run skills and observed recovery'],
  explanation: 'Recorded controller changes; the shared physics world is unchanged.' };

describe('saved comparison metadata', () => {
  it.each([
    ['invalid JSON', '{'],
    ['non-object', '[]'],
    ['unknown field', JSON.stringify({ ...good, labels: good.phaseLabels })],
    ['missing explanation', JSON.stringify({ title: good.title, phaseLabels: good.phaseLabels })],
    ['ambiguous phases', JSON.stringify({ ...good, phaseLabels: ['same', 'same'] })],
    ['missing phase', JSON.stringify({ ...good, phaseLabels: ['baseline'] })],
    ['non-text phase', JSON.stringify({ ...good, phaseLabels: ['baseline', 2] })],
    ['empty title', JSON.stringify({ ...good, title: ' ' })],
  ])('rejects %s without reading absent films or creating an output', (_name, metadata) => {
    const folder = mkdtempSync(join(tmpdir(), 'replay-metadata-'));
    try {
      const config = join(folder, 'metadata.json'), output = join(folder, 'review.html');
      writeFileSync(config, metadata);
      let error: { stderr?: Buffer; status?: number } | undefined;
      try {
        execFileSync(process.execPath, ['--import', 'tsx', exporter,
          join(folder, 'missing-before-film.json.gz'), join(folder, 'missing-after-film.json.gz'), output, config],
        { cwd: process.cwd(), stdio: 'pipe', timeout: 15_000 });
      } catch (caught) { error = caught as typeof error; }
      expect(error?.status).not.toBe(0);
      expect(error?.stderr?.toString()).toContain('Invalid comparison metadata');
      expect(error?.stderr?.toString()).not.toContain('ENOENT');
      expect(existsSync(output)).toBe(false);
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
});
