# QB packet requalified on develop b559fdc (shouldScramble lane margins)

For Rules+Coaching's `shouldScramble` fix. Measurement only; no football behavior changed.
Source: develop `b559fdc` (contains #274, #275, #279, #280) plus this branch's tools files. Node v22.22.0
(`.nvmrc` is 22.23.3; the container is behind, and nothing here depends on the patch version).
Packet being requalified: `64c438d`, `artifacts/ordinary53/ordinary53.tar.xz` (SHA256 07035b5f…fe89fc), captured at 50b8006.

## Answer
| Play | Packet decision (50b8006) | Same bytes on develop b559fdc | Same decision? |
|---|---|---|---|
| P007 `I-Form Pro — PA Post-Dig`, setup SHA256 `9ccf69ca…204ff` | scramble event 3.6 s, +2.39 yd tackle | `shouldScramble` returns true at 3.55 and 3.60 s, scramble event 3.6 s, −2.50 yd tackle | **Yes** (decision and lane table identical; the yardage changed downstream) |
| P005 `Gun Doubles — PA Flood`, setup SHA256 `2eaeaa1b…b329` | no scramble, throw at 3.2 s, +12.33 yd | no scramble, 0 `shouldScramble` calls, +12.23 yd | **Yes** (pressure branch `qb.ts` ~L296 throws before `shouldScramble` is reached) |

Lane margins at P007's two calls (QB stationary, vmax 9.130 yd/s, tau 1.471 s; lane open when margin > 0.35 s):

| t | self arrival, native 0.8·vmax | self arrival, fresh full effort | lanes open: live defenders / consumed estimates, native | lanes open, full effort (live / consumed) |
|---|---|---|---|---|
| 3.55 | 1.258–1.372 s | 2.132–2.250 s | 4/5 / 4/5 | 0/5 / 0/5 |
| 3.60 | 1.258–1.372 s | 2.132–2.250 s | 4/5 / 4/5 | 0/5 / 0/5 |

Same numbers as the packet. Largest full-effort margin: +0.087 s (consumed, lane dy=+4, 3.60 s), below the 0.35 s bar.
Per-lane margins and limiting defender are in `lane-margins-packet-bytes.json` (`plays[].calls[].lanes[]`:
`liveNative`, `consumedNative`, `liveFull`, `consumedFull`). "Consumed" = the QB's own `QBMind.estimate` outputs at that tick (11 of 11 defenders covered);
"Live" = what the code reads today (`d.pos/d.vel`, `engagement`, `isDown`).

## Fresh seed-53 sample on develop (the sample itself drifted)
The recipe (`new Rng(53)`, Ironmen/Comets strength .55, Game seed 53, first six non-nullified run/pass plays) still runs, but the
games diverge from P003 on: P002 setup hash matches (`59df1308`), P003–P007 setups and results differ (P004 is now a Trap run, P005 an
incomplete pass, P006 Comebacks). P007 is still `I-Form Pro — PA Post-Dig`, scrambles at 3.6 s, but its setup is `e9477c6b…` (not `9ccf69ca…`) and it
also ends −2.50 yd. See `lane-margins-fresh-seed53.json` (`ledger`). **Use the packet bytes for the fix, not the fresh sample.**

## Commands
```sh
git fetch origin 64c438dae4acb804cd9cb29d1ba654369845ee25
mkdir -p out/ordinary53-old && git show 64c438dae4acb804cd9cb29d1ba654369845ee25:artifacts/ordinary53/ordinary53.tar.xz > out/ordinary53-old.tar.xz
sha256sum out/ordinary53-old.tar.xz        # 07035b5f8ede618530ea819eecddfea6890b77b8e35136fb96e93b5a90fe89fc
tar -xJf out/ordinary53-old.tar.xz -C out/ordinary53-old
node --import tsx scripts/diag/qb-scramble-lanes.ts \
  --saved out/ordinary53-old/ordinary53/G1-P007/play.bin --saved out/ordinary53-old/ordinary53/G1-P005/play.bin --out out/qb-requal
node --import tsx scripts/diag/qb-scramble-lanes.ts --seed 53 --out out/qb-requal      # fresh sample
```
Run twice, the saved-bytes JSON is byte-identical (only `identity.commit` follows HEAD; `engineSha256` is the source id).
The tap wraps `QBPass.shouldScramble` and `QBMind.estimate`, reads only, draws no RNG; the script throws unless the play/game result is
identical with the tap on and off. It reports `open` counts for four views so a fix can be compared like for like: native/full-effort
self arrival × live/consumed defender positions.

## What this does and does not say
- The self-arrival defect reproduces on today's source: native constant-speed arrival counts 4/5 lanes for a stationary QB, a fresh full-effort aligned start counts 0/5.
- The information leak (live positions) is separate: consumed estimates alone still leave 4/5 native lanes open here.
- It is not a claim that the 3.6 s scramble was a bad decision, or that −2.50 vs +2.39 yd is better or worse (downstream change from #274/#275/#279/#280).
