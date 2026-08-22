# Tera AI Experience — Interview Story Bank

Updated: August 2026

This document is the source material for future mock-interview practice. Keep the public company story, personal contribution, and confidential implementation details separate.

## The company story

### One-sentence version

Tera AI was building a camera-first, software-defined navigation layer for mobile robots that need to operate when GPS, specialized sensors, reliable maps, or persistent communications are unavailable.

### 30-second interview version

> Tera was building a camera-first, software-defined navigation stack for mobile robots operating when GPS, specialized sensors, or reliable maps were unavailable. The near-term product focus was GPS-denied flight, while the longer-term thesis was a spatial foundation model that could be deployed across aerial, ground, and maritime platforms using their existing cameras and edge compute. My work sat in the learned-correspondence and flight-level reliability loop: I turned raw flight logs into training supervision, supported correspondence-based pose optimization, and traced pair-level model failures to downstream trajectory error.

### Why GPS-denied flight matters

- GPS can be jammed, spoofed, obstructed, or unavailable in contested environments, indoors, underground, in tunnels, and in urban canyons.
- Onboard visual navigation lets a vehicle continue operating without cloud access or continuous communications.
- A camera-first software layer can avoid adding costly, heavy, power-hungry specialized sensors to every vehicle.
- The same underlying spatial model can potentially transfer across vehicles and sensor modalities, shortening per-platform integration.
- GPS-denied flight is the immediate product wedge; the longer-term opportunity is a portable navigation and spatial-memory layer for moving robots.

### Public evidence versus long-term ambition

Public evidence is strongest for aerial visual localization, fixed-wing integration, and EO/LWIR generalization. Ground, on-road, maritime, persistent spatial memory, and multi-agent coordination are broader product directions. Do not describe the public demonstrations as proof of a complete end-to-end autonomy stack: localization is only one part of planning, control, obstacle avoidance, recovery, and safety certification.

Public sources:

- [Tera AI — Cross-domain autonomy through software](https://www.tera-ai.com/)
- [Delivering autonomy in days instead of months via software](https://www.tera-ai.com/blog/delivering-autonomy-in-days-instead-of-months-via-software)
- [Navigating in the dark: GPS-denied visual navigation on LWIR](https://www.tera-ai.com/blog/navigating-in-the-dark-gps-denied-visual-navigation-on-lwir)
- [Universal Navigation for Every Moving Robot](https://www.tera-ai.com/blog/universal-navigation-for-every-moving-robot)

Public company-level metrics that may be cited with attribution, but not claimed as personal results:

- One fixed-wing integration completed in under 40 engineering hours, compared with a stated traditional timeline of three to six months.
- Published deployment targets included 20 FPS, under 50 ms latency, and average position RMSE under 30 m above 150 ft AGL.
- The LWIR demonstration reported 15.13 m average positional error over three nighttime trajectories without GPS, LiDAR, or active sensing.

## My role

### Resume version

- Built a training-data pipeline for a proprietary GPS-denied visual-navigation system, converting 132 pilot-collected flights (~660K frames) with images, poses, and depth into paired samples and dense point correspondences for learned matching.
- Trained and evaluated a frame-to-frame correspondence model and integrated its predictions into pose optimization for aircraft localization, contributing to lower flight-level trajectory error after fine-tuning on internal data.
- Developed a flight-replay and failure-diagnosis workflow that traced pair-level matching behavior to downstream ATE, distilling ~2.6K high-value hard frames into actionable failure modes for targeted model iteration.
- Adapted and evaluated COLMAP, Depth Anything 3, MapAnything, and Gaussian Splatting to produce a high-fidelity 3D reconstruction from a challenging customer-provided ground-video sequence and deliver a visual demonstration to an aerospace partner.

### 60-second role summary

> I worked on the training and reliability loop for a proprietary GPS-denied flight-navigation system. First, I converted raw pilot-collected flight logs into model-ready data. The corpus contained 132 flights and roughly 660,000 frames, with an image, pose, and depth estimate per frame plus candidate frame pairs. I also prepared preprocessing that converted those inputs into dense point-correspondence supervision for a learned frame-to-frame matcher. The model's correspondences were then used by pose optimization. My second focus was diagnosing the gap between pair-level matching quality and flight-level ATE. I replayed recorded flights, isolated the small number of frames that actually changed or failed to improve the trajectory, and organized roughly 2,600 hard frames into concrete failure modes. That gave the team a compact set for targeted fine-tuning and, more importantly, a way to understand why apparently reasonable matches could still produce poor flight behavior.

## Technical walkthrough

### Training-data pipeline

Per-frame inputs:

- Image
- Camera pose
- Depth
- Candidate pair list

Preprocessing output:

- Paired frames
- Dense point-correspondence supervision
- Metadata needed for training and evaluation

Scale:

- 132 pilot-collected flights
- About 5,000 frames per flight on average
- About 660,000 frames in total

Why this was not “just data processing”:

> The model could not learn the required geometric relationship directly from unstructured flight logs. The pipeline defined how poses and depth were converted into dense correspondence supervision, which samples entered training, and how flight data remained reproducible across training and evaluation. That made it part of the learning system rather than a one-time file-conversion task.

### Correspondence and pose optimization

High-level explanation safe for interviews:

> The matcher estimated dense frame-to-frame correspondences. Those correspondences supplied geometric constraints to a downstream pose optimizer. I worked on preparing the supervision, training and evaluating the matcher, and analyzing when a locally plausible correspondence update helped or hurt the global flight trajectory.

Avoid claiming sole ownership of the entire navigation stack unless that becomes factually supportable.

### Flight-level diagnosis and hard-case mining

The diagnostic set contained about 2,600 selected frames. That is approximately 0.4% of the full 660,000-frame corpus. Its value came from selection density and failure coverage, not raw size.

Observed categories:

1. Applying the correspondence update increased pose error.
2. The update would have reduced pose error, but a threshold rejected it.
3. The optimized pose still had high residual error and contributed to cumulative drift.

Many failures were associated with temporal mismatch between the current camera observation and an outdated GLB/reference representation. Per flight, the distilled set commonly contained 5–70 frames, averaging about 20.

Good interview phrasing:

> This was not intended to be a standalone foundation-model dataset. It was a targeted regression and fine-tuning set mined from real failures. A few thousand causally relevant examples were more useful for this purpose than a much larger random sample dominated by easy frames.

### Customer ground-video reconstruction

> I evaluated and adapted COLMAP, Depth Anything 3, MapAnything, and Gaussian Splatting on a challenging customer-provided ground-video sequence. Because the material was internal and there was only one sequence, we evaluated the result primarily as a high-quality visual demonstration rather than reporting a broad quantitative benchmark.

Do not name the customer. Do not suggest that one sequence constitutes a benchmark dataset.

## Likely interview questions

### “What exactly did you own?”

> I owned the path from raw flight logs to model-ready correspondence supervision and a substantial part of the model-diagnosis loop. I prepared the image, pose, depth, and pair data; generated dense correspondence targets; trained and evaluated the matcher; replayed low-quality flights; and built the hard-case taxonomy that connected local matching behavior to downstream pose and ATE failures. I collaborated with the broader team on the optimizer and flight system rather than claiming ownership of the entire stack.

### “Why were 132 flights enough?”

> They were enough to build a meaningful internal fine-tuning and diagnostic corpus, but I would not call them exhaustive coverage of the operating domain. The corpus represented about 660,000 temporally structured frames, and each frame could generate multiple training pairs. The limiting factor was not simply frame count; it was diversity across geography, altitude, viewpoint, illumination, season, and failure conditions. I treated the dataset as a strong domain-specific corpus, not a universal navigation benchmark.

### “Isn’t 2,600 hard frames too small to be a dataset?”

> It would be small as a general pretraining dataset, but that was not its purpose. It was a curated hard-case and regression set extracted from 132 real flights. Each item represented a failure that materially affected pose optimization or flight trajectory. For targeted fine-tuning, threshold analysis, and regression testing, the concentration of informative examples mattered more than raw scale.

### “How much did ATE improve?”

> Fine-tuning on the internal flight data reduced flight-level ATE, but I no longer have a verified value that I can disclose. I therefore describe the direction of the improvement and explain the evaluation pipeline rather than inventing a percentage. The important engineering result was that we could connect pair-level behavior to flight-level trajectory outcomes and iterate on reproducible failures.

If the interviewer insists on a number:

> I do not want to give you a number I cannot verify. It was a measurable reduction on our internal evaluation, and the exact results were company-confidential.

### “What was the hardest technical problem?”

> A pair could look accurate under a local matching metric yet fail to improve the global trajectory. The downstream outcome depended on geometric conditioning, thresholding, the existing pose estimate, and mismatch between current imagery and the reference representation. The hard part was building a replay path that preserved those dependencies so we could identify whether a failure came from the matcher, the acceptance logic, or residual error after optimization.

### “What would you improve in the system?”

> I would make the evaluation explicitly hierarchical: correspondence quality, geometric conditioning, proposed pose delta, acceptance decision, local pose error, and flight-level ATE. I would also stratify results by reference age and scene-change severity. That would help distinguish model generalization failures from stale-map or policy-threshold failures.

### “Why did this work matter to the product?”

> A GPS-denied navigation product is judged at the flight level, not by an isolated matching metric. My work made real flight data trainable and made failure propagation observable. That shortened the loop from a bad flight to a reproducible case, a diagnosis, and a targeted model update.

## Accuracy and confidentiality guardrails

Safe to say publicly:

- Company name: Tera AI
- 132 internally collected flights and approximately 660K frames, unless the NDA specifically classifies dataset scale
- Approximately 2.6K selected hard frames, unless classified
- Images, poses, depth, pair lists, dense correspondence supervision
- Correspondence-based pose optimization
- ATE improved after internal fine-tuning, without an invented value
- The customer work involved an aerospace partner and a challenging ground-video sequence

Keep private or generalized:

- The proprietary core-project name
- The aerospace customer's identity
- Internal architecture details beyond the approved high-level pipeline
- Undisclosed ATE values, thresholds, benchmark tables, flight locations, and raw data
- “State of the art” unless tied to a named public benchmark with a published result

## Facts ledger

| Claim | Status | Interview use |
| --- | --- | --- |
| 132 flights | Internally remembered | Use if NDA permits |
| ~5K frames per flight | Approximate | Say “about” |
| ~660K total frames | Derived estimate | Say “roughly” |
| ~2.6K hard frames | Derived from ~20 per flight | Say “approximately” |
| Fine-tuning reduced ATE | Observed internally | No percentage |
| Result was SOTA | Not publicly verifiable | Do not claim |
| Customer reconstruction quality | Visual demonstration only | Do not imply quantitative benchmark |

## Future mock-interview tool seed

The future simulator should ask questions at four levels:

1. Recruiter: company story, personal scope, impact, reason for transition.
2. Hiring manager: ownership, collaboration, prioritization, reliability, and deployment relevance.
3. Researcher: correspondence supervision, geometry, pose optimization, ATE, data bias, and evaluation design.
4. Adversarial follow-up: exact ownership, missing metrics, dataset sufficiency, NDA boundaries, and failure cases.

Answers should be scored for factual grounding, specificity, technical depth, concise delivery, and whether the speaker separates personal results from company-level public claims.
