"""Integrity checks for historical evidence retrieval; no simulator inputs."""
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location("restore_evidence", Path(__file__).resolve().parents[1] / "scripts/restore-evidence.py")
ARCHIVE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ARCHIVE)


class RestoreEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        path = self.root / "viewer/old-film.html"
        path.parent.mkdir()
        path.write_bytes(b"original film bytes\n")
        subprocess.run(["git", "add", "viewer/old-film.html"], cwd=self.root, check=True)
        subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                        "commit", "-qm", "Original evidence"], cwd=self.root, check=True)
        self.commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.root, text=True).strip()
        self.entry = {"path": "viewer/old-film.html", "bytes": path.stat().st_size,
                      "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        path.write_bytes(b"current file differs\n")

    def test_restores_pinned_commit_and_keeps_matching_existing_bytes(self):
        destination = self.root / "restored"
        target = ARCHIVE.restore(self.entry, destination, self.commit, "unused", self.root)
        self.assertEqual(target.read_bytes(), b"original film bytes\n")
        self.assertEqual(ARCHIVE.restore(self.entry, destination, self.commit, "unused", self.root), target)
        target.write_bytes(b"a different result\n")
        with self.assertRaises(ValueError):
            ARCHIVE.restore(self.entry, destination, self.commit, "unused", self.root)
        self.assertEqual(target.read_bytes(), b"a different result\n")

    def test_wrong_hash_leaves_no_partial_artifact(self):
        entry = dict(self.entry, sha256="0" * 64)
        destination = self.root / "restored"
        with self.assertRaises(ValueError):
            ARCHIVE.restore(entry, destination, self.commit, "unused", self.root)
        self.assertFalse((destination / entry["path"]).exists())
        self.assertEqual(list((destination / "viewer").iterdir()), [])

    def test_rejects_traversal_and_symlink_escape(self):
        for name in ("../viewer/file", "/viewer/file", "data/../../file", "viewer\\file", "src/player.ts"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                ARCHIVE.safe_path(name)
        destination = self.root / "restored"
        destination.mkdir()
        (destination / "viewer").symlink_to(self.root / "viewer", target_is_directory=True)
        with self.assertRaises(ValueError):
            ARCHIVE.restore(self.entry, destination, self.commit, "unused", self.root)


if __name__ == "__main__":
    unittest.main()
