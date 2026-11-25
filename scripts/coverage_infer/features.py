"""Features for coverage inference, from tracking only (no PFF labels).

Everything is computed in the snap frame (offense toward +x, ball at the origin, left stays
left) from positions up to `tmax` seconds after the snap, so the same code scores a pre-snap
look, an early read (what is visible on a run or play action) and the full drop-back window.
"""
import numpy as np

PRE = 10
DL = {"DE", "DT", "NT"}
ELIG = {"WR", "TE", "RB", "FB"}
TIMES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]


def _at(xy, k):
    return xy[:, PRE + int(round(k * 10)), :]


def play_features(pl, tmax, D=None, E=None):
    """Return (defender indices, one feature dict per defender); a missing key means not observable."""
    xy, side, pos = pl["xy"], np.array(pl["side"]), np.array(pl["pos"])
    # D and E can be given when only part of the field is observed (coverage defenders and route runners)
    D = [i for i in range(len(side)) if side[i] == "D"] if D is None else D
    E = [i for i in range(len(side)) if side[i] == "O" and pos[i] in ELIG] if E is None else E
    snap = _at(xy, 0)
    rows, names = [], None
    use = [t for t in TIMES if t <= tmax + 1e-9]
    pos_t = {t: _at(xy, t) for t in use}
    depth0 = snap[D, 0]
    # context at snap and at the latest available time
    tl = use[-1] if use else 0.0
    last = pos_t[tl] if use else snap
    for n, i in enumerate(D):
        f = {}
        f["x0"], f["y0"] = snap[i, 0], snap[i, 1]
        f["absy0"] = abs(snap[i, 1])
        f["dl"] = float(pos[i] in DL)
        f["rank_depth0"] = float((depth0 > snap[i, 0]).sum())
        f["rank_y0"] = float((snap[D, 1] < snap[i, 1]).sum())
        f["deeper_same_side0"] = float(((depth0 > snap[i, 0]) & (np.sign(snap[D, 1]) == np.sign(snap[i, 1]))).sum())
        # nearest eligible receiver at the snap
        if E:
            dd = np.hypot(snap[E, 0] - snap[i, 0], snap[E, 1] - snap[i, 1])
            j = int(np.argmin(dd))
            f["near0"] = dd[j]
            f["near0_dx"], f["near0_dy"] = snap[E[j], 0] - snap[i, 0], snap[E[j], 1] - snap[i, 1]
            f["n_elig_outside"] = float(sum(abs(snap[e, 1]) > abs(snap[i, 1]) and np.sign(snap[e, 1]) == np.sign(snap[i, 1]) for e in E))
        for t in TIMES:
            ok = t <= tmax + 1e-9
            p = pos_t[t][i] if ok else np.array([np.nan, np.nan])
            f[f"x{t}"], f[f"y{t}"] = p[0], p[1]
            f[f"dx{t}"], f[f"dy{t}"] = p[0] - snap[i, 0], p[1] - snap[i, 1]
            if ok and t - 0.5 >= 0:
                q = _at(xy, t - 0.5)[i]
                f[f"vx{t}"], f[f"vy{t}"] = (p[0] - q[0]) / 0.5, (p[1] - q[1]) / 0.5
            else:
                f[f"vx{t}"] = f[f"vy{t}"] = np.nan
        # man shadowing: the eligible who stays closest over the window
        if E and len(use) >= 2:
            ks = [t for t in use if t >= 0.5]
            rel = np.stack([[pos_t[t][E[a], :] - pos_t[t][i, :] for t in ks] for a in range(len(E))])  # (E, T, 2)
            dist = np.hypot(rel[..., 0], rel[..., 1])
            mean_d = np.nanmean(dist, axis=1)
            a = int(np.nanargmin(mean_d))
            f["shadow_mean"] = mean_d[a]
            f["shadow_std"] = float(np.nanstd(dist[a]))
            f["shadow_relstd"] = float(np.nanstd(rel[a, :, 0]) + np.nanstd(rel[a, :, 1]))
            f["shadow_last"] = dist[a, -1]
            f["shadow_dx"], f["shadow_dy"] = rel[a, -1, 0], rel[a, -1, 1]
            order = np.sort(mean_d)
            f["shadow_gap"] = (order[1] - order[0]) if len(order) > 1 else np.nan
            f["shadow_same0"] = float(a == int(np.argmin(np.hypot(snap[E, 0] - snap[i, 0], snap[E, 1] - snap[i, 1]))))
            # velocity agreement with the shadowed receiver
            ve = np.array([_at(xy, ks[-1])[E[a]] - _at(xy, max(ks[0], ks[-1] - 1.0))[E[a]]])[0]
            vd = _at(xy, ks[-1])[i] - _at(xy, max(ks[0], ks[-1] - 1.0))[i]
            ne, nd = np.hypot(*ve), np.hypot(*vd)
            f["shadow_cos"] = float(ve @ vd / (ne * nd)) if ne > .3 and nd > .3 else np.nan
            f["n_elig_behind"] = float(sum(pos_t[ks[-1]][e, 0] > pos_t[ks[-1]][i, 0] + 1 for e in E))
        # context among defenders at the last time
        if use:
            dl_ = last[D, 0]
            f["rank_depth_last"] = float((dl_ > last[i, 0]).sum())
            f["deep_count_last"] = float((dl_ > 7).sum())
            f["deep_count_last10"] = float((dl_ > 10).sum())
            f["rank_y_last"] = float((last[D, 1] < last[i, 1]).sum())
            f["deeper_same_side_last"] = float(((dl_ > last[i, 0]) & (np.sign(last[D, 1]) == np.sign(last[i, 1]))).sum())
        # the receivers on his side in order from the sideline (#1 outside, #2 inside of him, #3): where they go
        sg = 1.0 if snap[i, 1] >= 0 else -1.0
        side_e = sorted([e for e in E if (snap[e, 1] >= 0) == (sg > 0)], key=lambda e: -abs(snap[e, 1]))
        f["n_side_elig"] = float(len(side_e))
        for r in range(3):
            if r < len(side_e):
                e = side_e[r]
                f[f"r{r}_y0"], f[f"r{r}_x0"] = abs(snap[e, 1]), snap[e, 0]
                f[f"r{r}_off"] = abs(snap[e, 1]) - abs(snap[i, 1])
                for t in (1.0, 2.0, 3.0):
                    if t <= tmax + 1e-9:
                        q = pos_t[t][e]
                        f[f"r{r}_dep{t}"] = q[0] - snap[e, 0]
                        f[f"r{r}_wid{t}"] = (abs(q[1]) - abs(snap[e, 1]))
                        f[f"r{r}_rdx{t}"], f[f"r{r}_rdy{t}"] = q[0] - pos_t[t][i, 0], sg * (q[1] - pos_t[t][i, 1])
        if use:
            late = [t for t in (3.0, 2.0, 1.0) if t <= tmax + 1e-9]
            if late:
                f["n_vert_side"] = float(sum(pos_t[late[0]][e, 0] - snap[e, 0] > 8 for e in side_e))
                f["n_vert_all"] = float(sum(pos_t[late[0]][e, 0] - snap[e, 0] > 8 for e in E))
        f["deep_count0"] = float((depth0 > 7).sum())
        f["box0"] = float(((depth0 < 5) & (np.abs(snap[D, 1]) < 5)).sum())
        f["n_dl"] = float(sum(pos[d] in DL for d in D))
        f["pa"] = float(pl["pa"])
        f["down"], f["togo"] = pl["down"], pl["togo"]
        rows.append(f)
        names = list(f)
    return D, rows
