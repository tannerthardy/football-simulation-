Lean trace (Flex, 2026-11-12). Diagnostic only: apply `world-instrumentation.patch` in a scratch worktree, never in
the main tree. It hooks each lean stage of `World.feet()` for one target body. Then run, from that worktree:
`PAST_ALONG_PATH=1 OPEN_HANDS=1 PUNCH=1 TACKLE_SET=1 TACKLE_BRAKE=1 node --import tsx <script>.mts`.
- lean-trace.mts: per-substep stages for one tick, and the shares of substeps each writer acts in.
- lean-rep.mts: one rep tick by tick, with the full lean and press vectors.
- lean-agg.mts: the press direction and lean/target ratio over 1.5-2.5 s.
