/** Football experience for GAZE anticipation: the mean future displacement of
 * players who looked the same at that moment, learned from tracking by
 * scripts/diag/anticipation-bound.py --export and written here by
 * scripts/diag/write-anticipation-prior.py. Observables only (group, speed,
 * heading mirrored to his own sideline, depth from the LOS, width from the
 * ball, time since the snap); no route or assignment. Empty until a table is
 * committed: anticipation then tops out at the motion projection. */
export const PRIOR_SOURCE = 'none';
/** key -> horizon (s, as string) -> [along travel, across toward own sideline, n]. */
export const ANTICIPATION_PRIOR: Record<string, Record<string, [number, number, number]>> = {};
