"""One position-only operator for NFL and saved native offensive lines."""
import itertools
import math

def normalize(points, los, ball_y, attack):
    if attack not in (-1,1):raise ValueError('Known attack direction required')
    if any(not math.isfinite(v) for p in points.values() for v in p):raise ValueError('Nonfinite position')
    return {i:(round(attack*(p[0]-los),1),round(attack*(p[1]-ball_y),1)) for i,p in points.items()}

def measure(initial,current,ol):
    """Return None for missing tracking; never carry positions or zero-impute.

    Positive x is upfield. Retreat is movement from the snap, not LOS depth.
    Every metric is one observation per play, rather than five independent OL.
    """
    if len(ol)!=5:raise ValueError('Exactly five identified OL required')
    if any(i not in initial or i not in current for i in ol):return None
    dx=[current[i][0]-initial[i][0] for i in ol]
    ys=[current[i][1] for i in ol];xs=[current[i][0] for i in ol]
    pairs=[math.dist(current[i],current[j]) for i,j in itertools.combinations(ol,2)]
    return {'mean_forward':sum(dx)/5,'max_retreat':max(0,-min(dx)),
        'deepest_los_depth':min(xs),'mean_abs_lateral':sum(abs(current[i][1]-initial[i][1]) for i in ol)/5,
        'lateral_span':max(ys)-min(ys),'minimum_pair_distance':min(pairs),'depth_span':max(xs)-min(xs),
        'retreated_over_1yd_count':sum(x < -1 for x in dx),'retreated_over_2yd_count':sum(x < -2 for x in dx)}
