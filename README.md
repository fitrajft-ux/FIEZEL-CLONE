# FIEZEL CLONE

OWNER-directed recovery repository for the FIEZEL adaptive learning application.

Recovery baseline: `fitrajft-ux/FIEZEL-APPS@f2a161d3a3c00d27d191ac40cc047e9eba5aefe1`, independently byte-matched to the OWNER-supplied neural-voice-success snapshot.

This repository is intentionally isolated from production `FIEZEL-APPS`. The recovery build uses clone-specific CacheStorage/localStorage namespaces and explicitly bans the frozen-runtime/global-Proxy defect class that caused fatal m025-39 voice failures.

The bootstrap workflow reconstructs the exact known-good baseline, applies the audited recovery overlay, runs the full recovery test suite, materializes the recovered source into this repository, and then publishes the tested artifact to GitHub Pages when Pages is enabled for GitHub Actions.
