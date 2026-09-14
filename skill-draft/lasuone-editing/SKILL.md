---
name: lasuone-editing
description: Plan and, only after explicit readiness gates pass, edit Lasuone channel videos using format-specific observed rules. Use for Lasuone long-form, Shorts, podcast, baccarat, poker, race, documentary, or serious-talk editing; the current draft supports planning and validation only.
---

# Lasuone Editing

This is an uninstalled, non-production draft. Start by running `python3 scripts/validate_package.py .`; it validates package structure but always reports `production_ready=false`. Do not edit, render, claim `CHANNEL_MATCH >= 90`, or call the JSON decision records renderable projects.

## Route

1. Classify the request as learning, planning, or production, then select exactly one primary format: long-form, Shorts, podcast, baccarat/poker tension, race, documentary, or serious talk. Do not average formats.
2. Read [references/status-and-gates.md](references/status-and-gates.md), then only the applicable section of [references/formats.md](references/formats.md). Load the relevant frozen DB/template from [references/learning/manifest.json](references/learning/manifest.json) when exact `REFERENCE_VIDEO`, timecode, style, or counterexample evidence is needed. Read [references/assets-and-rights.md](references/assets-and-rights.md) whenever an external, archived, generated, music, sound, font, logo, map, article, social, or reference asset is involved.
3. In learning/analysis, use Astra. In image generation, asset preparation, editing, insertion, and rendering, use Sol. Never ask Sol to turn `UNKNOWN` research media into production media.
4. For production, stop unless both learning and production gates in the status reference pass against real manifests. Current packaged state cannot pass them.

## Intended workflow after implementation

Receive source media and manifests → verify chronology, speakers, numbers, and rights → write per-utterance edit decisions → edit while preserving BET→WAIT→RESULT→REACTION → have Sol generate only requested/justified inserts from user-provided content or reference images → label and place them at an appropriate statement/explanation beat → render → run TECHNICAL, CONTENT, STYLE, and LEGAL QC.

Every generated insert must record `SOURCE`, `RIGHTS_STATUS: GENERATED`, `USAGE_REASON`, `GENERATED_ASSET`, prompt/reference provenance, destination timecode, and why that placement supports the edit. Keep channel footage and generated imagery on distinct labeled tracks and never present generated imagery as documentary evidence of a real person, place, match, or news event.

## Hard constraints

- Treat OCR/ASR as unverified for names, amounts, currencies, hands, and results. Keep BET, return, net profit, bankroll, cumulative result, person, and currency separate; never confuse poker chips/K notation with cash.
- Never fill `UNKNOWN` timing, font, color, BGM, SE, zoom, export, or safe-zone values with generic defaults. Fonts, BGM, SE, logos, maps, articles, and social content need production rights.
- Protect bystanders, minors, documents, contacts, plates, and screens across every frame and transition. Stop at credentials, payment, privacy, or account-security screens for user takeover.
- Do not publish or contact third parties without explicit authorization.

## Not implemented

There is no NLE/renderable template, media-ingest pipeline, generated-image pipeline, insertion engine, export preset, render verifier, calibrated CHANNEL_MATCH scorer, or completed full-channel learning corpus. Planning records are not executable projects.
