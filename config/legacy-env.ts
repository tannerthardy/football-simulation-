/** The environment of the legacy-pinned suites (vitest.config.ts): every promoted (`on`) flag of config/reference-stack.json at 0 and every numeric flag at its `legacy`
 * value, so a numeric default that is not the identity (SIGHT_STALE, BALL_EST, INFO_HONEST, ...) does not leak into the suites recorded before it. Under TEST_ENGINE_DEFAULTS=1
 * nothing is pinned. `pinOnly` (TEST_PIN_FLAGS, for scripts/diag/pin-bisect.ts) pins just those boolean flags and no numeric one. Covered by test/reference-stack.test.ts. */
export interface StackFile { flags: Record<string, string>; numeric?: Record<string, { default: number; legacy: number }> }
export function legacyEnv(stack: StackFile, opts: { engineDefaults?: boolean; pinOnly?: string } = {}): Record<string, string> {
  if (opts.engineDefaults) return {};
  const on = Object.entries(stack.flags).filter(([, v]) => v === 'on').map(([k]) => k);
  const flags = (opts.pinOnly === undefined ? on : opts.pinOnly.split(',').filter(Boolean)).map((k) => [k, '0'] as const);
  const numeric = opts.pinOnly === undefined ? Object.entries(stack.numeric ?? {}).map(([k, v]) => [k, String(v.legacy)] as const) : [];
  return Object.fromEntries([...flags, ...numeric]);
}
