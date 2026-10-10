# Runtime audit appendix

The prior validation snapshots under `out/constraint-work-validation` and `out/constraint-work-final-validation` were executed with the environment-default Node v24.19.0, not Node 22. Evidence: the final hand-convergence JSON records `node: v24.19.0`; those game invocations used `node` without an absolute-path override. Treat the old reports/manifests as Node 24 artifacts. The prior same-runtime comparison was not a Node 22 comparison.

This directory contains a fresh published-parent rerun with `/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node` for every Node invocation. Recorded runtime: v22.23.3, execPath exactly `/workspace/.cloud-tools/node-v22.23.3-linux-x64/bin/node`.
