"""Scalar speed-gain measurements on complete, legal tracking windows.

This is an achieved-motion operator, not an effort, contact or capability
inference. It deliberately does not change metrics.Play or historical results.
Speed is the chord distance over centered +/-0.2 s; gain is the change in
that speed over 0.3 s, divided by 0.3 s. Every supporting observation must
exist and lie in the caller's legal live interval. No endpoint is clamped.
"""
from collections import Counter
import math


def _finite(value, name):
    try:
        value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be finite") from exc
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")
    return value


def _grid_steps(seconds, dt, name):
    seconds = _finite(seconds, name)
    steps = round(seconds / dt)
    epsilon = 16 * math.ulp(max(abs(seconds), abs(dt), 1.0))
    if seconds <= 0 or steps < 1 or abs(steps * dt - seconds) > epsilon:
        raise ValueError(f"{name} must be a positive whole number of sample intervals")
    return steps


def measure_acceleration_windows(points, dt, live_end, *, position_decimals=1,
                                 speed_half_window=.2, gain_window=.3,
                                 start_time=0.0, live_start=0.0):
    """Measure uniformly spaced ``(x, y)`` observations without extrapolation.

    ``start_time + index * dt`` is each observation's time. The closed legal
    interval is [live_start, live_end], independently of the recording bounds.
    Window durations must land on this sample grid; unsupported grids raise
    ValueError rather than silently changing the operator or interpolating.

    ``position_decimals=1`` matches legacy ``round(position, 1)``. None keeps
    raw coordinates. None/nonfinite coordinates exclude every window that
    uses them; malformed coordinate pairs raise ValueError. Interior missing
    samples are excluded as well as missing endpoints.

    Returns accepted ``speeds`` and ``gains`` with indices/times, plus explicit
    excluded candidates and counts. ``gain`` has distance/time-squared units;
    ``delta_speed`` has distance/time units. Zero/negative gains are retained.
    Reason counts can overlap; accepted + excluded always equals candidates.
    Inputs are never mutated. No player role, contact or effort is inferred.
    """
    dt = _finite(dt, "dt")
    if dt <= 0:
        raise ValueError("dt must be positive")
    start_time = _finite(start_time, "start_time")
    live_start = _finite(live_start, "live_start")
    live_end = _finite(live_end, "live_end")
    if live_end < live_start:
        raise ValueError("live_end must not precede live_start")
    if position_decimals is not None and (
            not isinstance(position_decimals, int) or isinstance(position_decimals, bool)):
        raise ValueError("position_decimals must be an integer or None")
    half = _grid_steps(speed_half_window, dt, "speed_half_window")
    ahead = _grid_steps(gain_window, dt, "gain_window")
    half_seconds, gain_seconds = half * dt, ahead * dt
    xy = []
    for index, point in enumerate(points):
        if point is None:
            xy.append(None)
            continue
        try:
            if len(point) != 2:
                raise ValueError
            x, y = point
            pair = None if x is None or y is None else (float(x), float(y))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"point {index} must be an (x, y) pair or None") from exc
        if pair is None or not all(math.isfinite(v) for v in pair):
            xy.append(None)
        else:
            xy.append(pair if position_decimals is None else
                      tuple(round(v, position_decimals) for v in pair))

    n = len(xy)
    times = [start_time + k * dt for k in range(n)]
    epsilon = 16 * math.ulp(max(abs(start_time), abs(live_start), abs(live_end),
                               abs(start_time + max(0, n - 1) * dt), 1.0))

    def reasons(indices):
        first, last = min(indices), max(indices)
        result = []
        if first < 0:
            result.append("before_recording")
        if last >= n:
            result.append("after_recording")
        if start_time + first * dt < live_start - epsilon:
            result.append("before_live_start")
        if start_time + last * dt > live_end + epsilon:
            result.append("after_live_end")
        if any(xy[k] is None for k in indices if 0 <= k < n):
            result.append("missing_position")
        return result

    def speed(k):
        a, b = xy[k - half], xy[k + half]
        return math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * half_seconds)

    speeds, gains = [], []
    excluded = {"speeds": [], "gains": []}
    for k, t in enumerate(times):
        initial_window = range(k - half, k + half + 1)
        why = reasons(initial_window)
        if why:
            excluded["speeds"].append({"index": k, "t": t, "reasons": why})
        else:
            speeds.append({"index": k, "t": t, "speed": speed(k),
                           "support_start": times[k - half],
                           "support_end": times[k + half]})

        combined = sorted(set(initial_window) |
                          set(range(k + ahead - half, k + ahead + half + 1)))
        why = reasons(combined)
        if why:
            excluded["gains"].append({"index": k, "t": t, "reasons": why})
        else:
            before, after = speed(k), speed(k + ahead)
            delta = after - before
            gains.append({"index": k, "t": t, "end_t": times[k + ahead],
                          "initial_speed": before, "final_speed": after,
                          "delta_speed": delta, "gain": delta / gain_seconds,
                          "support_start": times[k - half],
                          "support_end": times[k + ahead + half]})

    counts = {"frames": n}
    for name, accepted in (("speeds", speeds), ("gains", gains)):
        rejected = excluded[name]
        by_reason = Counter(reason for sample in rejected for reason in sample["reasons"])
        counts[name] = {"candidates": n, "accepted": len(accepted),
                        "excluded": len(rejected), "exclusion_reasons": dict(by_reason)}
    return {"settings": {"dt": dt, "start_time": start_time,
                         "recorded_end": times[-1] if times else None,
                         "live_start": live_start, "live_end": live_end,
                         "position_decimals": position_decimals,
                         "speed_half_window": half_seconds,
                         "gain_window": gain_seconds},
            "speeds": speeds, "gains": gains, "counts": counts, "excluded": excluded}
