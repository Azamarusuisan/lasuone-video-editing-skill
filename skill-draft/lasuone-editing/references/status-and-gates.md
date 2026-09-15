# Status and gates

Snapshot: 2026-09-15, source version `0.1-observed-samples`. State: `LEARNING_IN_PROGRESS_NOT_PRODUCTION_READY`.

Evidence currently means a 189-video public census (59 ordinary, 130 Shorts), 188 acquired research copies, ASR candidates for 188 videos, machine scene scans and overview captures for all 188 copies, partial observation of 147 videos, 126 whole-duration sparse reviews, zero videos certified as fully reviewed, and 114 subtitle-frame samples with repeated holds possible. Counts are from `evidence/COVERAGE.json` compiled at `2026-09-15T04:51:56.975Z`; that evidence file is not bundled. It does not mean 147 full videos, 188 verified transcripts, or 114 independent subtitle events. Four long Las Vegas compilations remain pending full-length review. Direct BGM/SE listening, calibrated subtitle/font/color measurements, cut/pause/reaction timing, and export settings remain incomplete. One age-gated video is unavailable; do not bypass access restrictions.

Separate auxiliary progress, intentionally excluded from the 126 completed sparse-review count: R9 has all 1,101 frames across 184 overview sheets reviewed on the nominal 15-second grid from 0 through 16,500 seconds (±7.5 seconds); the final approximately 22 seconds have no grid sample. rUZ has all 799 frames across 134 overview sheets reviewed from 0 through 11,970 seconds (±7.5 seconds); the final approximately 8.57 seconds have no grid sample. Z53 has all 1,059 frames across 177 overview sheets reviewed from 0 through 15,870 seconds (±7.5 seconds); the final approximately 12.81 seconds have no grid sample. N2 has all 713 frames across 119 overview sheets reviewed from 0 through 10,680 seconds (±7.5 seconds); the final approximately 19.73 seconds have no grid sample. None of these records is continuous viewing or direct audio review. Local continuous-interval evidence totals 24 intervals and 742 decoded frames, also without implying full-video review.

## Learning gate

All must be evidenced: all 189 videos reconciled and reviewed by confirmed intervals; four Vegas compilations fully reviewed and deduplicated; subtitle events distinguished from held frames; cuts, pauses, reactions, zooms, typography, color, BGM and SE measured; ASR checked for repetition and manually verified where facts matter; each rule stores reference, confidence, and counterexamples; formats remain separate.

## Future production gate

The learning gate must pass, and the actual job must include source inventory, a rights inventory for assets selected into the production, calibrated format reference, edit-decision manifest, production-approved selected assets, export specification, and runnable TECHNICAL/CONTENT/STYLE/LEGAL QC. An `UNKNOWN` research reference is not itself a blocker when it is not used in the production. Every selected asset must have production permission, and bundled assets additionally need redistribution permission. A completed render is required before any CHANNEL_MATCH evaluation, and a score is unavailable when its comparison criteria are unmeasured.

`scripts/validate_package.py` checks only this draft's structure and deliberately has no READY path: it always reports `production_ready=false`. A real readiness validator must be implemented only after source, selected-asset permission, render, and QC evidence formats exist.

The frozen learning files and their hashes/provenance are listed in [learning/manifest.json](learning/manifest.json). Research videos, raw audio, and frame images are not bundled; URL/video ID/timecode and any external evidence paths remain references, not packaged media.
