# Download the complete Phase II evidence

The complete frozen archive is shared privately through Tanner Hardy's connected Google Drive. Sign in to the owning Google account, or use its connected Drive tools. A URL does not grant public access. This archive includes all Phase II raw experiments and the complete original Phase I ZIP.

Download all seven files into the same directory, preserving these names:

| File | Download |
|---|---|
| `gridiron-run-game-phase2-full.zip.part00` | [Part 00](https://drive.google.com/file/d/19B3OFwY1PzAvGmNGZhHm0uSOGgHMta_l/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part01` | [Part 01](https://drive.google.com/file/d/1RShtBqvBaIHb4s_6MuV7A1EjsjAlGFWp/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part02` | [Part 02](https://drive.google.com/file/d/1LIRrgVQmZ5tIo3u-2YHWsLd1W5C01Mgt/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part03` | [Part 03](https://drive.google.com/file/d/1CeLbwnTlEqy50MY8YLy9M4Z36fPK28pA/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part04` | [Part 04](https://drive.google.com/file/d/1jiw6ADQ9ECptbe9_IwEFDsuIBz8hP-w0/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part05` | [Part 05](https://drive.google.com/file/d/1BzLmKS91JlTdKkbWrDu6x4B9Dhs9hAz2/view?usp=drivesdk) |
| `gridiron-run-game-phase2-full.zip.part06` | [Part 06](https://drive.google.com/file/d/1YOc-XvLw_c8f4VVdR6GtVg7k0xPDbLLL/view?usp=drivesdk) |

After downloading:

```bash
cat gridiron-run-game-phase2-full.zip.part00 \
    gridiron-run-game-phase2-full.zip.part01 \
    gridiron-run-game-phase2-full.zip.part02 \
    gridiron-run-game-phase2-full.zip.part03 \
    gridiron-run-game-phase2-full.zip.part04 \
    gridiron-run-game-phase2-full.zip.part05 \
    gridiron-run-game-phase2-full.zip.part06 > gridiron-run-game-phase2-full.zip
sha256sum gridiron-run-game-phase2-full.zip
```

Expected SHA256: `b841f54a1c8c14e3552223a37893a00e10a5a392cb11397ec481215393788947`.

Then extract and verify the internal manifest:

```bash
unzip gridiron-run-game-phase2-full.zip
python run-game-phase2/VERIFY_PACKAGE.py
```

The archive is 681,429,310 bytes (about650 MiB); the first six parts are96 MiB each and the final part is77,449,534 bytes. Do not unzip the individual parts. The archive contains787 files, including786 manifest-listed files. It contains saved constructors, observation traces, physical/decision experiments, rejected candidates, native film, source snapshots and reconstruction scripts. Node22.23.3 is required for the saved constructor artifacts.

[Small reading ZIP](https://drive.google.com/file/d/1WCP_89EHMgVSZaxi482h62C58hjP1b9T/view?usp=drivesdk) is also available, but it does not contain the complete raw evidence.

This is the unchanged original archive. Publication plans and later reviews are not retroactively inserted into it. Read the repository's current PLAN and existing owner threads before acting on historical proposed briefs.


[Per-part checksums](https://drive.google.com/file/d/1mFQ0qX4j4kD1noApcG5szhMDF6KYi45J/view?usp=drivesdk) are available separately. Every uploaded part was fetched back from Drive, downloaded, and SHA256-checked; concatenating those downloaded bytes matched the original archive SHA256 above. The downloaded reading ZIP also matched its recorded hash.
