# Accepted football game evidence — 70b4db6

Four frozen games ran once on accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, seeds 701–704, in 185.123 seconds. This is a data-only orphan evidence root. **Never merge this branch into simulator development history.** Source tooling, compact results and owner handoff are in [PR #129](https://github.com/tannerthardy/football-simulation-/pull/129).

The archives preserve all four standalone full-telemetry films, native raw gzips, append-only recovery prefixes, exact manifests/settings/provenance, play index, shared 48 ordinary / 12 tail audit panels and independent-review notes. 559 filmed snaps, 27,784 frames, 740 log entries. Four individual 25-second cap endings remain unknown; two two-point tries lack native film. No games were rerun for publication.

Download all five archives plus SHA256SUMS into one directory. Verify before extracting, then open index.html.

```sh
sha256sum -c SHA256SUMS
mkdir -p extracted
for archive in accepted-games-*.tar.gz; do tar -xzf "$archive" -C extracted; done
# Open extracted/index.html. Reporting does not run the engine:
cd extracted
node evidence/accepted-game-audit-report.mjs .
```

## Downloads

- [accepted-games-G1-zone-reference.tar.gz](./accepted-games-G1-zone-reference.tar.gz?raw=true) (79,620,439 bytes)
- [accepted-games-G2-spread-air.tar.gz](./accepted-games-G2-spread-air.tar.gz?raw=true) (72,716,894 bytes)
- [accepted-games-G3-power-zone.tar.gz](./accepted-games-G3-power-zone.tar.gz?raw=true) (75,519,458 bytes)
- [accepted-games-G4-west-spread.tar.gz](./accepted-games-G4-west-spread.tar.gz?raw=true) (81,062,426 bytes)
- [accepted-games-audit-packet.tar.gz](./accepted-games-audit-packet.tar.gz?raw=true) (448,580 bytes)

[SHA256SUMS](./SHA256SUMS?raw=true) · [Receipt](./receipt.json)

Immutable commit/download links are recorded in PR #129 and its source retention manifest after remote byte verification. All game files retain their original exact hashes; only the small audit packet publication notes were updated. These games are diagnostic exposure, not a population estimate or a new accepted engine baseline.
