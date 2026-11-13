"""CLI file-integrity controls. Every invocation uses disposable source copies.

The empty input/stub tests filesystem admission only; the separate mechanical
self-checks still use the real #367 dependency. No tracking cache is aliased.
"""
import gzip
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = ('nfl', 'sim', 'combo', 'loader', 'script')


def invocation(target=None, alias='distinct', duplicate=False):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        files = {'script': root / 'block_type_reference.py', 'loader': root / 'run_film_reference.py',
                 'combo': root / 'combo.py', 'nfl': root / 'input.gz', 'sim': root / 'sim.json'}
        for name in ('script', 'loader'):
            shutil.copyfile(ROOT / 'scripts/mechanics' / files[name].name, files[name])
        files['combo'].write_text('class Rules:\n    pass\n')
        files['nfl'].write_bytes(gzip.compress(b'', mtime=0))
        files['sim'].write_text('[]\n')
        before = {name: path.read_bytes() for name, path in files.items()}
        output = root / 'report.json'
        if alias == 'identical':
            output = files[target]
        elif alias == 'hardlink':
            os.link(files[target], output)
        elif alias == 'symlink':
            output.symlink_to(files[target])
        nfl = [str(files['nfl'])]
        if duplicate:
            second = root / 'same-bytes.gz'; second.write_bytes(files['nfl'].read_bytes()); nfl.append(str(second))
        command = [sys.executable, '-I', str(files['script']), '--nfl', *nfl, '--sim', str(files['sim']),
                   '--combo', str(files['combo']), '--out', str(output)]
        result = subprocess.run(command, capture_output=True, text=True)
        after = {name: path.read_bytes() for name, path in files.items()}
        report = json.loads(output.read_text()) if result.returncode == 0 else None
        return result, before, after, report


class BlockTypeFileIntegrity(unittest.TestCase):
    def reject(self, target, alias):
        result, before, after, _ = invocation(target, alias)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('must not overwrite', result.stderr)
        self.assertEqual(after, before, 'protected bytes changed')

    def test_identical_files_preserve_all_protected_bytes(self):
        for target in PROTECTED:
            with self.subTest(target=target): self.reject(target, 'identical')

    def test_hardlinks_preserve_all_protected_bytes(self):
        for target in PROTECTED:
            with self.subTest(target=target): self.reject(target, 'hardlink')

    def test_symlinks_preserve_all_protected_bytes(self):
        for target in PROTECTED:
            with self.subTest(target=target): self.reject(target, 'symlink')

    def test_duplicate_input_bytes_rejected(self):
        result, before, after, _ = invocation(duplicate=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('duplicate input digest', result.stderr)
        self.assertEqual(after, before)

    def test_distinct_output_still_works(self):
        result, before, after, report = invocation()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(after, before)
        self.assertEqual(report['counts']['ol_rows'], 0)


if __name__ == '__main__': unittest.main()
