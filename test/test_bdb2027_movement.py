"""Measurement checks for the NFL movement probe, not engine outcome tests."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np
import pandas as pd

spec=importlib.util.spec_from_file_location('movement',Path(__file__).parents[1]/'scripts/data/bdb2027_movement.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class MovementMeasurementTests(unittest.TestCase):
    def test_units_and_resampling_agree_at_10_and_20_hz(self):
        for dt in [.1,.05]:
            t=np.arange(0,2.01,dt)
            g=pd.DataFrame({'seconds':t,'x':3*t+20,'y':np.zeros(len(t))+26})
            r=m.motion(g)
            self.assertAlmostEqual(r['peakSpeed'],3,places=8)
            self.assertAlmostEqual(r['peakAccel'],0,places=8)
            self.assertAlmostEqual(r['peakBrake'],0,places=8)
            self.assertNotIn('turn',r)

    def test_athlete_weighting_does_not_turn_repeats_into_more_people(self):
        r={'peakSpeed':3,'peakAccel':1,'peakBrake':2,'peakLateral':1,'duration':2}
        fast={**r,'peakSpeed':9}
        summary=m.grouped_report([('OL','one',r)]*100+[('OL','two',fast)])['OL']
        self.assertEqual(summary['players'],2)
        self.assertEqual(summary['trajectories'],101)
        self.assertEqual(summary['playerMedianMetrics']['peakSpeed']['p50'],6)

    def test_accelerating_rep_has_no_braking_and_decelerating_rep_no_acceleration(self):
        t=np.arange(0,2.01,.1)
        for x,zero,positive in [(2*t+t*t,'peakBrake','peakAccel'),
                                (6*t-t*t,'peakAccel','peakBrake')]:
            r=m.motion(pd.DataFrame({'seconds':t,'x':x,'y':np.zeros(len(t))}))
            self.assertEqual(r[zero],0)
            self.assertAlmostEqual(r[positive],2,places=8)


if __name__=='__main__':unittest.main()
