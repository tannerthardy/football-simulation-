# Bounded combined-build game checkpoint

The user requested a smoke game, then a bounded comparison against the previous
accepted build. This harness reuses the first two existing frozen fixtures and
all their player profiles: `zone-reference` seed701 (wide-zone/west-coast) and
`spread-air` seed702 (spread/air-raid). No rosters or NFL data are generated.

Four games total: candidate zone is the smoke and is reused, then baseline zone,
baseline spread and candidate spread. Each game has a100-second soft collection
limit,120-second external ceiling and600 Game steps; combined ceiling480seconds.
Timeouts/errors preserve completed log rows and the interrupted native state.
A failed attempt stops the batch; there is no automatic retry or skipped-tail
masquerading as completed football. These are bounded operational ceilings, not
an established performance regression threshold.

The collector derives from PR129's pinned
`a2a61fde768622c536452a88d6e136373c18c05e:scripts/accepted-game-audit.mjs`.
It observes actual delivered World contacts without extra sensing/controllers/RNG.
The same external collector loads each arm's Game from that arm's checkout. It
pins exact HEAD, all source bytes,44 accepted flag values/components1, World
settings, lock/profile bytes, unchanged input/team hashes and renderer hashes.
Its source identifier has the same sorted src/path/byte operator as the accepted
`scripts/source-version.ts`. Root imports are dynamic; no engine changes or
history rewrites are needed to run the previous accepted commit.

From this checkout, using Node22.23.3:

```sh
NODE=/workspace/.football-tools/node-v22.23.3-linux-x64/bin/node
$NODE scripts/checkpoint-games.mjs prepare /workspace/football-big-game-baseline CANDIDATE_ROOT /ABS/OUT/inputs.json
$NODE scripts/checkpoint-games.mjs smoke /ABS/OUT/inputs.json /ABS/OUT
$NODE scripts/checkpoint-game-report.mjs /ABS/OUT
# Continue only after the smoke and its accounting/football inspection pass.
$NODE scripts/checkpoint-games.mjs compare /ABS/OUT/inputs.json /ABS/OUT
$NODE scripts/checkpoint-game-report.mjs /ABS/OUT
python scripts/checkpoint-clips.py /ABS/OUT /ABS/SELECTION.json
```

The baseline worktree is exactly previous accepted
`2c98bed94adad8087c65f381d4090444ad283985`. Candidate source must already be
frozen and verified. Each engine checkout needs the existing Node dependencies
available; the harness never installs or modifies them.

`summary.json` contains raw physical log and explicit official credit. The report
checks completed games, finite box fields, cumulative score/quarters, charged
plays, consumed third/fourth attempts including separately identified kneels,
player/team rushing and net passing credit, completion consistency and sensible
conversion bounds. It respects newer `officialCredit`, while the old accepted
arm uses its historical unnullified-stat fallback. A raw nullified play can
retain a statistical prefix; blanket exclusion would falsely fail that contract.
Kneels historically consume clock/down without entering ordinary rushing credit.

Each game supplies standalone full native `film.html`, raw `game.json.gz`, durable
JSONL and hashes. Film is physical behavior; official credits/rule limitations
are separate. No film flags are silently promoted into legal/statistical facts.

The saved-only clip renderer accepts zero-based native log indices:

```json
[{"game":"zone-reference","before":5,"after":6,"note":"Describe the actual comparable context and limitation"}]
```

Native replay frame schema: `t` seconds, `agents` as22 flattened
`[x,y,facingRadians]` triples, `ball:[x,y,z]`, `carrier` agent index. Players carry
team/slot labels. Coordinates are in yards; modern native/packed positions retain
hundredths. The renderer does not resimulate. Its optional default selection is
the first comparable run/pass for equal offense, concept, formation, coverage and
front, within15 yards of field position; it does not select favorable outcomes.
Root should inspect the full relevant sequence and use explicit selections for
known problem mechanisms, retaining adverse cases.

Two paired games do not certify league realism, fix every explosive play, or
measure population performance. Same teams/game seed do not imply identical
later calls, fatigue, execution or opponent responses. Clips with different
histories are comparable examples rather than isolated same-state causality.
Publish compact results with the engine receipt and keep large raw films on a
separate evidence branch; never merge an evidence-only root into the engine.
