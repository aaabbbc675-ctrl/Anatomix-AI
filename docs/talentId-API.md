# مرجع API — موتور استعدادیابی (engine/talentId/)

امضای دقیق هر تابع export‌شده‌ی هر ۱۶ فایل + ماژول‌های `shared/` کلیدی.
موتور کاملاً pure است — بدون IO/side-effect، بدون API endpoint واقعی؛
«API» اینجا یعنی قرارداد فراخوانی بین فایل‌ها. توضیح روایی/معماری در
[`engine/talentId/README.md`](../engine/talentId/README.md).

قرارداد خطا: تمام خطاهای این موتور از `TalentIdError` (در
`shared/talentIdErrors.js`) با شکل `{name:'TalentIdError', code, message, context}`
هستند.

---

## file1_intakeInputs.js (Commit 2)

```js
normalizeIntake(rawDevice, rawCoach, rawChatbot) → NormalizedIntake
```
سه ورودی خام (بدون wrapper `{device_scan:{...}}` — فقط محتوای باز شده) →
یک `NormalizedIntake` استاندارد. `psych` همیشه `null` (وصل‌شدنش کار caller
است، رجوع کنید به `talentIdCascade.js`). throw می‌کند با کدهای:
`MISSING_DEVICE_DATA`, `MISSING_COACH_DATA`, `INVALID_HEIGHT`, `INVALID_WEIGHT`,
`INVALID_AGE`, `INVALID_BODY_FAT`, `INVALID_SEX`, `INVALID_DATE_OF_BIRTH`,
`INVALID_ASSESSMENT_DATE`, `MISSING_ARM_SPAN`.

توابع محاسباتی مستقل export‌شده (برای تست جدا):
`decimalAge(dob, assessmentDate)`, `bestOfThree(trials, higherIsBetter)`,
`computeAnthropometricRatios(anthropometrics, sex)`,
`normalizeComposition(bodyCompositionBia, standingHeightCm)`,
`estimateVO2max(beepLevel, chronoAge)`,
`computeHandgripAsymmetry(domMax, nondomMax)`,
`computeFrameSize(heightCm, wristCircumferenceCm, sex)`.

ثابت‌های اعتبارسنجی: `VALID_SEX`, `HEIGHT_MIN_CM/MAX_CM`, `WEIGHT_MIN_KG/MAX_KG`,
`AGE_MIN_YEARS/MAX_YEARS`, `BODY_FAT_MIN_PERCENT/MAX_PERCENT`.

## file2_maturityCalculator.js (Commit 3)

```js
calculateMaturityProfile({ chronological_age_decimal, biological_sex, standing_height_cm, sitting_height_cm, leg_length_cm, weight_kg }) → MaturityProfile
```
`MaturityProfile = { chronological_age, biological_age, maturity_offset, age_at_phv_predicted, phv_zone, maturity_type, formula_used, confidence, ci_bio_age_years, warnings }`.
`formula_used` یکی از `'mirwald'`/`'chronological_fallback'` (خارج از بازه‌ی
معتبر Mirwald). Khamis-Roche پیاده نشده (رجوع کنید به README).

توابع فرعی export‌شده: `selectMaturityFormula`, `mirwaldBoys`, `mirwaldGirls`,
`computeBioAge`, `determineMaturityType`, `computePhvZone`.
ثابت‌ها: `AGE_AT_PHV_AVERAGE`, `MIRWALD_VALID_RANGE`, `MO_OUTLIER_THRESHOLD_YEARS`,
`MATURITY_TYPE_THRESHOLD_YEARS`, `CI_BIO_AGE_MIRWALD`, `CI_BIO_AGE_FALLBACK`.

## file3_normativeDataLookup.js (Commit 4)

```js
lookupTier(testName, value, bioAge, sex) → { tier, higher_is_better, band_used, fallback_applied, out_of_range? }
lookupPercentile(testName, value, bioAge, sex) → number
```
throw می‌کند `NORMATIVE_MISSING` اگر نه بازه‌ی دقیق نه بازه‌ی مجاور داده
داشته باشند. ⚠️ [TODO-normative-data.md](TODO-normative-data.md).
همچنین export: `_selectBand(bioAge)`, `BAND_ORDER`.

## file4_bioScoreCalculator.js (Commit 5)

```js
calculateBioScores(sportRequirementMatrix, normalizedIntake) → { [sportId]: BioScoreResult }
computeBioScoreForSport(sportEntry, activeConditions, normalizedIntake) → BioScoreResult
computeActiveConditions(normalizedIntake) → { [conditionKey]: boolean }
```
`BioScoreResult = { base_score:100, total_bonus, total_penalty, final_bio_score, drivers[] }`،
`final_bio_score` کلمپ‌شده در `[0,200]`. throw می‌کند `BIO_SCORE_UNKNOWN_DRIVER_KEY`
اگر یک sportEntry از کلیدی استفاده کند که در `computeActiveConditions` تعریف
نشده. ثابت: `BODY_FAT_THRESHOLDS`.

## file5_posturalAdvisoryLayer.js (Commit 6)

```js
computePosturalAdjustments(posture, sportRequirementMatrix) → { adjustments_by_sport, active_postures }
severityMultiplier(severity) → 0.3 | 0.7 | 1.0
```
⚠️ `posture[type]` باید `{severity: 1|2|3, ...}` باشد (نه عدد خام — این
دقیقاً باگی بود که در Commit 22 در UI پیدا و رفع شد). throw می‌کند
`INVALID_SEVERITY` (خارج از ۱-۳) یا `POSTURAL_VETO_VIOLATION` (فقط اگر
یک باگ واقعی «هرگز veto» را نقض کند — نباید هرگز در production رخ دهد).

## file6_flexibilityROMAdjustments.js (Commit 7)

```js
computeRomAdjustments(rom, hypermobilityDetected, sportRequirementMatrix) → { adjustments_by_sport }
```
`rom[deficitType]` باید رشته باشد (`'normal'|'mild_short'|'moderate_short'|'severe_short'`)
— برخلاف `posture`، اینجا شکل خام رشته‌ای درست است. throw می‌کند
`ROM_VETO_VIOLATION` (safety net، نباید در production رخ دهد). ثابت:
`ROM_SEVERITY_TO_LEVEL`.

## file7_perfScoreCalculator.js (Commit 8)

```js
calculatePerfScores(sportRequirementMatrix, normalizedIntake, bioAge) → { [sportId]: PerfScoreResult }
computePerfScoreForSport(sportEntry, normalizedIntake, bioAge) → PerfScoreResult
```
`PerfScoreResult = { final_perf_score, drivers[], data_coverage:{evaluated_weight_sum, intended_weight_sum, skipped_tests[]} }`،
کلمپ‌شده در `[0,200]`. تست‌های بدون norm خودکار skip و renormalize می‌شوند
(⚠️ [TODO-normative-data.md](TODO-normative-data.md)). ثابت‌ها:
`TIER_TO_PERF_BONUS` (`elite_top_5:+25, excellent_top_20:+15, average_mid_60:0, poor_bottom_20:-15`)،
`CRITICAL_FAIL_MULTIPLIER=0.5`.

## file8_psychProfileExtractor.js (Commit 9)

```js
extractPsychProfile(chatConversation, { apiCaller } = {}) → Promise<PsychProfile>
defaultNeutralProfile() → PsychProfile  // همه‌ی traitها=3, extracted_confidence=0
```
`chatConversation=null` → `defaultNeutralProfile()` بدون نیاز به `apiCaller`.
در غیر این صورت `apiCaller` اجباری است، وگرنه throw `MISSING_API_CALLER`
(⚠️ [TODO-api-key-security.md](TODO-api-key-security.md) — این فایل هرگز
مستقیم fetch نمی‌زند). توابع pure کمکی: `buildSystemPrompt`, `buildToolSchema`,
`buildApiRequestPayload`, `parsePsychProfileFromApiResponse` (throw
`PSYCH_EXTRACTION_MALFORMED`).

## file9_psychMatchCalculator.js (Commit 9)

```js
calculatePsychScores(sportRequirementMatrix, psychProfile) → { [sportId]: { final_psych_score, drivers[] } }
computePsychMatch(userProfile, sportRequirements) → { psych_score, drivers[] }
applyInterestBonus(psychScore, explicitInterests, sportId) → { psych_score, driver }
```
بونوس علاقه‌مندی طبق `explicit_interests` رتبه‌بندی‌شده (رتبه۱=×۱.۱۰،
رتبه۲=×۱.۰۷، رتبه۳=×۱.۰۵)، کلمپ در ۱۰۰.

## file10_medicalConditionalGate.js (Commit 10)

```js
calculateMedicalHolds(sportRequirementMatrix, medical) → { [sportId]: MedicalHold }
computeMedicalHoldForSport(sportId, pathologyNames, clearanceData) → MedicalHold
```
`MedicalHold.status` یکی از `'clear'|'medical_hold'|'clearance_obtained'`.
`medical.physician_clearance` باید `{cleared_sports:[], date, notes}` باشد
(نه رشته‌ی وضعیت — این باگ در Commit 22 پیدا و رفع شد). ⚠️
[TODO-medical-coverage-gaps.md](TODO-medical-coverage-gaps.md).

## file11_bioBandingAdjuster.js (Commit 11)

```js
calculateBioBanding(sportRequirementMatrix, bioScores, perfScores, psychScores, maturityProfile) → { [sportId]: BioBandedEntry }
computeMaturityAdjustmentFactor(maturityType, isPowerSport) → 0.9 | 1.0 | 1.15
computeRaeAlert(birthMonthShamsi) → { alert, birth_month_shamsi, month_name_fa, narrative }
```
`BioBandedEntry = { adjusted_bio_score, adjusted_perf_score, adjusted_psych_score, maturity_adjustment_factor, drivers[] }`.
throw می‌کند `BIO_BANDING_UNKNOWN_MATURITY_TYPE`, `BIO_BANDING_INVALID_MONTH`.
`isPowerSport` از `shared/sportCategories.js` (⚠️
[TODO-power-sports-wave2.md](TODO-power-sports-wave2.md)).

## file12_scoreSynthesis.js (Commit 12)

```js
synthesizeScores(sportRequirementMatrix, bioBanded, medicalHolds, weights, ciInputs) → { [sportId]: SynthesizedScore }
synthesizeScoreForSport(bioBandedEntry, medicalStatus, weights, ciInputs, posturalPenaltySum=0, romPenaltySum=0) → SynthesizedScore
computeDynamicWeights(psychProfile, maturityProfile) → { bio, perf, psych }
computeCI(ciInputs) → number
classifyConfidenceTier(ci) → 'high'|'medium'|'low'
```
وزن‌های پیش‌فرض `40/40/20`؛ اگر `psychProfile` غایب یا `extracted_confidence<0.5`
→ `45/45/10`؛ اگر `maturityProfile.formula_used==='chronological_fallback'`
هم اضافه شود → `30/50/20` یا `35/55/10` (ترکیبی). `adjusted_bio_score`/
`adjusted_perf_score` قبل از وزن‌دهی بر ۲ تقسیم می‌شوند (`BIO_PERF_RESCALE_DIVISOR`).
⚠️ [TODO-ci-computation.md](TODO-ci-computation.md) — `ci` فعلاً همیشه `3`.

## file13_explainabilityEngine.js ★★★ (Commit 13)

```js
generateMatchReports(sportRequirementMatrix, sources) → { [sportId]: MatchReport }
generateMatchReport(sportId, sportEntry, ctx) → MatchReport
classifyTier(finalScore, medicalStatus) → 'A'|'B'|'C'|'M'
computeSensitivePeriodNotes(bioAge, sex) → LtadNote[]  // Commit 20
attachSensitivePeriodNotesToReports(reports, bioAge, sex) → { [sportId]: MatchReport }  // pure، بدون mutation
```
`sources` باید هم داده‌ی خام (`bioScores, perfScores, psychScores` — برای
driver narratives) هم `bioBanded` (برای محاسبه‌ی واقعی امتیاز) را داشته
باشد — حذف `bioBanded` یعنی throw، این دقیقاً باگی بود که در Commit 21
پیش از پیاده‌سازی UI کشف شد. `MatchReport` شامل `final_score, ci, final_tier,
score_breakdown, top_positive_drivers, top_negative_drivers,
primary_exclusion_cause, what_if_analysis, medical_hold, coach_narrative,
client_narrative, ltad_notes`. ثابت‌ها: `TIER_A_MIN=85`, `TIER_B_MIN=70`,
`WHATIF_MIN_GAIN_THRESHOLD=10`, `WHATIF_MAX_CORRECTIONS=5`.

## file14_talentTransferSuggester.js (Commit 14)

```js
suggestTalentTransfers(matchReports, sportRequirementMatrix) → TransferSuggestion[]
```
فقط برای رشته‌های `final_tier==='C'` با `what_if_analysis.estimated_tier_if_corrected==='A'`
که در `sportSimilarityGraph` یک هدف واقعاً `tier==='A'` و `final_score>=80`
دارند. ⚠️ [TODO-transfer-potential-formula.md](TODO-transfer-potential-formula.md).

## file15_tierClassifier.js (Commit 15)

```js
classifyTiers(matchReports) → { tier_A_golden, tier_B_development, tier_C_correctable, tier_C_low_potential, tier_M_medical_hold, hidden_from_default }
```
لایه‌ی نمایشی روی داشبورد، نه منبع حقیقت (منبع حقیقت `generateMatchReports`
است). سقف `TIER_A_MAX=3`, `TIER_B_MAX=5`, `TIER_C_CORRECTABLE_MAX=5` — مازاد
A/B کاملاً کنار گذاشته می‌شود (نه data loss، فقط بیرون از این خروجی). ⚠️
[TODO-tier-overflow-wave2.md](TODO-tier-overflow-wave2.md).

## file16_reportRenderer.js (Commit 16)

```js
renderCoachDashboard(matchReports, tierClassification, talentTransferSuggestions, maturityProfile, raeAlertResult, normalizedIntake, psychProfile, athleteName) → CoachDashboard
renderClientReport(matchReports, tierClassification, normalizedIntake, driversSummary, athleteName) → ClientReport
```
لایه‌ی نگاشت نهایی — `header, executive_summary, drivers_summary,
corrective_action_plan, radar_charts, talent_transfer_summary, tiers, metadata`.
ثابت: `ENGINE_VERSION`.

## shared/sportRequirementMatrix.js (Commit 1، ۱۷-۱۹)

```js
getSportEntry(sportId) → SportRequirementEntry  // throw می‌کند اگر رشته وجود نداشته باشد
sportRequirementMatrix  // آبجکت ثابت، ۵۲ رشته
```

## shared/sportRequirementSchema.js (Commit 1)

```js
validateSportEntry(entry) → void  // throw SPORT_ENTRY_* با جزئیات دقیق
```
`EMPTY_PERFORMANCE_WEIGHTS_ALLOWLIST` — فقط `chess` مجاز به
`performance_weights` خالی است.

## shared/sportSimilarityGraph.js (Commit 1، بازنویسی Commit 17)

```js
sportSimilarityGraph  // محاسبه‌شده از sportRequirementMatrix.similar_sports، نه دستی
_buildSportSimilarityGraph(sportRequirementMatrix) → graph  // برای تست مستقل
```

## shared/sportCategories.js (Commit 11، گسترش Commit 17)

```js
isPowerSport(sportId) → boolean
POWER_SPORTS  // Set، ۱۴ رشته — ⚠️ TODO-power-sports-wave2.md
```

## shared/sensitivePeriodsLTAD.js (Commit 20)

```js
sensitivePeriodsLTAD  // ۶ توانایی، هر کدام windows بر اساس sex/universal
```
مصرف‌کننده: `file13_explainabilityEngine.js` (`computeSensitivePeriodNotes`).
