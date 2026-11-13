import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Content identifier, including uncommitted engine edits. Run from repo root. */
export function sourceVersion(): string {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
  const hash = createHash('sha256');
  for (const file of files('src')) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
}
