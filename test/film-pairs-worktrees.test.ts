import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readlinkSync, renameSync, symlinkSync, rmSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PairWorktrees } from '../scripts/film-pairs/worktrees.js';

/** A disposable repository, actual project ignore rules, and no ambient excludes
 * masking the bug. Command-scoped settings only; no repo/global config edits. */
function fixture(run: (repo: string, root: string, git: (args: string[]) => string) => void) {
  mkdirSync('out', { recursive: true });
  const root = mkdtempSync(resolve('out', 'pair-lifecycle-'));
  const repo = resolve(root, 'repo'); mkdirSync(repo);
  const git = (args: string[]) => execFileSync('git', ['-c', 'core.excludesFile=/dev/null', ...args],
    { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init']);
  writeFileSync(resolve(repo, '.gitignore'), readFileSync('.gitignore'));
  writeFileSync(resolve(repo, 'tracked.txt'), 'baseline\n');
  git(['add', '.gitignore', 'tracked.txt']);
  git(['-c', 'user.name=Pair lifecycle test', '-c', 'user.email=pair-test@example.invalid', 'commit', '-m', 'fixture']);
  try { run(repo, root, git); }
  finally {
    // Never erase registered worktree paths if lifecycle cleanup regresses.
    // Keep the disposable evidence directory for inspection instead.
    if (git(['worktree', 'list', '--porcelain']).split('\n').filter(l => l.startsWith('worktree ')).length === 1)
      rmSync(root, { recursive: true, force: true });
  }
}

describe('film pair owned-worktree lifecycle', () => {
  it('reproduces the real node_modules/ symlink failure, then removes only its own links and registrations', () => fixture((repo, root, git) => {
    const dependencies = resolve(root, 'dependencies'); mkdirSync(dependencies); writeFileSync(resolve(dependencies, 'keep'), 'untouched');
    const trees = new PairWorktrees(git), paths = ['before', 'after'].map(n => resolve(root, n));
    for (const path of paths) { trees.create(path, 'HEAD'); trees.shareDependencies(path, dependencies); }
    expect(git(['-C', paths[0], 'status', '--porcelain', '--untracked-files=all'])).toContain('?? node_modules');
    expect(spawnSync('git', ['-c', 'core.excludesFile=/dev/null', '-C', paths[0], 'check-ignore', 'node_modules']).status).toBe(1);
    // Original code's exact removal fails under the actual ignore rules.
    expect(() => git(['worktree', 'remove', paths[0]])).toThrow();
    trees.cleanup();
    expect(paths.map(existsSync)).toEqual([false, false]);
    expect(readFileSync(resolve(dependencies, 'keep'), 'utf8')).toBe('untouched');
    expect(git(['worktree', 'list', '--porcelain']).split('\n').filter(l => l.startsWith('worktree '))).toHaveLength(1);
    expect(git(['status', '--porcelain'])).toBe('');
  }));

  it('preserves a replaced dependency link and still cleans the other owned worktree', () => fixture((_repo, root, git) => {
    const dependencies = resolve(root, 'dependencies'), stranger = resolve(root, 'stranger'); mkdirSync(dependencies); mkdirSync(stranger);
    const trees = new PairWorktrees(git), before = resolve(root, 'before'), after = resolve(root, 'after');
    for (const path of [before, after]) { trees.create(path, 'HEAD'); trees.shareDependencies(path, dependencies); }
    const replacement = resolve(root, 'replacement'); symlinkSync(stranger, replacement, 'dir'); renameSync(replacement, resolve(after, 'node_modules'));
    expect(() => trees.cleanup()).toThrow(AggregateError);
    expect(existsSync(before)).toBe(false); expect(existsSync(after)).toBe(true);
    expect(readlinkSync(resolve(after, 'node_modules'))).toBe(stranger);
    // This test created the replacement too; explicitly remove it, then the
    // registered tree normally. The production helper must not do that.
    unlinkSync(resolve(after, 'node_modules')); trees.cleanup();
    expect(existsSync(after)).toBe(false);
  }));

  it('preserves an unfamiliar untracked file without abandoning cleanup of other owned trees', () => fixture((_repo, root, git) => {
    const dependencies = resolve(root, 'dependencies'); mkdirSync(dependencies);
    const trees = new PairWorktrees(git), before = resolve(root, 'before'), after = resolve(root, 'after');
    for (const path of [before, after]) { trees.create(path, 'HEAD'); trees.shareDependencies(path, dependencies); }
    const unfamiliar = resolve(after, 'unfamiliar.txt'); writeFileSync(unfamiliar, 'preserve me');
    expect(() => trees.cleanup()).toThrow(AggregateError);
    expect(existsSync(before)).toBe(false); expect(readFileSync(unfamiliar, 'utf8')).toBe('preserve me');
    expect(existsSync(dependencies)).toBe(true);
    unlinkSync(unfamiliar); trees.cleanup();
  }));
});
