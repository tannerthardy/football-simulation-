"""Measurement checks; no engine execution or provider data needed."""
import importlib.util
from pathlib import Path
import unittest

path=Path(__file__).resolve().parents[1]/'scripts/diag/zone/run_line_geometry.py'
spec=importlib.util.spec_from_file_location('line_geometry',path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class LineGeometryAudit(unittest.TestCase):
    def test_advance_can_hide_individual_retreat(self):
        a={i:(0,i*2) for i in range(5)};b={i:p for i,p in a.items()}
        b[0]=(-2,0);b[1]=(2,2)
        m=module.measure(a,b,list(a));self.assertEqual(m['mean_forward'],0)
        self.assertEqual(m['max_retreat'],2);self.assertEqual(m['retreated_over_1yd_count'],1)
    def test_los_depth_is_not_retreat(self):
        a={i:(-1,i*2) for i in range(5)};b={i:(-.5,i*2) for i in range(5)}
        m=module.measure(a,b,list(a));self.assertEqual(m['deepest_los_depth'],-.5)
        self.assertEqual(m['max_retreat'],0);self.assertEqual(m['mean_forward'],.5)
    def test_rotation_and_field_translation(self):
        a={i:(40+i*.2,20+i*2) for i in range(5)}
        expected=module.normalize(a,40,20,1)
        reflected={i:(120-x,53.333333333333336-y) for i,(x,y) in a.items()}
        self.assertEqual(module.normalize(reflected,80,33.333333333333336,-1),expected)
        translated={i:(x+10,y-7) for i,(x,y) in a.items()}
        self.assertEqual(module.normalize(translated,50,13,1),expected)
    def test_missing_tracking_is_unknown(self):
        a={i:(0,i) for i in range(5)}
        self.assertIsNone(module.measure(a,{0:(0,0)},list(a)))
    def test_lateral_flow_does_not_become_pushback(self):
        a={i:(0,i*2) for i in range(5)};b={i:(0,i*2+3) for i in range(5)}
        m=module.measure(a,b,list(a));self.assertEqual(m['mean_abs_lateral'],3)
        self.assertEqual(m['lateral_span'],8);self.assertEqual(m['max_retreat'],0)

if __name__=='__main__':unittest.main()
