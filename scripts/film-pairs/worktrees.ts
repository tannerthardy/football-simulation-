/** Cleanup authority for only the worktrees and dependency links we create. */
import { lstatSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

type Git = (args: string[]) => string;
type OwnedLink = { path: string; target: string; dev: number; ino: number; ctimeMs: number };
type OwnedTree = { root: string; link?: OwnedLink };

export class PairWorktrees {
  private readonly trees: OwnedTree[] = [];
  constructor(private readonly git: Git) {}

  create(root: string, commit: string): void {
    this.git(['worktree', 'add', '--detach', root, commit]);
    this.trees.push({ root });
  }

  shareDependencies(root: string, target: string): void {
    const tree = this.trees.find(t => t.root === root);
    if (!tree || tree.link) throw Error('Dependency link requires a newly owned worktree');
    const path = resolve(root, 'node_modules');
    symlinkSync(target, path, 'dir');
    const stat = lstatSync(path);
    tree.link = { path, target, dev: stat.dev, ino: stat.ino, ctimeMs: stat.ctimeMs };
  }

  cleanup(): void {
    const failures: unknown[] = [];
    for (const tree of [...this.trees].reverse()) {
      try {
        if (tree.link) {
          const link = tree.link;
          let stat;
          try { stat = lstatSync(link.path); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          if (stat) {
            if (!stat.isSymbolicLink() || stat.dev !== link.dev || stat.ino !== link.ino
              || stat.ctimeMs !== link.ctimeMs || readlinkSync(link.path) !== link.target)
              throw Error(`Dependency path changed; preserving worktree ${tree.root}`);
            // A directory-only node_modules/ ignore rule does not hide this
            // symlink. Unlink precisely our unchanged link, never its target.
            unlinkSync(link.path);
            tree.link = undefined;
          }
        }
        this.git(['worktree', 'remove', tree.root]); // No force or prune.
        this.trees.splice(this.trees.indexOf(tree), 1);
      } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures,
      'Pair cleanup incomplete; unfamiliar files/worktrees preserved (see errors)');
  }
}
