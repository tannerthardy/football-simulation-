"""Body rotation, travel-direction change and alignment, not capacity.

python3 -I scripts/data/yaw_speed_audit.py tracking_week_1.csv [more CSVs]
Shared operator: yaw_measurement.py. --players selects the roster; --cadence .1
is required only without a time column. Raw and sensitivity views are separate.
Historical filenames remain; previous unversioned reports keep their definitions.
Operator contract: docs/reviews/turning-measurements.md.
"""
from pathlib import Path
import runpy
import sys

if __name__ == '__main__':
    sys.exit(runpy.run_path(str(Path(__file__).with_name('yaw_measurement.py')))['nfl_main']('frequency'))
