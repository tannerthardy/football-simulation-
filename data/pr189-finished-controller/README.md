# Reviewed development checkpoint #189 — saved games and film

Candidate tested freeze: 7d5da0c79adea4d7c4b43b85c498876ffe6d8742, source12a5c88025b3c306c4673805fec54c45095e06730b9d8c98efc030694b36d1f9.
Previous accepted:2c98bed94adad8087c65f381d4090444ad283985, source4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571.
All44 settings/components1, GAIT_STEP0. Historical4ded6b6 unchanged. This is evidence history, **do not merge into engine**.

Four complete matched games, same saved teams/settings/seeds701–702. No recollection is required to distribute or inspect this evidence. Each game zip contains standalone film.html, complete raw game.json.gz, summary and source/flag/input provenance. Open film.html in a browser after unzipping. The paired GIFs show native saved frames; captions preserve differing game history/field context. Full raw game logs retain all adverse outcomes and rules limitations.

Reproduction tools and original frozen four-game roster packet are in reproduction-tools.zip. Node22.23.3 and engine dependencies are required only to simulate; source imports resolve from the engine working directory. Create clean worktrees at the two exact source commits, then run scripts/checkpoint-games.mjs prepare BASELINE_ROOT CANDIDATE_ROOT NEW_MANIFEST, smoke NEW_MANIFEST NEW_OUT, followed by report/rule/score/turnover audits, then compare and audits. This executes four new games; **reuse these saved outputs when no new question requires simulation**. Existing manifests retain original local paths and must not be edited or silently reused for different source/inputs. No automatic retry or favorable stopping.

Game collection/tooling:9c2206aada055c81ce708a0992c6fe0300e37153; data-only audits throughbd3fac44. Collector/supervisor remained unchanged across all four arms. Raw/log credit and official credit are separated. The turnover audit preserves an EXISTING baseline spread-game failure: INT→defensive-return fumble→offense recovery records7 actual takeaways but old team boxes only5. Candidate turnover/score/TOP checks pass. This is not an integration failure or a reason to rewrite baseline evidence.

The full code suite passes3007TS/171Python,typecheck/build at the exact candidate; engine repository receipts preserve the original failed candidate and targeted repairs. Games remain a two-pair checkpoint, not league-wide/NFL calibration. Deep pursuit/explosive tails and edge pass protection remain visibly imperfect. No experimental Claude branch, gait/hands/contact solver activation or new historical baseline.
