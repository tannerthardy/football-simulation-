# Vitest 3.2.4 runner timeout diagnosis

Read-only inspection; no source, configuration, dependency, or test changes and no test runs by this agent.

## Observed failure

`out/helper-fit/full-tests-rpc-timeout.log` reports **95 files / 1,099 tests passing**, but exits with one unhandled `[vitest-worker]: Timeout calling "onTaskUpdate"`. Treat that run as unsuccessful verification, despite passing assertions.

`test/game-rules.test.ts` takes 64,446 ms, including two synchronous cases taking 38,034 and 26,250 ms. Each is within its explicit 60,000 ms test limit; their combined worker occupation exceeds 60 seconds.

## Installed source explains a separate 60-second deadline

- `node_modules/vitest/dist/chunks/index.B521nVV-.js`: Birpc `DEFAULT_TIMEOUT = 6e4`; response-bearing calls schedule a timeout and require a received response to clear it.
- `node_modules/vitest/dist/chunks/rpc.-pEldfrD.js`: `createRuntimeRpc` does not override that default. `onTaskUpdate` is not in its fire-and-forget `eventNames` list. Its timeout handler produces the exact observed error.
- `node_modules/vitest/dist/chunks/index.CwejwG0H.js`: the runner's `onTaskUpdate` forwards to that RPC.
- `node_modules/@vitest/runner/dist/chunk-hooks.js`: task updates are throttled and their promises queued in `pendingTasksUpdates`; emitting an update does not stop subsequent sequential tests. `finishSendTasksUpdate` awaits outstanding acknowledgements after execution. Awaiting already resolved promises advances microtasks but need not let message callbacks run.
- `node_modules/vitest/dist/chunks/utils.CAioKnHs.js`: forks use process messages; threads use a `MessagePort`. Both use the same runtime RPC deadline and depend on worker event-loop message processing.

Consequently a pending update followed by consecutive synchronous simulations can age past the RPC deadline while the worker cannot process its acknowledgement. The source and observed timing support this explanation; the logs do not directly prove when that particular acknowledgement was posted or received. Slow parent reporting is another possible contributor. Switching to threads may reduce overhead enough to avoid the deadline, but does not remove this starvation mechanism.

The per-test timeout is a different limit: `withTimeout` also checks elapsed time on completion, so an individually overlong synchronous test still fails even if its timer callback was delayed.

## Smallest supported fallback if the quiet threads rerun still fails

Keep the existing 60-second test limits and all unhandled-error reporting. Partition **execution**, without changing tests: run the complete suite except the single replay-recording reproducibility case, then run that exact case alone. Its title is unique in `test/`.

```sh
PATH=/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin:$PATH \
  npx vitest run --pool=threads --maxWorkers=1 --minWorkers=1 \
  --testNamePattern '^(?!.*is reproducible, with or without replay recording)'

PATH=/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin:$PATH \
  npx vitest run test/game-rules.test.ts --pool=threads --maxWorkers=1 --minWorkers=1 \
  --testNamePattern 'is reproducible, with or without replay recording'
```

The union should execute 1,098 + 1 = 1,099 tests, with exactly one deliberate skip in the first invocation and 27 in the second. Preserve both logs and require both exit codes to be zero with no unhandled errors. One worker avoids incidental CPU contention; separating these cases avoids their contiguous 64-second execution interval. This fallback has not been run here. If either individual case itself exceeds 60 seconds in the quiet environment, retain that failure and investigate actual execution cost rather than raise or disable limits.

No supported Vitest 3.2.4 CLI or test configuration RPC-timeout override was found in the installed runner. Modifying bundled Birpc, suppressing unhandled errors, increasing `testTimeout`, or replacing response-bearing RPCs with events would not be an appropriate validation repair.
